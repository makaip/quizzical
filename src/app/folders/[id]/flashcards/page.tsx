import { Suspense } from "react"
import { FolderFlashcards, FolderFlashcardsSkeleton } from "./folder-flashcards"

export default function FolderFlashcardsPage() {
  return (
    <Suspense fallback={<FolderFlashcardsSkeleton />}>
      <FolderFlashcards />
    </Suspense>
  )
}
