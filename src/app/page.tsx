"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FolderIcon } from "lucide-react"
import { toast } from "sonner"
import { FolderDialog } from "@/components/folder-dialogs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createFolder, useFolders } from "@/lib/folders"
import { useSets } from "@/lib/sets"
import { cn } from "@/lib/utils"

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
})

type Tab = "sets" | "folders"

const cardClass =
  "group flex h-full flex-col rounded-lg border-b-4 border-transparent bg-card px-5 py-4 shadow-[0_0.25rem_1rem_0_var(--shadow-color)] transition-colors hover:border-primary-border focus-visible:border-primary focus-visible:outline-none"

export default function LibraryPage() {
  const sets = useSets()
  const folders = useFolders()
  const [tab, setTab] = useState<Tab>("sets")

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <title>Your library | Quizzical</title>
      <h1 className="text-3xl font-bold">Your library</h1>

      <div role="tablist" aria-label="Library" className="mt-6 flex gap-6 border-b-2">
        {(
          [
            ["sets", "Flashcard sets"],
            ["folders", "Folders"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "-mb-0.5 border-b-2 pb-2.5 text-sm font-semibold transition-colors outline-none focus-visible:text-primary",
              tab === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === "sets" ? renderSets() : renderFolders()}
      </div>
    </div>
  )

  function renderSets() {
    const sorted = sets ? [...sets].sort((a, b) => b.updatedAt - a.updatedAt) : null
    if (sorted === null) return <ListSkeleton />
    if (sorted.length === 0) {
      return (
        <EmptyState title="You haven't made any sets yet" detail="Sets you create will show up here.">
          <Button asChild size="lg" className="mt-6">
            <Link href="/create">Create a set</Link>
          </Button>
        </EmptyState>
      )
    }
    return (
      <>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? "set" : "sets"}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((set) => (
            <li key={set.id}>
              <Link href={`/sets/${set.id}`} className={cardClass}>
                <span className="line-clamp-2 text-base font-bold break-words">
                  {set.title}
                </span>
                <span className="mt-2 w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {set.cards.length} {set.cards.length === 1 ? "term" : "terms"}
                </span>
                <span className="mt-auto pt-4 text-xs text-muted-foreground">
                  Edited {dateFormat.format(set.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </>
    )
  }

  function renderFolders() {
    const sorted = folders ? [...folders].sort((a, b) => b.updatedAt - a.updatedAt) : null
    if (sorted === null || sets === null) return <ListSkeleton />
    if (sorted.length === 0) return <NoFolders />
    return (
      <>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? "folder" : "folders"}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((folder) => {
            // Count only sets that still exist.
            const count = folder.setIds.filter((id) => sets.some((set) => set.id === id)).length
            return (
              <li key={folder.id}>
                <Link href={`/folders/${folder.id}`} className={cardClass}>
                  <span className="flex items-center gap-2.5">
                    <FolderIcon className="size-5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2 text-base font-bold break-words">
                      {folder.name}
                    </span>
                  </span>
                  <span className="mt-2 w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                    {count} {count === 1 ? "set" : "sets"}
                  </span>
                  <span className="mt-auto pt-4 text-xs text-muted-foreground">
                    Edited {dateFormat.format(folder.updatedAt)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </>
    )
  }
}

function NoFolders() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <EmptyState title="You don't have any folders yet" detail="Folders keep related sets together, and you can study a whole folder at once.">
      <Button size="lg" className="mt-6" onClick={() => setOpen(true)}>
        Create a folder
      </Button>
      <FolderDialog
        open={open}
        onOpenChange={setOpen}
        title="Create a new folder"
        submitLabel="Create folder"
        onSubmit={(input) => {
          try {
            const folder = createFolder(input)
            setOpen(false)
            router.push(`/folders/${folder.id}`)
          } catch (error) {
            toast.error((error as Error).message)
          }
        }}
      />
    </EmptyState>
  )
}

function EmptyState({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-card px-6 py-14 text-center shadow-[0_0.25rem_1rem_0_var(--shadow-color)]">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{detail}</p>
      {children}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg bg-card" />
      ))}
    </div>
  )
}
