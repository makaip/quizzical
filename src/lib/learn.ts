"use client"

import { embeddingFor, similarity } from "@/lib/embeddings"
import { createLocalStore, parseRecord } from "@/lib/local-store"
import type { Card } from "@/lib/sets"

export type Side = "term" | "definition"
export type QuestionType = "choice" | "written"

export type LearnSettings = {
  /** How many terms are studied together in one round. */
  roundSize: number
  choice: boolean
  written: boolean
  /** The side you answer with; the other side is the prompt. */
  answerWith: Side
  starredOnly: boolean
}

/**
 * How well a card is known. Level 0 hasn't been answered right yet, 1 has been
 * answered right once (familiar), 2 is mastered. A card only moves up a level
 * when it's answered right the first time it's asked in a round.
 */
export type CardProgress = { level: number; misses: number }

export type LearnState = {
  settings: LearnSettings
  progress: Record<string, CardProgress>
  /** Rounds finished so far. */
  rounds: number
}

export type CardStatus = "new" | "learning" | "mastered"

export const MASTERED = 2
export const ROUND_SIZE_MIN = 3
export const ROUND_SIZE_MAX = 30

export const DEFAULT_SETTINGS: LearnSettings = {
  roundSize: 7,
  choice: true,
  written: true,
  answerWith: "term",
  starredOnly: false,
}

function isLearnState(value: unknown): value is LearnState {
  if (!value || typeof value !== "object") return false
  const state = value as Record<string, unknown>
  return (
    typeof state.settings === "object" &&
    state.settings !== null &&
    typeof state.progress === "object" &&
    state.progress !== null
  )
}

// Learn progress and settings, by set id.
const store = createLocalStore("recall:learn:v1", parseRecord(isLearnState))

function emptyState(): LearnState {
  return { settings: DEFAULT_SETTINGS, progress: {}, rounds: 0 }
}

/** `null` until the client has read storage. */
export function useLearnState(setId: string): LearnState | null {
  const all = store.useValue()
  if (!all) return null
  const state = all[setId]
  if (!state) return emptyState()
  // Fill in settings added after this state was saved.
  return { ...state, settings: { ...DEFAULT_SETTINGS, ...state.settings } }
}

export function updateLearnState(setId: string, update: (state: LearnState) => LearnState) {
  const all = store.get()
  const current = all[setId] ?? emptyState()
  store.set({
    ...all,
    [setId]: update({ ...current, settings: { ...DEFAULT_SETTINGS, ...current.settings } }),
  })
}

export function resetLearnProgress(setId: string) {
  updateLearnState(setId, (state) => ({ ...state, progress: {}, rounds: 0 }))
}

export function clearLearnState(setId: string) {
  const all = store.get()
  if (!(setId in all)) return
  store.set(Object.fromEntries(Object.entries(all).filter(([id]) => id !== setId)))
}

export function cardStatus(progress: CardProgress | undefined): CardStatus {
  if (!progress) return "new"
  return progress.level >= MASTERED ? "mastered" : "learning"
}

/**
 * Multiple choice first, then written once a card is familiar. With only one
 * type turned on, every question is that type.
 */
export function questionTypeFor(level: number, settings: LearnSettings): QuestionType {
  if (!settings.written) return "choice"
  if (!settings.choice) return "written"
  return level === 0 ? "choice" : "written"
}

export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * The cards for the next round: terms you're already learning come first
 * (most-missed first), then new terms fill the remaining spots, so only a few
 * new terms are introduced at a time.
 */
export function pickRound(
  cards: Card[],
  progress: Record<string, CardProgress>,
  size: number
): Card[] {
  const learning = cards
    .filter((card) => cardStatus(progress[card.id]) === "learning")
    .sort((a, b) => progress[b.id].misses - progress[a.id].misses)
  const fresh = cards.filter((card) => cardStatus(progress[card.id]) === "new")
  return shuffled([...learning, ...fresh].slice(0, size))
}

export type Question = {
  /** Unique per time a card is asked, so the UI resets between questions. */
  key: string
  card: Card
  type: QuestionType
  answer: string
  /** Multiple-choice options, one of which is `answer`. */
  options: string[]
}

let questionCount = 0

const CHOICES = 3
// Above this, an option probably means the same thing as the answer.
const TOO_SIMILAR = 0.85
// How strongly close options are preferred. Lower is pickier, higher is closer to random.
const TEMPERATURE = 0.1
// How much a similar prompt counts next to a similar answer.
const PROMPT_WEIGHT = 0.3

export function makeQuestion(
  card: Card,
  type: QuestionType,
  answerWith: Side,
  allCards: Card[]
): Question {
  const answer = card[answerWith]
  const options = type === "choice" ? shuffled([answer, ...pickWrong(card, answerWith, allCards)]) : []
  return { key: `q${questionCount++}`, card, type, answer, options }
}

/**
 * Wrong options, favoring answers that are close in meaning to the right one
 * (or whose prompts are close to this card's prompt), with some randomness so
 * the same card doesn't always get the same options. Random when embeddings
 * haven't been computed yet.
 */
function pickWrong(card: Card, answerWith: Side, allCards: Card[]) {
  const promptSide: Side = answerWith === "term" ? "definition" : "term"
  const answerVector = embeddingFor(card[answerWith])
  const promptVector = embeddingFor(card[promptSide])

  // Skip cards with the same answer, and cards with the same prompt: their
  // answer would also be right.
  const seen = new Set([normalize(card[answerWith])])
  const samePrompt = normalize(card[promptSide])
  const candidates: { text: string; weight: number }[] = []
  for (const other of shuffled(allCards)) {
    const text = other[answerWith]
    const normalized = normalize(text)
    if (seen.has(normalized) || normalize(other[promptSide]) === samePrompt) continue
    seen.add(normalized)

    let score = 0
    const otherAnswer = answerVector && embeddingFor(text)
    if (answerVector && otherAnswer) {
      const answerScore = similarity(answerVector, otherAnswer)
      if (answerScore > TOO_SIMILAR) continue
      score += (1 - PROMPT_WEIGHT) * answerScore
    }
    const otherPrompt = promptVector && embeddingFor(other[promptSide])
    if (promptVector && otherPrompt) score += PROMPT_WEIGHT * similarity(promptVector, otherPrompt)
    candidates.push({ text, weight: Math.exp(score / TEMPERATURE) })
  }

  const wrong: string[] = []
  while (wrong.length < CHOICES && candidates.length > 0) {
    let roll = Math.random() * candidates.reduce((sum, c) => sum + c.weight, 0)
    let index = candidates.findIndex((c) => (roll -= c.weight) <= 0)
    if (index === -1) index = candidates.length - 1
    wrong.push(candidates.splice(index, 1)[0].text)
  }
  return wrong
}

/** Lowercase, collapse spaces, and ignore most punctuation and Markdown marks. */
function normalize(text: string) {
  const plain = text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()
  const loose = plain
    .replace(/[^\p{L}\p{N}\s+\-=<>^%/]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
  // Answers made only of symbols still need to match on something.
  return loose || plain
}

export function isCorrectWritten(given: string, answer: string) {
  return given.trim() !== "" && normalize(given) === normalize(answer)
}
