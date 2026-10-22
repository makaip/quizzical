import Link from "next/link"
import { Button } from "@/components/ui/button"

export function FolderNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <title>Folder not found | Quizzical</title>
      <h1 className="text-2xl font-bold">This folder doesn&apos;t exist</h1>
      <p className="mt-2 text-muted-foreground">
        It may have been deleted, or it was made in a different browser.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/">Back to your library</Link>
      </Button>
    </div>
  )
}
