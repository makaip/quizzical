"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { CheckIcon, PartyPopperIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { RichText } from "@/components/rich-text"
import { StarButton } from "@/components/star-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MASTERED,
  cardStatus,
  isCorrectWritten,
  makeQuestion,
  pickRound,
  questionTypeFor,
  updateLearnState,
  type CardProgress,
  type LearnSettings,
  type Question,
  type Side,
} from "@/lib/learn"
import type { Card } from "@/lib/sets"
import { cn, isTypingTarget } from "@/lib/utils"

type Round = {
  cards: Card[]
  /** Questions left this round; the first is the one being asked. */
  queue: Question[]
  /** Cards answered wrong this round. They don't level up when retried. */
  missed: string[]
  /** Questions answered right this round. */
  done: number
}

type Feedback = { correct: boolean; given: string }

const PRAISE = ["Nice work!", "You're on a roll!", "Great job!", "Correct!", "Awesome!"]
// Missed cards come back after this many other questions.
const RETRY_GAP = 3
const ADVANCE_AFTER_MS = 1000

function saveProgress(learnId: string, cardId: string, update: (progress: CardProgress) => CardProgress) {
  try {
    updateLearnState(learnId, (state) => ({
      ...state,
      progress: {
        ...state.progress,
        [cardId]: update(state.progress[cardId] ?? { level: 0, misses: 0 }),
      },
    }))
  } catch (error) {
    toast.error((error as Error).message, { id: "learn-save" })
  }
}

