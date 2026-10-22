"use client"

import { useMemo } from "react"
import { createLocalStore, parseRecord } from "@/lib/local-store"

// Starred card ids, by set id.
const store = createLocalStore(
  "recall:stars:v1",
  parseRecord((value): value is string[] => Array.isArray(value))
)

/** Ids of the starred cards in a set. `null` until the client has read storage. */
export function useStarred(setId: string): Set<string> | null {
  const stars = store.useValue()
  const ids = stars?.[setId]
  return useMemo(() => (stars ? new Set(ids) : null), [stars, ids])
}

/** Ids of the starred cards across several sets. */
export function useStarredIn(setIds: string[]): Set<string> | null {
  const stars = store.useValue()
  const key = setIds.join(",")
  return useMemo(
    () => (stars ? new Set(key.split(",").flatMap((id) => stars[id] ?? [])) : null),
    [stars, key]
  )
}

export function setStarred(setId: string, cardId: string, starred: boolean) {
  const stars = store.get()
  const ids = (stars[setId] ?? []).filter((id) => id !== cardId)
  store.set({ ...stars, [setId]: starred ? [...ids, cardId] : ids })
}

export function clearStars(setId: string) {
  const stars = store.get()
  if (!(setId in stars)) return
  store.set(Object.fromEntries(Object.entries(stars).filter(([id]) => id !== setId)))
}
