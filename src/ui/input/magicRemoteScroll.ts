/**
 * Magic Remote: scroll vertical nativo.
 * Horizontal NÃO via roda — só D-pad (scrollIntoView no foco).
 */

/** Instantâneo: smooth no webOS causa stutter no D-pad. */
export function scrollFocusedIntoView(el: HTMLElement | null): void {
  if (!el) return
  el.scrollIntoView({
    behavior: 'auto',
    block: 'nearest',
    inline: 'nearest',
  })
}

function onWheel(event: WheelEvent): void {
  const target = event.target instanceof Element ? event.target : null
  if (!target) return

  const row = target.closest<HTMLElement>('[data-scroll-x="row"]')
  if (!row) return

  // Impede a fileira de rolar no eixo X com a roda / trackpad.
  event.preventDefault()

  // Vertical continua: aplica no container de página mais próximo.
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
  }
}
