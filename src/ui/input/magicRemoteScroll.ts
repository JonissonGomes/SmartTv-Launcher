/**
 * Magic Remote (webOS): a roda e o ponteiro não movem overflow sozinhos
 * quando o alvo é um card Focusable. Traduzimos wheel/hover-edge em scroll.
 */

const EDGE_PX = 72
const EDGE_STEP = 28

function canScroll(el: HTMLElement, axis: 'x' | 'y'): boolean {
  if (axis === 'y') {
    return el.scrollHeight > el.clientHeight + 2
  }
  return el.scrollWidth > el.clientWidth + 2
}

function findScrollable(
  start: EventTarget | null,
  axis: 'x' | 'y',
): HTMLElement | null {
  let node =
    start instanceof Element
      ? start
      : start instanceof Node
        ? start.parentElement
        : null

  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node)
      const overflow =
        axis === 'y'
          ? `${style.overflowY} ${style.overflow}`
          : `${style.overflowX} ${style.overflow}`
      if (
        /(auto|scroll|overlay)/.test(overflow) &&
        canScroll(node, axis)
      ) {
        return node
      }
    }
    node = node.parentElement
  }

  // Fallback: área principal do catálogo
  const main =
    axis === 'y'
      ? document.querySelector<HTMLElement>('[data-scroll-y="catalog"]')
      : document.querySelector<HTMLElement>('[data-scroll-x="row"]:hover')
  return main && canScroll(main, axis) ? main : null
}

function onWheel(event: WheelEvent): void {
  if (event.defaultPrevented) return

  const overHorizontal = Boolean(
    event.target instanceof Element &&
      event.target.closest('[data-scroll-x="row"]'),
  )

  // Sobre uma fileira: roda vertical → scroll lateral (padrão Netflix TV).
  if (overHorizontal && Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
    const row = findScrollable(event.target, 'x')
    if (row) {
      event.preventDefault()
      row.scrollLeft += event.deltaY
      return
    }
  }

  const axis: 'x' | 'y' =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? 'x' : 'y'
  const el = findScrollable(event.target, axis)
  if (!el) return

  event.preventDefault()
  if (axis === 'y') el.scrollTop += event.deltaY || event.deltaX
  else el.scrollLeft += event.deltaX || event.deltaY
}

let edgeRaf = 0
let lastPointer: PointerEvent | null = null

function applyEdgeScroll(event: PointerEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return

  const row = target.closest<HTMLElement>('[data-scroll-x="row"]')
  if (row && canScroll(row, 'x')) {
    const rect = row.getBoundingClientRect()
    if (event.clientX <= rect.left + EDGE_PX) row.scrollLeft -= EDGE_STEP
    else if (event.clientX >= rect.right - EDGE_PX) row.scrollLeft += EDGE_STEP
  }

  const catalog = document.querySelector<HTMLElement>(
    '[data-scroll-y="catalog"]',
  )
  if (catalog && canScroll(catalog, 'y')) {
    const rect = catalog.getBoundingClientRect()
    if (event.clientY <= rect.top + EDGE_PX) catalog.scrollTop -= EDGE_STEP
    else if (event.clientY >= rect.bottom - EDGE_PX)
      catalog.scrollTop += EDGE_STEP
  }
}

/** Ponteiro perto da borda da fileira/página → scroll contínuo (throttle rAF). */
function onPointerMove(event: PointerEvent): void {
  lastPointer = event
  if (edgeRaf) return
  edgeRaf = window.requestAnimationFrame(() => {
    edgeRaf = 0
    if (lastPointer) applyEdgeScroll(lastPointer)
  })
}

/** Mantém card focado visível na fileira/página (D-pad). */
export function scrollFocusedIntoView(el: HTMLElement | null): void {
  if (!el) return
  el.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  })
}

export function installMagicRemoteScroll(): () => void {
  const onMove = (event: PointerEvent) => {
    onPointerMove(event)
  }

  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  window.addEventListener('pointermove', onMove, { passive: true })

  return () => {
    window.removeEventListener('wheel', onWheel, true)
    window.removeEventListener('pointermove', onMove)
  }
}
