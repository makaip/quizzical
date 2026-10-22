"use client"

import { useSyncExternalStore } from "react"
import { embedCards } from "@/lib/embeddings"
import { removeSetFromFolders } from "@/lib/folders"
import { clearLearnState } from "@/lib/learn"
import { clearStars } from "@/lib/stars"
import { createId } from "@/lib/utils"

export type Card = {
  id: string
  term: string
  definition: string
}

export type StudySet = {
  id: string
  title: string
  description: string
  cards: Card[]
  createdAt: number
  updatedAt: number
}

export type StudySetInput = Pick<StudySet, "title" | "description" | "cards">

const STORAGE_KEY = "recall:sets:v1"

const listeners = new Set<() => void>()
let cache: StudySet[] | null = null

export { createId }

function isStudySet(value: unknown): value is StudySet {
  if (!value || typeof value !== "object") return false
  const set = value as Record<string, unknown>
  return (
    typeof set.id === "string" &&
    typeof set.title === "string" &&
    Array.isArray(set.cards)
  )
}

function load(): StudySet[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isStudySet) : []
  } catch {
    return []
  }
}

function save(next: StudySet[]) {
  cache = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be full or blocked (private mode). Keep the in-memory copy
    // so the session still works, and let the caller surface the failure.
    listeners.forEach((listener) => listener())
    throw new Error("Couldn't save to this browser's storage.")
  }
  listeners.forEach((listener) => listener())
}

function getSnapshot() {
  if (cache === null) cache = load()
  return cache
}

function getServerSnapshot() {
  return null
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  // Keep multiple open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    cache = null
    listener()
  }
  window.addEventListener("storage", onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** All sets, newest first. `null` until the client has read storage. */
export function useSets(): StudySet[] | null {
  return useSyncExternalStore<StudySet[] | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
}

/** `undefined` while loading, `null` if no set has this id. */
export function useSet(id: string): StudySet | null | undefined {
  const sets = useSets()
  if (sets === null) return undefined
  return sets.find((set) => set.id === id) ?? null
}

export function createSet(input: StudySetInput): StudySet {
  const now = Date.now()
  const set: StudySet = { ...input, id: createId(), createdAt: now, updatedAt: now }
  save([set, ...getSnapshot()])
  embedCards(set.cards)
  return set
}

export function updateSet(id: string, input: StudySetInput) {
  save(
    getSnapshot().map((set) =>
      set.id === id ? { ...set, ...input, updatedAt: Date.now() } : set
    )
  )
  embedCards(input.cards)
}

export function deleteSet(id: string) {
  save(getSnapshot().filter((set) => set.id !== id))
  // Stars, Learn progress and folder membership are only extras, so failing to clear them is fine.
  try {
    clearStars(id)
    clearLearnState(id)
    removeSetFromFolders(id)
  } catch {}
}
