type Box = { x: number; y: number; w: number; h: number }

const STORAGE_KEY = "chat-widget-box"
const MIN_W = 300
const MIN_H = 360
const MARGIN = 8
const NAV = 80 // bottom nav clearance for the default position

/**
 * Drag (move) + resize for a fixed-position floating panel, persisted to
 * localStorage. Pointer-events based, so it works with mouse and touch.
 */
export function useDragResize() {
  const box = ref<Box>({ x: 0, y: 0, w: 360, h: 520 })
  const dragging = ref(false)
  let initialized = false

  function clamp(b: Box): Box {
    if (!import.meta.client) return b
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(Math.max(b.w, MIN_W), vw - MARGIN * 2)
    const h = Math.min(Math.max(b.h, MIN_H), vh - MARGIN * 2)
    const x = Math.min(Math.max(b.x, MARGIN), Math.max(MARGIN, vw - w - MARGIN))
    const y = Math.min(Math.max(b.y, MARGIN), Math.max(MARGIN, vh - h - MARGIN))
    return { x, y, w, h }
  }

  function defaultBox(): Box {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(vw - MARGIN * 2, 448)
    const h = Math.min(Math.round(vh * 0.7), 620)
    return { x: Math.round((vw - w) / 2), y: Math.max(MARGIN, vh - h - NAV), w, h }
  }

  /** Compute the box on first open (restore saved or center a default). */
  function ensureInit() {
    if (initialized || !import.meta.client) return
    initialized = true
    let saved: Box | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) saved = JSON.parse(raw)
    } catch {
      /* ignore */
    }
    box.value = clamp(saved ?? defaultBox())
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(box.value))
    } catch {
      /* ignore */
    }
  }

  function track(e: PointerEvent, apply: (dx: number, dy: number, orig: Box) => Box) {
    e.preventDefault()
    dragging.value = true
    const startX = e.clientX
    const startY = e.clientY
    const orig = { ...box.value }
    const move = (ev: PointerEvent) => {
      box.value = clamp(apply(ev.clientX - startX, ev.clientY - startY, orig))
    }
    const up = () => {
      dragging.value = false
      document.removeEventListener("pointermove", move)
      document.removeEventListener("pointerup", up)
      persist()
    }
    document.addEventListener("pointermove", move)
    document.addEventListener("pointerup", up)
  }

  function startDrag(e: PointerEvent) {
    // Let buttons inside the drag handle (e.g. close) work normally.
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return
    track(e, (dx, dy, orig) => ({ ...orig, x: orig.x + dx, y: orig.y + dy }))
  }

  function startResize(e: PointerEvent) {
    e.stopPropagation()
    track(e, (dx, dy, orig) => ({ ...orig, w: orig.w + dx, h: orig.h + dy }))
  }

  function onViewportResize() {
    if (initialized) box.value = clamp(box.value)
  }

  if (import.meta.client) {
    window.addEventListener("resize", onViewportResize)
    onScopeDispose(() => window.removeEventListener("resize", onViewportResize))
  }

  const style = computed(() => ({
    left: `${box.value.x}px`,
    top: `${box.value.y}px`,
    width: `${box.value.w}px`,
    height: `${box.value.h}px`,
  }))

  return { box, style, dragging, ensureInit, startDrag, startResize }
}