export function LearnSession({
  learnId,
  starSetId,
  backHref,
  cards,
  allCards,
  settings,
  progress,
  rounds,
  starred,
  onRestart,
}: {
  /** Where progress is saved: a set or folder id. */
  learnId: string
  /** The set a card belongs to, for starring it. */
  starSetId: (cardId: string) => string
  backHref: string
  /** The cards being learned. */
  cards: Card[]
  /** Every card in the set, for multiple-choice options. */
  allCards: Card[]
  settings: LearnSettings
  progress: Record<string, CardProgress>
  rounds: number
  starred: Set<string>
  onRestart: () => void
}) {
  const startRound = useCallback((): Round | null => {
    const picked = pickRound(cards, progress, settings.roundSize)
    if (picked.length === 0) return null
    return {
      cards: picked,
      queue: picked.map((card) =>
        makeQuestion(
          card,
          questionTypeFor(progress[card.id]?.level ?? 0, settings),
          settings.answerWith,
          allCards
        )
      ),
      missed: [],
      done: 0,
    }
  }, [allCards, cards, progress, settings])

  const [round, setRound] = useState(startRound)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [praise, setPraise] = useState(PRAISE[0])

  const question = round?.queue[0] ?? null

  function answer(given: string) {
    if (!question || feedback) return
    const correct =
      question.type === "choice"
        ? given === question.answer
        : isCorrectWritten(given, question.answer)
    setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)])
    setFeedback({ correct, given })
  }

  const next = useCallback(
    (correct: boolean) => {
      if (!round || !question) return
      const { card } = question
      const rest = round.queue.slice(1)
      let updated: Round
      if (correct) {
        if (!round.missed.includes(card.id)) {
          saveProgress(learnId, card.id, (p) => ({ ...p, level: Math.min(p.level + 1, MASTERED) }))
        }
        updated = { ...round, queue: rest, done: round.done + 1 }
      } else {
        saveProgress(learnId, card.id, (p) => ({ ...p, misses: p.misses + 1 }))
        const retry = makeQuestion(card, question.type, settings.answerWith, allCards)
        const at = Math.min(rest.length, RETRY_GAP)
        updated = {
          ...round,
          queue: [...rest.slice(0, at), retry, ...rest.slice(at)],
          missed: round.missed.includes(card.id) ? round.missed : [...round.missed, card.id],
        }
      }
      if (updated.queue.length === 0) {
        try {
          updateLearnState(learnId, (state) => ({ ...state, rounds: state.rounds + 1 }))
        } catch {}
      }
      setRound(updated)
      setFeedback(null)
    },
    [allCards, learnId, question, round, settings.answerWith]
  )

  // Right answers move on by themselves.
  useEffect(() => {
    if (!feedback?.correct) return
    const timer = setTimeout(() => next(true), ADVANCE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [feedback, next])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (feedback) {
        // Any key continues, except on a focused button, which handles its own keys.
        if (event.key === "Tab" || (event.target as HTMLElement).closest?.("button")) return
        event.preventDefault()
        next(feedback.correct)
        return
      }
      if (question?.type === "choice") {
        const index = Number(event.key) - 1
        if (index >= 0 && index < question.options.length) {
          event.preventDefault()
          answer(question.options[index])
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  if (!round) {
    return <AllMastered total={cards.length} backHref={backHref} onRestart={onRestart} />
  }

  if (!question) {
    return (
      <RoundSummary
        round={round}
        number={rounds}
        cards={cards}
        progress={progress}
        onContinue={() => setRound(startRound())}
      />
    )
  }

  const promptSide: Side = settings.answerWith === "term" ? "definition" : "term"
  const retrying = round.missed.includes(question.card.id)

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tabular-nums text-success">{round.done}</span>
        <div
          role="progressbar"
          aria-label="Round progress"
          aria-valuemin={0}
          aria-valuemax={round.cards.length}
          aria-valuenow={round.done}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${(round.done / round.cards.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold tabular-nums text-muted-foreground">
          {round.cards.length}
        </span>
      </div>

      <div className="mt-6 rounded-2xl bg-card px-5 py-6 shadow-[0_0.25rem_1rem_0_var(--shadow-color)] sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground capitalize">
              {promptSide}
            </span>
            {retrying && (
              <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                Let&apos;s try again
              </span>
            )}
          </div>
          <StarButton
            setId={starSetId(question.card.id)}
            cardId={question.card.id}
            starred={starred.has(question.card.id)}
            className="-my-2 -mr-2"
          />
        </div>

        <div className="flex min-h-28 items-center py-4">
          <CardText
            side={promptSide}
            text={question.card[promptSide]}
            className="text-xl sm:text-2xl"
          />
        </div>

        {question.type === "choice" ? (
          <ChoiceQuestion
            key={question.key}
            question={question}
            side={settings.answerWith}
            feedback={feedback}
            praise={praise}
            onAnswer={answer}
          />
        ) : (
          <WrittenQuestion
            key={question.key}
            question={question}
            side={settings.answerWith}
            feedback={feedback}
            praise={praise}
            onAnswer={answer}
          />
        )}

        {feedback && !feedback.correct && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t pt-5">
            <span className="mr-auto hidden text-sm text-muted-foreground sm:inline">
              Press any key to continue
            </span>
            {question.type === "written" && feedback.given.trim() && (
              <Button variant="ghost" onClick={() => next(true)}>
                Override: I was right
              </Button>
            )}
            <Button size="lg" onClick={() => next(false)}>
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function CardText({ side, text, className }: { side: Side; text: string; className?: string }) {
  return side === "definition" ? (
    <RichText text={text} className={cn("min-w-0", className)} />
  ) : (
    <p className={cn("min-w-0 whitespace-pre-wrap break-words", className)}>{text}</p>
  )
}

function FeedbackHeading({ feedback, praise, fallback }: { feedback: Feedback | null; praise: string; fallback: string }) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "text-sm font-semibold",
        !feedback && "text-muted-foreground",
        feedback?.correct && "text-success",
        feedback && !feedback.correct && "text-destructive"
      )}
    >
      {!feedback ? fallback : feedback.correct ? praise : "Not quite, you're still learning!"}
    </p>
  )
}

function ChoiceQuestion({
  question,
  side,
  feedback,
  praise,
  onAnswer,
}: {
  question: Question
  side: Side
  feedback: Feedback | null
  praise: string
  onAnswer: (given: string) => void
}) {
  return (
    <>
      <FeedbackHeading feedback={feedback} praise={praise} fallback={`Choose the matching ${side}`} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {question.options.map((option, i) => {
          const isAnswer = option === question.answer
          const isChosen = option === feedback?.given
          const state = !feedback
            ? "idle"
            : isAnswer
              ? "right"
              : isChosen
                ? "wrong"
                : "faded"
          return (
            // Not a <button>: options can hold rendered Markdown with block elements.
            <div
              key={option}
              role="button"
              tabIndex={feedback ? -1 : 0}
              aria-disabled={feedback !== null}
              onClick={() => onAnswer(option)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                  event.preventDefault()
                  // Keep this key press from also reaching the "any key continues" listener.
                  event.stopPropagation()
                  onAnswer(option)
                }
              }}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-lg border-2 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                state === "idle" && "border-border hover:border-primary-border",
                state === "right" && "border-success bg-success/10",
                state === "wrong" && "border-destructive bg-destructive/10",
                state === "faded" && "border-border opacity-50",
                feedback && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  state === "right"
                    ? "bg-success text-white"
                    : state === "wrong"
                      ? "bg-destructive text-white"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {state === "right" ? (
                  <CheckIcon className="size-3.5" strokeWidth={3} />
                ) : state === "wrong" ? (
                  <XIcon className="size-3.5" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <CardText side={side} text={option} />
            </div>
          )
        })}
      </div>
    </>
  )
}

function WrittenQuestion({
  question,
  side,
  feedback,
  praise,
  onAnswer,
}: {
  question: Question
  side: Side
  feedback: Feedback | null
  praise: string
  onAnswer: (given: string) => void
}) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  if (feedback) {
    return (
      <>
        <FeedbackHeading feedback={feedback} praise={praise} fallback="" />
        {feedback.correct ? (
          <AnswerBox tone="right" label="Your answer" side={side} text={feedback.given} />
        ) : (
          <>
            {feedback.given.trim() ? (
              <AnswerBox tone="wrong" label="Your answer" side={side} text={feedback.given} plain />
            ) : (
              <p className="mt-4 rounded-lg border-2 border-dashed px-4 py-3 text-muted-foreground">
                Skipped
              </p>
            )}
            <AnswerBox tone="right" label="Correct answer" side={side} text={question.answer} />
          </>
        )}
      </>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim()) onAnswer(value)
      }}
    >
      <label htmlFor={question.key} className="text-sm font-semibold text-muted-foreground">
        Your answer
      </label>
      <Input
        ref={inputRef}
        id={question.key}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`Type the ${side}`}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="mt-3 h-12 border-2 bg-muted/40 px-4 text-base md:text-base"
      />
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => onAnswer("")}>
          Don&apos;t know?
        </Button>
        <Button type="submit" size="lg" disabled={!value.trim()}>
          Answer
        </Button>
      </div>
    </form>
  )
}

