import type { AirHockeyArena } from '@/games/airHockeyArenas'

const noiseCache = new Map<string, CanvasPattern | null>()

function noisePattern(
  ctx: CanvasRenderingContext2D,
  key: string,
  tint: string,
): CanvasPattern | null {
  const hit = noiseCache.get(key)
  if (hit !== undefined) return hit
  const off = document.createElement('canvas')
  off.width = 64
  off.height = 64
  const octx = off.getContext('2d')
  if (!octx) {
    noiseCache.set(key, null)
    return null
  }
  octx.fillStyle = tint
  octx.fillRect(0, 0, 64, 64)
  for (let i = 0; i < 420; i += 1) {
    const x = Math.random() * 64
    const y = Math.random() * 64
    octx.fillStyle = `rgba(255,255,255,${String(0.02 + Math.random() * 0.06)})`
    octx.fillRect(x, y, 1, 1)
  }
  const pattern = ctx.createPattern(off, 'repeat')
  noiseCache.set(key, pattern)
  return pattern
}

/** Camada estática da mesa (chamar quando muda arena/tamanho). */
export function drawArenaStatic(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  arena: AirHockeyArena,
): void {
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, arena.table[0])
  grad.addColorStop(1, arena.table[1])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const pattern = noisePattern(ctx, arena.id, arena.table[0])
  if (pattern) {
    ctx.globalAlpha = 0.35
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1
  }

  const pad = Math.max(10, w * 0.018)
  ctx.strokeStyle = arena.rail
  ctx.lineWidth = pad
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad)

  ctx.strokeStyle = arena.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(w / 2, pad)
  ctx.lineTo(w / 2, h - pad)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, 0, Math.PI * 2)
  ctx.stroke()

  const goalH = h * 0.28
  ctx.fillStyle = arena.goal
  ctx.fillRect(0, (h - goalH) / 2, pad * 1.2, goalH)
  ctx.fillRect(w - pad * 1.2, (h - goalH) / 2, pad * 1.2, goalH)
}
