"use client"

import Link from "next/link"
import { useId, useState } from "react"
import { GraduationCapIcon, Settings2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { LearnSession } from "@/components/learn-session"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  ROUND_SIZE_MAX,
  ROUND_SIZE_MIN,
  resetLearnProgress,
  updateLearnState,
  useLearnState,
  type LearnSettings,
  type Side,
} from "@/lib/learn"
import type { Card } from "@/lib/sets"
import { cn } from "@/lib/utils"

/** Learn mode for a set or a folder. */
export function Learn({
  learnId,
  title,
  backHref,
  cards: allCards,
  deckKey,
  starred,
  starSetId,
}: {
  /** Where progress is saved: a set or folder id. */
  learnId: string
  title: string
  backHref: string
  cards: Card[]
  /** Changes when the cards are edited, to start a fresh round. */
  deckKey: string
  starred: Set<string>
  starSetId: (cardId: string) => string
}) {
  const id = learnId
  const learn = useLearnState(id)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  // Bumped to start a fresh session after restarting.
  const [session, setSession] = useState(0)

  if (learn === null) return <LearnSkeleton />

  const { settings } = learn
  const starredCards = allCards.filter((card) => starred.has(card.id))
  const cards = settings.starredOnly && starredCards.length > 0 ? starredCards : allCards

  function changeSettings(patch: Partial<LearnSettings>) {
    try {
      updateLearnState(id, (state) => ({ ...state, settings: { ...state.settings, ...patch } }))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  function restart() {
    try {
      resetLearnProgress(id)
    } catch (error) {
      toast.error((error as Error).message)
    }
    setSession((n) => n + 1)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <title>{`Learn: ${title} | Quizzical`}</title>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold">
          <GraduationCapIcon className="size-5 text-primary" />
          Learn
        </div>
        <p className="mx-auto hidden min-w-0 truncate text-sm font-semibold text-muted-foreground sm:block">
          {title}
        </p>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Button
            variant="outline"
            onClick={() => setSettingsOpen(true)}
            className="border-2 bg-card"
          >
            <Settings2Icon data-icon="inline-start" />
            Options
          </Button>
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Close Learn"
            className="border-2 bg-card"
          >
            <Link href={backHref}>
              <XIcon />
            </Link>
          </Button>
        </div>
      </div>

      {allCards.length < 2 ? (
        <div className="rounded-2xl bg-card px-6 py-12 text-center text-muted-foreground shadow-[0_0.25rem_1rem_0_var(--shadow-color)]">
          Learn needs at least 2 terms.
        </div>
      ) : (
        <LearnSession
          key={`${deckKey}-${JSON.stringify(settings)}-${session}`}
          learnId={id}
          starSetId={starSetId}
          backHref={backHref}
          cards={cards}
          allCards={allCards}
          settings={settings}
          progress={learn.progress}
          rounds={learn.rounds}
          starred={starred}
          onRestart={restart}
        />
      )}

      <LearnSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        starredCount={starredCards.length}
        onChange={changeSettings}
        onRestart={() => {
          setSettingsOpen(false)
          setConfirmRestart(true)
        }}
      />

      <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Learn?</AlertDialogTitle>
            <AlertDialogDescription>
              Your Learn progress on every term here will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={restart}>
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function LearnSettingsDialog({
  open,
  onOpenChange,
  settings,
  starredCount,
  onChange,
  onRestart,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: LearnSettings
  starredCount: number
  onChange: (patch: Partial<LearnSettings>) => void
  onRestart: () => void
}) {
  const idPrefix = useId()
  const [roundSize, setRoundSize] = useState(String(settings.roundSize))

  function commitRoundSize() {
    const value = Math.round(Number(roundSize))
    const clamped = Number.isFinite(value)
      ? Math.min(Math.max(value, ROUND_SIZE_MIN), ROUND_SIZE_MAX)
      : settings.roundSize
    setRoundSize(String(clamped))
    if (clamped !== settings.roundSize) onChange({ roundSize: clamped })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) commitRoundSize()
        onOpenChange(next)
      }}
    >
      <DialogContent className="gap-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Options</DialogTitle>
          <DialogDescription>Changes start a new round.</DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`${idPrefix}round-size`} className="flex-col items-start gap-1">
              <span className="font-semibold">Terms per round</span>
              <span className="text-xs font-normal text-muted-foreground">
                Learn a few at a time. New terms are added as you master others.
              </span>
            </Label>
            <Input
              id={`${idPrefix}round-size`}
              type="number"
              inputMode="numeric"
              min={ROUND_SIZE_MIN}
              max={ROUND_SIZE_MAX}
              value={roundSize}
              onChange={(event) => setRoundSize(event.target.value)}
              onBlur={commitRoundSize}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRoundSize()
              }}
              className="h-9 w-20 shrink-0 border-2 text-center"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Question types</legend>
            <SwitchRow
              label="Multiple choice"
              checked={settings.choice}
              // At least one question type has to stay on.
              disabled={settings.choice && !settings.written}
              onChange={(choice) => onChange({ choice })}
            />
            <SwitchRow
              label="Written"
              checked={settings.written}
              disabled={settings.written && !settings.choice}
              onChange={(written) => onChange({ written })}
            />
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">Answer with</legend>
            <RadioGroup
              value={settings.answerWith}
              onValueChange={(value) => onChange({ answerWith: value as Side })}
              className="mt-3 flex gap-6"
            >
              <Label className="font-normal">
                <RadioGroupItem value="term" />
                Term
              </Label>
              <Label className="font-normal">
                <RadioGroupItem value="definition" />
                Definition
              </Label>
            </RadioGroup>
          </fieldset>

          <SwitchRow
            label={`Study starred terms only (${starredCount})`}
            checked={settings.starredOnly && starredCount > 0}
            disabled={starredCount === 0}
            onChange={(starredOnly) => onChange({ starredOnly })}
          />
        </div>

        <DialogFooter className="mt-6 sm:justify-between">
          <Button variant="destructive" onClick={onRestart}>
            Restart Learn
          </Button>
          <Button onClick={() => {
            commitRoundSize()
            onOpenChange(false)
          }}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SwitchRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={cn("flex items-center justify-between gap-4 text-sm", disabled && "opacity-60")}>
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </label>
  )
}

export function LearnSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-9 w-48 bg-card" />
      <Skeleton className="h-2.5 bg-card" />
      <Skeleton className="h-96 rounded-2xl bg-card" />
    </div>
  )
}