function AnswerBox({
  tone,
  label,
  side,
  text,
  plain,
}: {
  tone: "right" | "wrong"
  label: string
  side: Side
  text: string
  /** Show exactly what was typed, without rendering Markdown. */
  plain?: boolean
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div
        className={cn(
          "mt-1.5 flex items-center gap-3 rounded-lg border-2 px-4 py-3",
          tone === "right" ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
        )}
      >
        {tone === "right" ? (
          <CheckIcon className="size-4 shrink-0 text-success" strokeWidth={3} />
        ) : (
          <XIcon className="size-4 shrink-0 text-destructive" strokeWidth={3} />
        )}
        <CardText side={plain ? "term" : side} text={text} />
      </div>
    </div>
  )
}

function ProgressCounts({ cards, progress }: { cards: Card[]; progress: Record<string, CardProgress> }) {
  const counts = { mastered: 0, learning: 0, new: 0 }
  for (const card of cards) counts[cardStatus(progress[card.id])]++
  const rows = [
    { label: "Mastered", count: counts.mastered, color: "bg-success" },
    { label: "Learning", count: counts.learning, color: "bg-highlight" },
    { label: "Not studied", count: counts.new, color: "bg-border" },
  ]
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn("h-full transition-[width] duration-500", row.color)}
            style={{ width: `${(row.count / cards.length) * 100}%` }}
          />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className={cn("size-2.5 rounded-full", row.color)} />
              {row.label}
            </dt>
            <dd className="mt-0.5 text-2xl font-bold tabular-nums">{row.count}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function RoundSummary({
  round,
  number,
  cards,
  progress,
  onContinue,
}: {
  round: Round
  number: number
  cards: Card[]
  progress: Record<string, CardProgress>
  onContinue: () => void
}) {
  return (
    <div className="rounded-2xl bg-card px-5 py-6 shadow-[0_0.25rem_1rem_0_var(--shadow-color)] sm:px-8 sm:py-8">
      <h2 className="text-2xl font-bold">You&apos;re doing great!</h2>
      <p className="mt-1 text-muted-foreground">
        Round {number} done. Keep going to master the rest.
      </p>

      <div className="mt-6">
        <ProgressCounts cards={cards} progress={progress} />
      </div>

      <h3 className="mt-8 text-sm font-semibold text-muted-foreground">
        Terms studied this round
      </h3>
      <ul className="mt-3 divide-y rounded-lg border-2">
        {round.cards.map((card) => {
          const status = cardStatus(progress[card.id])
          return (
            <li key={card.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-center sm:gap-4">
              <p className="font-semibold whitespace-pre-wrap break-words">{card.term}</p>
              <RichText text={card.definition} className="min-w-0 text-secondary-foreground" />
              <span
                className={cn(
                  "w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  status === "mastered" ? "bg-success/15 text-success-foreground" : "bg-warning-soft text-warning-foreground"
                )}
              >
                {status === "mastered" ? "Mastered" : round.missed.includes(card.id) ? "Missed" : "Familiar"}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-8 flex justify-end">
        <Button size="lg" onClick={onContinue} autoFocus>
          Continue to round {number + 1}
        </Button>
      </div>
    </div>
  )
}

function AllMastered({
  total,
  backHref,
  onRestart,
}: {
  total: number
  backHref: string
  onRestart: () => void
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card px-6 py-12 text-center shadow-[0_0.25rem_1rem_0_var(--shadow-color)]">
      <PartyPopperIcon className="size-12 text-primary" />
      <h2 className="mt-4 text-2xl font-bold">You&apos;ve mastered every term!</h2>
      <p className="mt-2 text-muted-foreground">
        All {total} {total === 1 ? "term is" : "terms are"} mastered. Nice work.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline" size="lg" className="border-2 bg-card">
          <Link href={backHref}>Done</Link>
        </Button>
        <Button size="lg" onClick={onRestart}>
          <RotateCcwIcon data-icon="inline-start" />
          Restart Learn
        </Button>
      </div>
    </div>
  )
}
