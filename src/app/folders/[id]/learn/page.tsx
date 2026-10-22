import { Suspense } from "react"
import { LearnSkeleton } from "@/components/learn"
import { FolderLearn } from "./folder-learn"

export default function FolderLearnPage() {
  return (
    <Suspense fallback={<LearnSkeleton />}>
      <FolderLearn />
    </Suspense>
  )
}
