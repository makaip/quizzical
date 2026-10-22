import { Suspense } from "react"
import { EditSet, EditSetSkeleton } from "./edit-set"

export default function EditSetPage() {
  return (
    <Suspense fallback={<EditSetSkeleton />}>
      <EditSet />
    </Suspense>
  )
}
