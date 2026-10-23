/**
 * Magic Remote: scroll vertical nativo.
 * Horizontal NÃO via roda — só D-pad (scrollIntoView no foco).
 */

let raf = 0
let pending: HTMLElement | null = null

function isMostlyVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  const pad = 32
  return (
    rect.top >= pad &&
    rect.left >= pad &&
    rect.bottom <= window.innerHeight - pad &&
    rect.right <= window.innerWidth - pad
  )
}

/**
 * Instantâneo + coalescido em 1 frame — evita stutter no D-pad.
 * Não scrolla se o item já está visível.
 */
export function scrollFocusedIntoView(el: HTMLElement | null): void {
  if (!el) return
  if (isMostlyVisible(el)) return
  pending = el
  if (raf) return
  raf = window.requestAnimationFrame(() => {
    raf = 0
    const target = pending
    pending = null
    if (!target || !target.isConnected) return
    if (isMostlyVisible(target)) return
    target.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest',
    })
  })
}

function onWheel(event: WheelEvent): void {
  const target = event.target instanceof Element ? event.target : null
  if (!target) return

  const row = target.closest<HTMLElement>('[data-scroll-x="row"]')
  if (!row) return

  event.preventDefault()

  const dy = event.deltaY
  if (Math.abs(dy) < 1) return
  const scroller = target.closest<HTMLElement>('[data-scroll-y]')
  if (scroller) {
    scroller.scrollTop += dy
  }
}

export function installMagicRemoteScroll(): () => void {
  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  return () => {
    window.removeEventListener('wheel', onWheel, true)
    if (raf) {
      window.cancelAnimationFrame(raf)
      raf = 0
    }
  }
}
