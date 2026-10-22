import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <title>Page not found | Quizzical</title>
      <h1 className="text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-muted-foreground">
        Check the address, or head back to your sets.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/">Back to your library</Link>
      </Button>
    </div>
  )
}
