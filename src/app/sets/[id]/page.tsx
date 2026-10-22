import { Suspense } from "react"
import { SetView, SetViewSkeleton } from "./set-view"

export default function SetPage() {
  return (
    <Suspense fallback={<SetViewSkeleton />}>
      <SetView />
    </Suspense>
  )
}
