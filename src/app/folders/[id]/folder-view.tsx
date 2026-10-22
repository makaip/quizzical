"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useLayoutEffect, useState } from "react"
import {
  EllipsisIcon,
  FolderIcon,
  GraduationCapIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { AddSetsDialog, FolderDialog } from "@/components/folder-dialogs"
import { FolderNotFound } from "@/components/folder-not-found"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFolderDeck } from "@/lib/folder-deck"
import { deleteFolder, setInFolder, updateFolder } from "@/lib/folders"
import { cardStatus, useLearnState } from "@/lib/learn"

const tileClass =
  "flex items-center gap-3 rounded-lg border-b-4 border-transparent bg-card py-3 pr-6 pl-4 shadow-[0_0.25rem_1rem_0_var(--shadow-color)] transition-colors hover:border-primary-border focus-visible:border-primary focus-visible:outline-none"

export function FolderView() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const deck = useFolderDeck(id)
  const learn = useLearnState(id)
  const [addOpen, setAddOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Stops the "doesn't exist" screen flashing between deleting and navigating away.
  const [deleted, setDeleted] = useState(false)
  // Clear it when Next hides this page, so going Back shows "doesn't exist".
  useLayoutEffect(() => () => setDeleted(false), [])

  if (deck === undefined || deleted) return <FolderViewSkeleton />
  if (deck === null) return <FolderNotFound />

  const { folder, sets, cards } = deck
  const mastered = learn
    ? cards.filter((card) => cardStatus(learn.progress[card.id]) === "mastered").length
    : 0

  function handleDelete() {
    setDeleted(true)
    try {
      deleteFolder(id)
      toast.success("Folder deleted")
    } catch (error) {
      toast.error((error as Error).message)
    }
    router.replace("/")
  }

  function removeSet(setId: string) {
    try {
      setInFolder(id, setId, false)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <title>{`${folder.name} | Quizzical`}</title>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <FolderIcon className="size-4" />
            {sets.length} {sets.length === 1 ? "set" : "sets"} · {cards.length}{" "}
            {cards.length === 1 ? "term" : "terms"}
          </p>
          <h1 className="mt-1 text-2xl font-bold break-words sm:text-3xl">{folder.name}</h1>
          {folder.description && (
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {folder.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className="border-2 bg-card" onClick={() => setAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add sets
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
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <PencilIcon />
                Edit
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

      {sets.length === 0 ? (
        <div className="mt-8 rounded-lg bg-card px-6 py-14 text-center shadow-[0_0.25rem_1rem_0_var(--shadow-color)]">
          <p className="text-lg font-semibold">This folder has no sets yet</p>
          <p className="mt-1 text-muted-foreground">
            Add sets to organize them and study them together.
          </p>
          <Button size="lg" className="mt-6" onClick={() => setAddOpen(true)}>
            Add sets
          </Button>
        </div>
      ) : (
        <>
          <nav className="mt-6 flex flex-wrap gap-3" aria-label="Study this folder">
            <Link href={`/folders/${folder.id}/flashcards`} className={tileClass}>
              <LayersIcon className="size-6 text-primary" />
              <span>
                <span className="block font-bold">Flashcards</span>
                <span className="block text-xs text-muted-foreground">
                  {cards.length} {cards.length === 1 ? "term" : "terms"}
                </span>
              </span>
            </Link>
            <Link href={`/folders/${folder.id}/learn`} className={tileClass}>
              <GraduationCapIcon className="size-6 text-primary" />
              <span>
                <span className="block font-bold">Learn</span>
                <span className="block text-xs text-muted-foreground">
                  {mastered} / {cards.length} mastered
                </span>
              </span>
            </Link>
          </nav>

          <section className="mt-10">
            <h2 className="text-xl font-bold">Sets in this folder</h2>
            <ul className="mt-4 space-y-3">
              {sets.map((set) => (
                <li key={set.id} className="relative">
                  <Link
                    href={`/sets/${set.id}`}
                    className="block rounded-lg border-b-4 border-transparent bg-card py-4 pr-16 pl-5 shadow-[0_0.125rem_0.5rem_0_var(--shadow-color)] transition-colors hover:border-primary-border focus-visible:border-primary focus-visible:outline-none"
                  >
                    <span className="block font-bold break-words">{set.title}</span>
                    <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                      {set.cards.length} {set.cards.length === 1 ? "term" : "terms"}
                    </span>
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${set.title} from folder`}
                        onClick={() => removeSet(set.id)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                      >
                        <XIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove from folder</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <AddSetsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        folderId={folder.id}
        setIds={folder.setIds}
      />

      <FolderDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Edit folder"
        submitLabel="Save"
        initial={folder}
        onSubmit={(input) => {
          try {
            updateFolder(folder.id, input)
            setRenameOpen(false)
          } catch (error) {
            toast.error((error as Error).message)
          }
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this folder?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{folder.name}&rdquo; will be deleted. The sets in it won&apos;t be.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function FolderViewSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-72 bg-card" />
      <Skeleton className="h-16 w-64 bg-card" />
      <Skeleton className="h-40 bg-card" />
    </div>
  )
}
