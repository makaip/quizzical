"use client"

import { useParams } from "next/navigation"
import { Learn, LearnSkeleton } from "@/components/learn"
import { SetNotFound } from "@/components/set-not-found"
import { useSet } from "@/lib/sets"
import { useStarred } from "@/lib/stars"

export function LearnView() {
  const { id } = useParams<{ id: string }>()
  const set = useSet(id)
  const starred = useStarred(id)

  if (set === undefined || starred === null) return <LearnSkeleton />
  if (set === null) return <SetNotFound />

  return (
    <Learn
      learnId={set.id}
      title={set.title}
      backHref={`/sets/${set.id}`}
      cards={set.cards}
      deckKey={String(set.updatedAt)}
      starred={starred}
      starSetId={() => set.id}
    />
  )
}
