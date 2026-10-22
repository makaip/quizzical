"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ArrowLeftRightIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { ImportDialog } from "@/components/import-dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ParsedCard } from "@/lib/import"
import { createId, type Card, type StudySetInput } from "@/lib/sets"

const MIN_CARDS = 2
const STARTING_ROWS = 3

type SetFormProps = {
  heading: string
  submitLabel: string
  initial?: StudySetInput
  onSubmit: (input: StudySetInput) => void
}

const DRAFT_PREFIX = "draft-"

function emptyCard(id = createId()): Card {
  return { id, term: "", definition: "" }
}

export function SetForm({ heading, submitLabel, initial, onSubmit }: SetFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [cards, setCards] = useState<Card[]>(
    () => initial?.cards.map((card) => ({ ...card })) ??
      // Fixed ids so the server render and hydration agree; replaced on save.
      Array.from({ length: STARTING_ROWS }, (_, i) => emptyCard(DRAFT_PREFIX + i))
  )
  const [titleError, setTitleError] = useState(false)
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set())
  const [importOpen, setImportOpen] = useState(false)
  const focusIdRef = useRef<string | null>(null)
  // Next keeps visited pages mounted but hidden, so another copy of this form
  // can be in the DOM. Prefix ids to keep them unique.
  const idPrefix = useId()

  // Focus the term field of a card that was just added.
  useEffect(() => {
    if (!focusIdRef.current) return
    document.getElementById(`${idPrefix}term-${focusIdRef.current}`)?.focus()
    focusIdRef.current = null
  }, [cards, idPrefix])

  function updateCard(id: string, field: "term" | "definition", value: string) {
    setCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, [field]: value } : card))
    )
    if (invalidIds.has(id)) {
      setInvalidIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function addCard() {
    const card = emptyCard()
    focusIdRef.current = card.id
    setCards((prev) => [...prev, card])
  }

  function removeCard(id: string) {
    setCards((prev) => prev.filter((card) => card.id !== id))
  }

  function importCards(imported: ParsedCard[]) {
    // Like Quizlet: imported cards replace blank rows and go after the rest.
    setCards((prev) => [
      ...prev.filter((card) => card.term.trim() || card.definition.trim()),
      ...imported.map((card) => ({ ...card, id: createId() })),
    ])
    toast.success(`Imported ${imported.length} ${imported.length === 1 ? "card" : "cards"}`)
  }

  function swapSides() {
    setCards((prev) =>
      prev.map((card) => ({ ...card, term: card.definition, definition: card.term }))
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    toast.dismiss()

    const trimmed = cards.map((card) => ({
      ...card,
      term: card.term.trim(),
      definition: card.definition.trim(),
    }))
    const filled = trimmed.filter((card) => card.term || card.definition)
    const halfFilled = filled.filter((card) => !card.term || !card.definition)
    const missingTitle = !title.trim()

    setTitleError(missingTitle)
    setInvalidIds(new Set(halfFilled.map((card) => card.id)))

    if (missingTitle) {
      toast.error("Please enter a title for your set.")
      document.getElementById(`${idPrefix}title`)?.focus()
      return
    }
    if (halfFilled.length > 0) {
      toast.error("Every card needs both a term and a definition.")
      return
    }
    if (filled.length < MIN_CARDS) {
      toast.error(`You need at least ${MIN_CARDS} cards to make a set.`)
      return
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      cards: filled.map((card) =>
        card.id.startsWith(DRAFT_PREFIX) ? { ...card, id: createId() } : card
      ),
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold sm:text-3xl">{heading}</h1>
        <Button type="submit" size="lg" className="hidden sm:inline-flex">
          {submitLabel}
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        <div className="rounded-lg bg-card px-4 pt-3 pb-2">
          <UnderlineField
            id={`${idPrefix}title`}
            label="Title"
            value={title}
            invalid={titleError}
            placeholder='Enter a title, like "Biology - Chapter 22: Evolution"'
            onChange={(value) => {
              setTitle(value)
              if (titleError) setTitleError(false)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault()
            }}
            className="text-lg font-semibold"
          />
        </div>
        <div className="rounded-lg bg-card px-4 pt-3 pb-2">
          <UnderlineField
            id={`${idPrefix}description`}
            label="Description"
            value={description}
            placeholder="Add a description..."
            onChange={setDescription}
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setImportOpen(true)}
          className="bg-card"
        >
          <PlusIcon data-icon="inline-start" />
          Import
        </Button>
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImport={importCards}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swapSides}
              aria-label="Swap terms and definitions"
              className="rounded-full bg-card"
            >
              <ArrowLeftRightIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Swap terms and definitions</TooltipContent>
        </Tooltip>
      </div>

      <ol className="mt-4 space-y-4">
        {cards.map((card, index) => {
          const isLast = index === cards.length - 1
          const invalid = invalidIds.has(card.id)
          return (
            <li
              key={card.id}
              className={cn(
                "rounded-lg bg-card",
                invalid && "ring-2 ring-destructive/60"
              )}
            >
              <div className="flex items-center justify-between border-b-2 border-background px-4 py-2.5">
                <span className="text-base font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeCard(card.id)}
                  disabled={cards.length <= 1}
                  aria-label={`Delete card ${index + 1}`}
                  className="text-muted-foreground"
                >
                  <Trash2Icon />
                </Button>
              </div>
              <div className="grid gap-x-8 gap-y-4 px-4 pt-4 pb-5 sm:grid-cols-2">
                <UnderlineField
                  id={`${idPrefix}term-${card.id}`}
                  label="Term"
                  value={card.term}
                  invalid={invalid && !card.term.trim()}
                  placeholder="Enter term"
                  onChange={(value) => updateCard(card.id, "term", value)}
                />
                <UnderlineField
                  id={`${idPrefix}definition-${card.id}`}
                  label="Definition"
                  value={card.definition}
                  invalid={invalid && !card.definition.trim()}
                  placeholder="Enter definition"
                  hint="Markdown & LaTeX supported"
                  className="font-mono text-[15px]"
                  onChange={(value) => updateCard(card.id, "definition", value)}
                  onKeyDown={(event) => {
                    // Tabbing out of the last definition starts a new card.
                    if (isLast && event.key === "Tab" && !event.shiftKey) {
                      event.preventDefault()
                      addCard()
                    }
                  }}
                />
              </div>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={addCard}
        className="group mt-4 flex w-full items-center justify-center rounded-lg bg-card py-8 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex items-center gap-2 border-b-[5px] border-highlight pb-1.5 text-sm font-bold tracking-wide text-foreground uppercase transition-colors group-hover:border-primary group-hover:text-primary">
          <PlusIcon className="size-4" />
          Add card
        </span>
      </button>

      <div className="mt-8 flex justify-end">
        <Button type="submit" size="lg" className="h-14 px-8 text-base">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

type UnderlineFieldProps = {
  id: string
  label: string
  value: string
  placeholder?: string
  invalid?: boolean
  hint?: string
  className?: string
  onChange: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

function UnderlineField({
  id,
  label,
  value,
  placeholder,
  invalid,
  hint,
  className,
  onChange,
  onKeyDown,
}: UnderlineFieldProps) {
  return (
    <div className="group/field">
      <textarea
        id={id}
        rows={1}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          "peer block field-sizing-content min-h-9 w-full resize-none border-b-2 border-foreground bg-transparent py-1.5 text-base break-words outline-none placeholder:text-placeholder focus:border-highlight aria-invalid:border-destructive",
          className
        )}
      />
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs font-semibold tracking-wide text-placeholder uppercase group-has-aria-invalid/field:text-destructive"
        >
          {label}
        </label>
        {hint && (
          <span className="hidden text-xs text-placeholder group-focus-within/field:inline">
            {hint}
          </span>
        )}
      </div>
    </div>
  )
}
