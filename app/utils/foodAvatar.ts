/**
 * Deterministic color + initial for a food, so favorites can be told apart at a
 * glance by colour even before custom icons exist. Same name → same colour.
 *
 * This is the placeholder for a future per-food icon: once the table stores an
 * icon/colour, swap `char` for the chosen glyph and use the stored colour here.
 */
export type FoodAvatar = {
  char: string
  color: string
  background: string
  glow: string
  ring: string
}

export function foodAvatar(name?: string | null): FoodAvatar {
  const label = (name ?? "").trim()
  // Spread to grab a full unicode codepoint (handles Cyrillic, emoji, …).
  const char = label ? [...label][0]!.toUpperCase() : "?"

  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360

  return {
    char,
    color: `hsl(${hue} 90% 68%)`,
    background: `hsl(${hue} 70% 50% / 0.16)`,
    glow: `0 0 12px hsl(${hue} 90% 60% / 0.4)`,
    ring: `inset 0 0 0 1px hsl(${hue} 90% 68% / 0.35)`,
  }
}
