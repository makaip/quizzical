"use client"

import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { SetForm } from "@/components/set-form"
import { SetNotFound } from "@/components/set-not-found"
import { Skeleton } from "@/components/ui/skeleton"
import { updateSet, useSet } from "@/lib/sets"

export function EditSet() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const set = useSet(id)

  if (set === undefined) {
    return <EditSetSkeleton />
  }
  if (set === null) return <SetNotFound />

  return (
    <>
      <title>{`Edit ${set.title} | Quizzical`}</title>
      <SetForm
        // Remount after a save so the form reflects what was stored.
        key={`${set.id}-${set.updatedAt}`}
        heading="Edit set"
        submitLabel="Done"
        initial={set}
        onSubmit={(input) => {
          try {
            updateSet(set.id, input)
            router.push(`/sets/${set.id}`)
          } catch (error) {
            toast.error((error as Error).message)
          }
        }}
      />
    </>
  )
}

export function EditSetSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-64 bg-card" />
      <Skeleton className="h-20 bg-card" />
      <Skeleton className="h-40 bg-card" />
    </div>
  )
}
