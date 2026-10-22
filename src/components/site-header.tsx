import Link from "next/link"
import { SettingsIcon } from "lucide-react"
import { CreateMenu } from "@/components/create-menu"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card dark:border-muted dark:bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="text-[22px] font-bold tracking-tight text-primary"
        >
          Quizzical
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <Link
            href="/"
            className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Your library
          </Link>
        </nav>
        <CreateMenu />
        <Button asChild variant="ghost" size="icon" aria-label="Settings" className="-ml-3 text-muted-foreground">
          <Link href="/settings">
            <SettingsIcon />
          </Link>
        </Button>
      </div>
    </header>
  )
}
