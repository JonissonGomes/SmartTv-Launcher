/**
 * Handlers de Back (webOS 461 / Escape), LIFO.
 * Retorna true se consumiu o evento.
 */
type BackHandler = () => boolean

const stack: BackHandler[] = []

export function pushBackHandler(handler: BackHandler): () => void {
  stack.push(handler)
  return () => {
    const i = stack.lastIndexOf(handler)
    if (i >= 0) stack.splice(i, 1)
  }
}

export function runBackHandlers(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]?.()) return true
  }
  return false
}
