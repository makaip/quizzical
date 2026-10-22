"use client"

import { useId, useState } from "react"
import { CheckIcon, FolderIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createFolder, setInFolder, useFolders, type FolderInput } from "@/lib/folders"
import { useSets } from "@/lib/sets"
import { cn } from "@/lib/utils"

/** Create or rename a folder. */
export function FolderDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  initial?: FolderInput
  onSubmit: (input: FolderInput) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Content unmounts when closed, so the fields start fresh each time. */}
        <FolderForm
          title={title}
          submitLabel={submitLabel}
          initial={initial}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

function FolderForm({
  title,
  submitLabel,
  initial,
  onSubmit,
}: {
  title: string
  submitLabel: string
  initial?: FolderInput
  onSubmit: (input: FolderInput) => void
}) {
  const idPrefix = useId()
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim()) return
        onSubmit({ name: name.trim(), description: description.trim() })
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Give the folder a name and an optional description.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <label htmlFor={`${idPrefix}name`} className="text-xs font-semibold text-muted-foreground">
          Name
        </label>
        <Input
          id={`${idPrefix}name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Biology 101"
          autoFocus
          className="h-10 border-2"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${idPrefix}description`} className="text-xs font-semibold text-muted-foreground">
          Description (optional)
        </label>
        <Textarea
          id={`${idPrefix}description`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="border-2"
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

function ToggleRow({
  icon,
  label,
  detail,
  included,
  onToggle,
}: {
  icon?: React.ReactNode
  label: string
  detail: string
  included: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={included}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          included ? "border-primary bg-primary-soft" : "border-border hover:border-primary-border"
        )}
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{label}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            included ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {included ? <CheckIcon className="size-4" strokeWidth={3} /> : <PlusIcon className="size-4" />}
        </span>
      </button>
    </li>
  )
}

function toggle(folderId: string, setId: string, included: boolean) {
  try {
    setInFolder(folderId, setId, included)
  } catch (error) {
    toast.error((error as Error).message)
  }
}

/** Pick which folders a set is in, or make a new folder for it. */
export function AddToFolderDialog({
  open,
  onOpenChange,
  setId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  setId: string
}) {
  const folders = useFolders() ?? []
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add to folder</DialogTitle>
            <DialogDescription>A set can be in more than one folder.</DialogDescription>
          </DialogHeader>
          <Button
            variant="outline"
            className="h-11 justify-start border-2 border-dashed"
            onClick={() => {
              onOpenChange(false)
              setCreating(true)
            }}
          >
            <PlusIcon data-icon="inline-start" />
            New folder
          </Button>
          {folders.length > 0 && (
            <ul className="-mx-1 grid max-h-80 gap-2 overflow-y-auto px-1">
              {folders.map((folder) => {
                const included = folder.setIds.includes(setId)
                return (
                  <ToggleRow
                    key={folder.id}
                    icon={<FolderIcon className="size-5 shrink-0 text-muted-foreground" />}
                    label={folder.name}
                    detail={`${folder.setIds.length} ${folder.setIds.length === 1 ? "set" : "sets"}`}
                    included={included}
                    onToggle={() => toggle(folder.id, setId, !included)}
                  />
                )
              })}
            </ul>
          )}
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FolderDialog
        open={creating}
        onOpenChange={setCreating}
        title="New folder"
        submitLabel="Create and add"
        onSubmit={(input) => {
          try {
            createFolder(input, [setId])
            toast.success(`Added to “${input.name}”`)
            setCreating(false)
          } catch (error) {
            toast.error((error as Error).message)
          }
        }}
      />
    </>
  )
}

/** Pick which of your sets are in a folder. */
export function AddSetsDialog({
  open,
  onOpenChange,
  folderId,
  setIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId: string
  setIds: string[]
}) {
  const sets = useSets() ?? []
  const [query, setQuery] = useState("")
  const sorted = [...sets].sort((a, b) => b.updatedAt - a.updatedAt)
  const shown = sorted.filter((set) =>
    set.title.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add sets</DialogTitle>
          <DialogDescription>Choose sets from your library.</DialogDescription>
        </DialogHeader>
        {sets.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            You haven&apos;t made any sets yet.
          </p>
        ) : (
          <>
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your sets"
              aria-label="Search your sets"
              className="h-10 border-2"
            />
            <ul className="-mx-1 grid max-h-96 gap-2 overflow-y-auto px-1">
              {shown.map((set) => {
                const included = setIds.includes(set.id)
                return (
                  <ToggleRow
                    key={set.id}
                    label={set.title}
                    detail={`${set.cards.length} ${set.cards.length === 1 ? "term" : "terms"}`}
                    included={included}
                    onToggle={() => toggle(folderId, set.id, !included)}
                  />
                )
              })}
              {shown.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-foreground">No matching sets</li>
              )}
            </ul>
          </>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
