"use client"

import { useCallback, useEffect, useId, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  RotateCcwIcon,
  Settings2Icon,
  ShuffleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RichText } from "@/components/rich-text"
import { StarButton } from "@/components/star-button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, isTypingTarget } from "@/lib/utils"
import type { Card } from "@/lib/sets"
import { setStarred } from "@/lib/stars"

type Side = "term" | "definition"

function inOrder(length: number) {
  return Array.from({ length }, (_, i) => i)
}

function shuffled(items: number[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Long text gets smaller so it still fits on the card.
function textSize(text: string) {
  if (text.length <= 40) return "text-3xl sm:text-4xl"
  if (text.length <= 120) return "text-2xl sm:text-[1.75rem] sm:leading-snug"
  if (text.length <= 300) return "text-xl"
  return "text-base sm:text-lg"
}

export function Flashcards({
  starSetId,
  cards,
  starred,
  starredOnly,
  onStarredOnlyChange,
}: {
  /** The set a card belongs to, for starring it. */
  starSetId: (cardId: string) => string
  cards: Card[]
  starred: Set<string>
  starredOnly: boolean
  onStarredOnlyChange: (value: boolean) => void
}) {
  const [order, setOrder] = useState(() => inOrder(cards.length))
  const [position, setPosition] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [front, setFront] = useState<Side>("term")
  const hintId = useId()

  const total = cards.length
  const finished = position >= total
  const card = finished ? null : cards[order[position]]

  const flip = useCallback(() => setFlipped((value) => !value), [])

  const goTo = useCallback(
    (next: number) => {
      setPosition(Math.max(0, Math.min(next, total)))
      setFlipped(false)
    },
    [total]
  )

  function restart() {
    goTo(0)
  }

  function toggleShuffle() {
    const current = order[Math.min(position, total - 1)]
    if (isShuffled) {
      setOrder(inOrder(total))
      setPosition(current)
    } else {
      // Keep the card you're looking at, shuffle everything after it.
      const rest = inOrder(total).filter((i) => i !== current)
      setOrder([current, ...shuffled(rest)])
      setPosition(0)
    }
    setIsShuffled(!isShuffled)
    setFlipped(false)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      switch (event.key) {
        case " ":
        case "ArrowUp":
        case "ArrowDown":
          event.preventDefault()
          if (!finished) flip()
          break
        case "ArrowLeft":
          event.preventDefault()
          goTo(position - 1)
          break
        case "ArrowRight":
          event.preventDefault()
          goTo(position + 1)
          break
        case "s":
          if (!card) break
          try {
            setStarred(starSetId(card.id), card.id, !starred.has(card.id))
          } catch {}
          break
      }
    }
    // Space flips the card even when a button has focus, so stop that button
    // from also being clicked (Firefox clicks on keyup, Chrome on keydown).
    function onKeyUp(event: KeyboardEvent) {
      if (event.key === " " && !isTypingTarget(event.target)) event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [card, finished, flip, goTo, position, starSetId, starred])

  if (total === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-[0_0.25rem_1rem_0_var(--shadow-color)]">
        This set has no cards.
      </div>
    )
  }

  const back: Side = front === "term" ? "definition" : "term"

  return (
    <div>
      <div className="perspective-[2000px]">
        {card ? (
          // Not a <button>: rendered Markdown can contain links and block elements,
          // which aren't allowed inside one. Space is handled by the window listener.
          <div
            role="button"
            tabIndex={0}
            onClick={flip}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.target === event.currentTarget) flip()
            }}
            aria-roledescription="flashcard"
            aria-describedby={hintId}
            data-flipped={flipped}
            className="group block h-[clamp(18rem,52vh,26rem)] w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span id={hintId} className="sr-only">
              {flipped ? `Showing ${back}.` : `Showing ${front}.`} Press to flip.
            </span>
            <div
              // Re-mount per card so moving on never animates the old card flipping back.
              key={card.id}
              className={cn(
                "relative size-full transition-transform duration-500 ease-[cubic-bezier(0.4,0.2,0.2,1)] transform-3d motion-reduce:transition-none",
                flipped && "rotate-x-180"
              )}
            >
              <CardFace
                side={front}
                text={card[front]}
                hidden={flipped}
                star={<StarButton setId={starSetId(card.id)} cardId={card.id} starred={starred.has(card.id)} />}
              />
              <CardFace
                side={back}
                text={card[back]}
                hidden={!flipped}
                star={<StarButton setId={starSetId(card.id)} cardId={card.id} starred={starred.has(card.id)} />}
                className="rotate-x-180"
              />
            </div>
          </div>
        ) : (
          <div className="flex h-[clamp(18rem,52vh,26rem)] flex-col items-center justify-center rounded-lg bg-card px-6 text-center shadow-[0_0.25rem_1rem_0_var(--shadow-color)]">
            <p className="text-2xl font-bold">Nice work!</p>
            <p className="mt-2 text-muted-foreground">
              You&apos;ve gone through all {total} cards.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="lg" onClick={() => goTo(total - 1)}>
                <ArrowLeftIcon data-icon="inline-start" />
                Back to last card
              </Button>
              <Button size="lg" onClick={restart}>
                <RotateCcwIcon data-icon="inline-start" />
                Start over
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                aria-pressed={isShuffled}
                aria-label="Shuffle"
                className={cn(
                  "text-muted-foreground",
                  isShuffled && "bg-primary-soft text-primary hover:bg-primary-soft-hover hover:text-primary"
                )}
              >
                <ShuffleIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isShuffled ? "Turn off shuffle" : "Shuffle"}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => goTo(position - 1)}
            disabled={position === 0}
            aria-label="Previous card"
            className="rounded-full border-2 bg-card"
          >
            <ArrowLeftIcon className="size-5" />
          </Button>
          <span className="min-w-16 text-center text-base font-semibold tabular-nums" aria-live="polite">
            {Math.min(position + 1, total)} / {total}
          </span>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => goTo(position + 1)}
            disabled={finished}
            aria-label="Next card"
            className="rounded-full border-2 bg-card"
          >
            <ArrowRightIcon className="size-5" />
          </Button>
        </div>

        <div className="flex justify-end">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Options"
                    className="text-muted-foreground"
                  >
                    <Settings2Icon />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Options</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Front of card</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={front}
                onValueChange={(value) => {
                  setFront(value as Side)
                  setFlipped(false)
                }}
              >
                <DropdownMenuRadioItem value="term">Term</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="definition">Definition</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={starredOnly}
                disabled={!starredOnly && starred.size === 0}
                onCheckedChange={onStarredOnlyChange}
              >
                Study starred only ({starred.size})
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Progress
        value={(Math.min(position + 1, total) / total) * 100}
        aria-label="Progress"
        className="mt-5 h-1 bg-border"
      />

      <p className="mt-3 hidden text-center text-xs text-muted-foreground sm:block">
        Space to flip · ← → to move between cards · S to star
      </p>
    </div>
  )
}

function CardFace({
  side,
  text,
  hidden,
  star,
  className,
}: {
  side: Side
  text: string
  hidden: boolean
  star: React.ReactNode
  className?: string
}) {
  return (
    <div
      aria-hidden={hidden}
      // The face turned away still holds a star button; keep it out of tab order.
      inert={hidden}
      className={cn(
        "absolute inset-0 flex overflow-y-auto rounded-lg bg-card px-6 py-8 shadow-[0_0.25rem_1rem_0_var(--shadow-color)] backface-hidden sm:px-12",
        className
      )}
    >
      <div className="absolute top-2 right-2">{star}</div>
      {side === "definition" ? (
        <RichText
          text={text}
          className={cn("rich-text-centered m-auto max-w-full", textSize(text))}
        />
      ) : (
        <p
          className={cn(
            "m-auto max-w-full text-center whitespace-pre-wrap break-words",
            textSize(text)
          )}
        >
          {text}
        </p>
      )}
    </div>
  )
}
