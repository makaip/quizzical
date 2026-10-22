"use client"

import { useParams } from "next/navigation"
import { FolderNotFound } from "@/components/folder-not-found"
import { Learn, LearnSkeleton } from "@/components/learn"
import { useFolderDeck } from "@/lib/folder-deck"
import { useStarredIn } from "@/lib/stars"

export function FolderLearn() {
  const { id } = useParams<{ id: string }>()
  const deck = useFolderDeck(id)
  const starred = useStarredIn(deck ? deck.folder.setIds : [])

  if (deck === undefined || starred === null) return <LearnSkeleton />
  if (deck === null) return <FolderNotFound />

  return (
    <Learn
      learnId={deck.folder.id}
      title={deck.folder.name}
      backHref={`/folders/${deck.folder.id}`}
      cards={deck.cards}
      deckKey={deck.deckKey}
      starred={starred}
      starSetId={deck.setIdOf}
    />
  )
}
