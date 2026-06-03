/**
 * "Fly to cart" feedback, neon edition: launch a glowing cyan comet from the
 * tapped element into the calorie ring (#calorie-ring) along a curved arc,
 * leaving a fading particle trail, then flash the ring with a cyan glow + pop.
 * Pure DOM, no deps. No-ops gracefully if the ring isn't on screen (other
 * pages) or if the user prefers reduced motion.
 */
const CYAN = "#22d3ee"

function makeParticle(size: number, glow: string): HTMLDivElement {
  const d = document.createElement("div")
  Object.assign(d.style, {
    position: "fixed",
    left: "0px",
    top: "0px",
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    borderRadius: "9999px",
    background: CYAN,
    boxShadow: glow,
    zIndex: "9999",
    pointerEvents: "none",
    willChange: "transform, opacity",
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(d)
  return d
}

function flashRing(target: HTMLElement) {
  const prevTransition = target.style.transition
  target.style.transition = "transform .22s ease-out, filter .22s ease-out"
  target.style.transform = "scale(1.08)"
  target.style.filter = "drop-shadow(0 0 16px rgba(34,211,238,.9))"
  window.setTimeout(() => {
    target.style.transform = ""
    target.style.filter = ""
    // Restore whatever transition the element had before.
    window.setTimeout(() => (target.style.transition = prevTransition), 220)
  }, 220)
}

export function flyToRing(fromEl: HTMLElement | null | undefined) {
  if (!import.meta.client || !fromEl) return
  const target = document.getElementById("calorie-ring")
  if (!target) return

  const from = fromEl.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const startX = from.left + from.width / 2
  const startY = from.top + from.height / 2
  const endX = to.left + to.width / 2
  const endY = to.top + to.height / 2

  // Honour reduced-motion: skip the comet, just give the ring its pop.
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (reduce) {
    flashRing(target)
    return
  }

  // Curved arc: bow the path out perpendicular to the straight line so the
  // comet sweeps in rather than going dead-straight.
  const dist = Math.hypot(endX - startX, endY - startY) || 1
  const nx = -(endY - startY) / dist
  const ny = (endX - startX) / dist
  const arc = Math.min(130, dist * 0.32)
  const ctrlX = (startX + endX) / 2 + nx * arc
  const ctrlY = (startY + endY) / 2 + ny * arc

  const bezier = (t: number): [number, number] => {
    const mt = 1 - t
    return [
      mt * mt * startX + 2 * mt * t * ctrlX + t * t * endX,
      mt * mt * startY + 2 * mt * t * ctrlY + t * t * endY,
    ]
  }
  const easeInOut = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

  const head = makeParticle(
    16,
    `0 0 6px 2px ${CYAN}, 0 0 16px 5px rgba(34,211,238,.85), 0 0 30px 10px rgba(34,211,238,.45)`,
  )

  const DURATION = 640
  let startTime: number | null = null
  let lastTrail = 0

  function frame(now: number) {
    if (startTime === null) startTime = now
    const t = Math.min(1, (now - startTime) / DURATION)
    const e = easeInOut(t)
    const [x, y] = bezier(e)
    const scale = 1 - 0.45 * e
    head.style.transform = `translate(${x}px, ${y}px) scale(${scale})`

    // Shed a fading trail particle every ~22ms → a comet tail.
    if (now - lastTrail > 22 && t < 0.97) {
      lastTrail = now
      const p = makeParticle(
        11 * scale,
        `0 0 5px 2px rgba(34,211,238,.65), 0 0 12px 4px rgba(34,211,238,.35)`,
      )
      p.style.transform = `translate(${x}px, ${y}px)`
      p.style.transition = "transform .45s ease-out, opacity .45s ease-out"
      requestAnimationFrame(() => {
        p.style.opacity = "0"
        p.style.transform = `translate(${x}px, ${y}px) scale(0.2)`
      })
      window.setTimeout(() => p.remove(), 480)
    }

    if (t < 1) {
      requestAnimationFrame(frame)
    } else {
      // Comet burst on arrival, then the ring "receives" it.
      head.style.transition = "transform .2s ease-out, opacity .2s ease-out"
      head.style.opacity = "0"
      head.style.transform = `translate(${endX}px, ${endY}px) scale(2)`
      window.setTimeout(() => head.remove(), 220)
      flashRing(target)
    }
  }

  requestAnimationFrame(frame)
}
