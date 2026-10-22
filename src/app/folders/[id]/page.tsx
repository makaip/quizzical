import { Suspense } from "react"
import { FolderView, FolderViewSkeleton } from "./folder-view"

export default function FolderPage() {
  return (
    <Suspense fallback={<FolderViewSkeleton />}>
      <FolderView />
    </Suspense>
  )
}
