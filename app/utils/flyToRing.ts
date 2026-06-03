/**
 * "Fly to cart" feedback: animate a dot from the tapped element into the
 * calorie ring (#calorie-ring), then give the ring a little pop. Pure DOM, no
 * deps. No-ops gracefully if the ring isn't on screen (e.g. on other pages).
 */
export function flyToRing(fromEl: HTMLElement | null | undefined) {
  if (!import.meta.client || !fromEl) return
  const target = document.getElementById("calorie-ring")
  if (!target) return

  const from = fromEl.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const startX = from.left + from.width / 2
  const startY = from.top + from.height / 2
  const dx = to.left + to.width / 2 - startX
  const dy = to.top + to.height / 2 - startY

  const dot = document.createElement("div")
  Object.assign(dot.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: "18px",
    height: "18px",
    margin: "-9px 0 0 -9px",
    borderRadius: "9999px",
    background: "#3b82f6",
    boxShadow: "0 2px 10px rgba(59,130,246,.5)",
    zIndex: "9999",
    pointerEvents: "none",
    transition: "transform .55s cubic-bezier(.22,.61,.36,1), opacity .5s ease-in",
  } as CSSStyleDeclaration)
  document.body.appendChild(dot)

  requestAnimationFrame(() => {
    dot.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`
    dot.style.opacity = "0.2"
  })

  window.setTimeout(() => dot.remove(), 600)

  // Ring "received" pop, timed to when the dot lands.
  window.setTimeout(() => {
    target.style.transition = "transform .2s ease-out"
    target.style.transform = "scale(1.06)"
    window.setTimeout(() => {
      target.style.transform = ""
    }, 200)
  }, 520)
}
