import { Suspense } from "react"
import { LearnSkeleton } from "@/components/learn"
import { LearnView } from "./learn-view"

export default function LearnPage() {
  return (
    <Suspense fallback={<LearnSkeleton />}>
      <LearnView />
    </Suspense>
  )
}
