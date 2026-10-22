"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeftIcon } from "lucide-react"
import { Flashcards } from "@/components/flashcards"
import { FolderNotFound } from "@/components/folder-not-found"
import { Skeleton } from "@/components/ui/skeleton"
import { useFolderDeck } from "@/lib/folder-deck"
import { useStarredIn } from "@/lib/stars"

export function FolderFlashcards() {
  const { id } = useParams<{ id: string }>()
  const deck = useFolderDeck(id)
  const starred = useStarredIn(deck ? deck.folder.setIds : [])
  // Ids starred when "study starred only" was turned on (see the set page).
  const [starredDeck, setStarredDeck] = useState<string[] | null>(null)

  if (deck === undefined || starred === null) return <FolderFlashcardsSkeleton />
  if (deck === null) return <FolderNotFound />

  const cards = starredDeck
    ? deck.cards.filter((card) => starredDeck.includes(card.id))
    : deck.cards

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <title>{`Flashcards: ${deck.folder.name} | Quizzical`}</title>
      <Link
        href={`/folders/${deck.folder.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {deck.folder.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Flashcards</h1>
      <p className="mt-1 text-muted-foreground">
        {deck.cards.length} {deck.cards.length === 1 ? "term" : "terms"} from{" "}
        {deck.sets.length} {deck.sets.length === 1 ? "set" : "sets"}
      </p>

      <section className="mt-8" aria-label="Flashcards">
        <Flashcards
          key={`${deck.deckKey}-${starredDeck ? "starred" : "all"}`}
          starSetId={deck.setIdOf}
          cards={cards}
          starred={starred}
          starredOnly={starredDeck !== null}
          onStarredOnlyChange={(value) => setStarredDeck(value ? [...starred] : null)}
        />
      </section>
    </div>
  )
}

export function FolderFlashcardsSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-72 bg-card" />
      <Skeleton className="h-[clamp(18rem,52vh,26rem)] bg-card" />
    </div>
  )
}
