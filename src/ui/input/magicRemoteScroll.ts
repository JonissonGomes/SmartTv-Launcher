/**
 * Magic Remote: só intercepta a roda sobre fileiras horizontais.
 * Scroll vertical fica nativo (prevenir default em tudo deixava a TV lenta).
 */

function canScrollX(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth + 2
}

function findHorizontalScroller(start: EventTarget | null): HTMLElement | null {
  const row =
    start instanceof Element
      ? start.closest<HTMLElement>('[data-scroll-x="row"]')
      : null
  if (row && canScrollX(row)) return row
  return null
}

let wheelRaf = 0
let pendingDelta = 0
let pendingEl: HTMLElement | null = null

function onWheel(event: WheelEvent): void {
  const row = findHorizontalScroller(event.target)
  if (!row) {
    // Vertical: deixa o browser/TV scrollar — não preventDefault.
    return
  }

  // Roda vertical sobre a fileira → scroll lateral.
  if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return

  event.preventDefault()
  pendingEl = row
  pendingDelta += event.deltaY
  if (wheelRaf) return
  wheelRaf = window.requestAnimationFrame(() => {
    wheelRaf = 0
    if (pendingEl) pendingEl.scrollLeft += pendingDelta
    pendingDelta = 0
    pendingEl = null
  })
}

/** Instantâneo: smooth no webOS causa stutter no D-pad. */
export function scrollFocusedIntoView(el: HTMLElement | null): void {
  if (!el) return
  el.scrollIntoView({
    behavior: 'auto',
    block: 'nearest',
    inline: 'nearest',
  })
}

export function installMagicRemoteScroll(): () => void {
  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  return () => {
    window.removeEventListener('wheel', onWheel, true)
    if (wheelRaf) window.cancelAnimationFrame(wheelRaf)
    wheelRaf = 0
  }
}
