"use client"

import { useId, useLayoutEffect, useRef, useState } from "react"
import { UploadIcon } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  CARD_SEPARATORS,
  TERM_SEPARATORS,
  parseImport,
  unescapeSeparator,
  type ParsedCard,
} from "@/lib/import"

const PREVIEW_LIMIT = 100
const PLACEHOLDER = "Word 1\tDefinition 1\nWord 2\tDefinition 2\nWord 3\tDefinition 3"

type ImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (cards: ParsedCard[]) => void
}

export function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [text, setText] = useState("")
  const [termKind, setTermKind] = useState<keyof typeof TERM_SEPARATORS | "custom">("tab")
  const [termCustom, setTermCustom] = useState("")
  const [cardKind, setCardKind] = useState<keyof typeof CARD_SEPARATORS | "custom">("newline")
  const [cardCustom, setCardCustom] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const caretRef = useRef<number | null>(null)
  const id = useId()

  const termSeparator =
    termKind === "custom" ? unescapeSeparator(termCustom) : TERM_SEPARATORS[termKind]
  const cardSeparator =
    cardKind === "custom" ? unescapeSeparator(cardCustom) : CARD_SEPARATORS[cardKind]
  const cards = parseImport(text, termSeparator, cardSeparator)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      setText(await file.text())
    } catch {
      toast.error(`Couldn't read ${file.name}.`)
    }
  }

  // Put the caret back after a programmatic edit, before the next keystroke.
  useLayoutEffect(() => {
    if (caretRef.current === null) return
    textareaRef.current?.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  }, [text])

  // Let Tab type a tab character, since tab is the default separator.
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab" || event.shiftKey) return
    event.preventDefault()
    const { selectionStart, selectionEnd } = event.currentTarget
    caretRef.current = selectionStart + 1
    setText(text.slice(0, selectionStart) + "\t" + text.slice(selectionEnd))
  }

  function handleImport() {
    onImport(cards)
    setText("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-5 p-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Import your data</DialogTitle>
          <DialogDescription>
            Copy and paste your data here (from Word, Excel, Google Docs, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 space-y-6 overflow-y-auto px-6">
          <div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDER}
              aria-label="Data to import"
              spellCheck={false}
              className="block h-48 w-full resize-y rounded-lg border-2 border-border bg-muted/40 p-3 font-mono text-sm outline-none [tab-size:4] placeholder:text-placeholder focus:border-primary"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Tab inserts a tab. Shift+Tab moves on.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon data-icon="inline-start" />
                Upload .txt
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.tsv,.csv,text/plain"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <SeparatorChoice
              legend="Between term and definition"
              name={`${id}-term`}
              value={termKind}
              onValueChange={(value) => setTermKind(value as typeof termKind)}
              options={[
                { value: "tab", label: "Tab" },
                { value: "comma", label: "Comma" },
              ]}
              custom={termCustom}
              onCustomChange={setTermCustom}
              customPlaceholder="-"
            />
            <SeparatorChoice
              legend="Between cards"
              name={`${id}-card`}
              value={cardKind}
              onValueChange={(value) => setCardKind(value as typeof cardKind)}
              options={[
                { value: "newline", label: "New line" },
                { value: "semicolon", label: "Semicolon" },
              ]}
              custom={cardCustom}
              onCustomChange={setCardCustom}
              customPlaceholder="\n\n"
            />
          </div>

          <section aria-label="Preview">
            <h3 className="text-sm font-bold">
              Preview{" "}
              <span className="font-semibold text-muted-foreground">
                {cards.length} {cards.length === 1 ? "card" : "cards"}
              </span>
            </h3>
            {cards.length === 0 ? (
              <p className="mt-2 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing to preview yet.
              </p>
            ) : (
              <ol className="mt-2 space-y-2">
                {cards.slice(0, PREVIEW_LIMIT).map((card, index) => (
                  <li
                    key={index}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.5fr)] gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-muted-foreground">{index + 1}</span>
                    <span className="break-words whitespace-pre-wrap">
                      {card.term || <Missing />}
                    </span>
                    <span className="font-mono text-[13px] break-words whitespace-pre-wrap">
                      {card.definition || <Missing />}
                    </span>
                  </li>
                ))}
                {cards.length > PREVIEW_LIMIT && (
                  <li className="px-3 text-sm text-muted-foreground">
                    and {cards.length - PREVIEW_LIMIT} more
                  </li>
                )}
              </ol>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={cards.length === 0}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Missing() {
  return <span className="text-destructive italic">empty</span>
}

type SeparatorChoiceProps = {
  legend: string
  name: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  custom: string
  onCustomChange: (value: string) => void
  customPlaceholder: string
}

function SeparatorChoice({
  legend,
  name,
  value,
  onValueChange,
  options,
  custom,
  onCustomChange,
  customPlaceholder,
}: SeparatorChoiceProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold">{legend}</legend>
      <RadioGroup value={value} onValueChange={onValueChange} className="gap-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2.5">
            <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
            <Label htmlFor={`${name}-${option.value}`} className="font-normal">
              {option.label}
            </Label>
          </div>
        ))}
        <div className="flex items-center gap-2.5">
          <RadioGroupItem value="custom" id={`${name}-custom`} aria-label="Custom" />
          <Input
            value={custom}
            onChange={(event) => onCustomChange(event.target.value)}
            onFocus={() => onValueChange("custom")}
            placeholder={customPlaceholder}
            aria-label={`Custom separator ${legend.toLowerCase()}`}
            className="h-8 max-w-40 font-mono"
          />
        </div>
      </RadioGroup>
    </fieldset>
  )
}
