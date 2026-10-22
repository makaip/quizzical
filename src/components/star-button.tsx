"use client"

import { StarIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { setStarred } from "@/lib/stars"
import { cn } from "@/lib/utils"

export function StarButton({
  setId,
  cardId,
  starred,
  className,
}: {
  setId: string
  cardId: string
  starred: boolean
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Star"
      aria-pressed={starred}
      onClick={(event) => {
        // Stars sit on clickable flashcards; starring shouldn't flip the card.
        event.stopPropagation()
        try {
          setStarred(setId, cardId, !starred)
        } catch (error) {
          toast.error((error as Error).message)
        }
      }}
      className={cn("text-muted-foreground", className)}
    >
      <StarIcon className={cn("size-5", starred && "fill-highlight text-highlight")} />
    </Button>
  )
}
