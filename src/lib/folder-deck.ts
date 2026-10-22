"use client"

import { useMemo } from "react"
import { useFolder, type Folder } from "@/lib/folders"
import { useSets, type Card, type StudySet } from "@/lib/sets"

export type FolderDeck = {
  folder: Folder
  /** The folder's sets that still exist, in folder order. */
  sets: StudySet[]
  /** Every card from those sets. */
  cards: Card[]
  /** The set each card came from. */
  setIdOf: (cardId: string) => string
  /** Changes whenever the folder or any of its sets is edited. */
  deckKey: string
}

/** `undefined` while loading, `null` if no folder has this id. */
export function useFolderDeck(id: string): FolderDeck | null | undefined {
  const folder = useFolder(id)
  const allSets = useSets()

  return useMemo(() => {
    if (folder === undefined || allSets === null) return undefined
    if (folder === null) return null
    const sets = folder.setIds.flatMap((setId) => allSets.find((set) => set.id === setId) ?? [])
    const owner = new Map<string, string>()
    for (const set of sets) for (const card of set.cards) owner.set(card.id, set.id)
    return {
      folder,
      sets,
      cards: sets.flatMap((set) => set.cards),
      setIdOf: (cardId: string) => owner.get(cardId) ?? "",
      deckKey: [folder.updatedAt, ...sets.map((set) => set.updatedAt)].join("-"),
    }
  }, [folder, allSets])
}
