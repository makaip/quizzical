export { cn } from "cn"

/** Whether a keyboard shortcut should leave this key press alone. */
export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [role=dialog], [role=alertdialog], [role=menu], [aria-haspopup]") !== null
  )
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  // crypto.randomUUID is missing on insecure origins (e.g. a LAN IP over http).
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
