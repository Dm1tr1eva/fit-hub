/** Local YYYY-MM-DD (avoids the UTC off-by-one of toISOString). */
export function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export function todayKey(): string {
  return localDateKey(new Date())
}

export function parseLocalKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** "Today" / "Yesterday" / "3 June" for a YYYY-MM-DD key. */
export function dayHeading(key: string): string {
  if (key === todayKey()) return "Today"
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === localDateKey(yesterday)) return "Yesterday"
  return parseLocalKey(key).toLocaleDateString("en-US", { day: "numeric", month: "long" })
}
