"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useLayoutEffect, useState } from "react"
import { EllipsisIcon, FolderPlusIcon, GraduationCapIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Flashcards } from "@/components/flashcards"
import { AddToFolderDialog } from "@/components/folder-dialogs"
import { RichText } from "@/components/rich-text"
import { SetNotFound } from "@/components/set-not-found"
import { StarButton } from "@/components/star-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cardStatus, useLearnState } from "@/lib/learn"
import { deleteSet, useSet } from "@/lib/sets"
import { useStarred } from "@/lib/stars"

const noStars = new Set<string>()

export function SetView() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const set = useSet(id)
  const starred = useStarred(id) ?? noStars
  const learn = useLearnState(id)
  // Ids starred when "study starred only" was turned on. Unstarring a card
  // mid-study keeps it in the deck until the option is turned off.
  const [starredDeck, setStarredDeck] = useState<string[] | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Stops the "doesn't exist" screen flashing between deleting and navigating away.
  const [deleted, setDeleted] = useState(false)
  // Clear it when Next hides this page, so going Back shows "doesn't exist".
  useLayoutEffect(() => () => setDeleted(false), [])

  if (set === undefined || deleted) {
    return <SetViewSkeleton />
  }
  if (set === null) return <SetNotFound />

  function handleDelete() {
    setDeleted(true)
    try {
      deleteSet(id)
      toast.success("Set deleted")
    } catch (error) {
      toast.error((error as Error).message)
    }
    router.replace("/")
  }

  const deck = starredDeck
    ? set.cards.filter((card) => starredDeck.includes(card.id))
    : set.cards
  const mastered = learn
    ? set.cards.filter((card) => cardStatus(learn.progress[card.id]) === "mastered").length
    : 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <title>{`${set.title} | Quizzical`}</title>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words sm:text-3xl">{set.title}</h1>
          {set.description && (
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {set.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" className="border-2 bg-card">
            <Link href={`/sets/${set.id}/edit`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="More actions"
                className="border-2 bg-card"
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setFolderOpen(true)}>
                <FolderPlusIcon />
                Add to folder
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <nav className="mt-6 flex" aria-label="Study modes">
        <Link
          href={`/sets/${set.id}/learn`}
          className="flex items-center gap-3 rounded-lg border-b-4 border-transparent bg-card py-3 pr-6 pl-4 shadow-[0_0.25rem_1rem_0_var(--shadow-color)] transition-colors hover:border-primary-border focus-visible:border-primary focus-visible:outline-none"
        >
          <GraduationCapIcon className="size-6 text-primary" />
          <span>
            <span className="block font-bold">Learn</span>
            <span className="block text-xs text-muted-foreground">
              {mastered} / {set.cards.length} mastered
            </span>
          </span>
        </Link>
      </nav>

      <section className="mt-6" aria-label="Flashcards">
        <Flashcards
          key={`${set.updatedAt}-${starredDeck ? "starred" : "all"}`}
          starSetId={() => set.id}
          cards={deck}
          starred={starred}
          starredOnly={starredDeck !== null}
          onStarredOnlyChange={(value) =>
            setStarredDeck(value ? [...starred] : null)
          }
        />
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-bold">
          Terms in this set ({set.cards.length})
        </h2>
        <ul className="mt-4 space-y-3">
          {set.cards.map((card) => (
            <li
              key={card.id}
              className="relative grid gap-2 rounded-lg bg-card py-4 pr-14 pl-5 shadow-[0_0.125rem_0.5rem_0_var(--shadow-color)] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-0"
            >
              <p className="whitespace-pre-wrap break-words sm:border-r-2 sm:border-background sm:pr-6">
                {card.term}
              </p>
              <RichText
                text={card.definition}
                className="min-w-0 text-secondary-foreground sm:pl-6"
              />
              <StarButton
                setId={set.id}
                cardId={card.id}
                starred={starred.has(card.id)}
                className="absolute top-2.5 right-2"
              />
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <Link href={`/sets/${set.id}/edit`}>Add or remove terms</Link>
          </Button>
        </div>
      </section>

      <AddToFolderDialog open={folderOpen} onOpenChange={setFolderOpen} setId={set.id} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this set?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{set.title}&rdquo; and its {set.cards.length} cards will be
              deleted. You can&apos;t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete set
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function SetViewSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-72 bg-card" />
      <Skeleton className="h-[clamp(18rem,52vh,26rem)] bg-card" />
    </div>
  )
}
