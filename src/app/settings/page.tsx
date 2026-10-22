"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const themes = [
  { value: "system", label: "Auto", detail: "Match your device", icon: MonitorIcon },
  { value: "light", label: "Light", detail: "Always light", icon: SunIcon },
  { value: "dark", label: "Dark", detail: "Always dark", icon: MoonIcon },
] as const

const subscribe = () => () => {}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  // The saved theme is only known on the client, so render nothing selected until then.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <title>Settings | Quizzical</title>
      <h1 className="text-3xl font-bold">Settings</h1>

      <section className="mt-8 rounded-lg bg-card px-5 py-6 shadow-[0_0.25rem_1rem_0_var(--shadow-color)] sm:px-8">
        <h2 className="text-lg font-bold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose how Quizzical looks to you.</p>

        <div role="radiogroup" aria-label="Theme" className="mt-5 grid gap-3 sm:grid-cols-3">
          {themes.map(({ value, label, detail, icon: Icon }) => {
            const selected = mounted && theme === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected ? "border-primary bg-primary-soft" : "border-border hover:border-primary-border"
                )}
              >
                <Icon className={cn("size-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{detail}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
