import { useEffect, useRef } from 'react'
import { drawArenaStatic } from '@/games/airHockeyDraw'
import { getArena, type ArenaId } from '@/games/airHockeyArenas'
import { airHockeyParams, type Difficulty } from '@/games/difficulty'
import type { PadInput } from '@/games/types'

interface AirHockeyGameProps {
  inputs: Record<string, PadInput>
  playerIds: [string, string]
  colors: [string, string]
  running: boolean
  difficulty: Difficulty
  arenaId: ArenaId
  onScore: (scores: [number, number]) => void
}

interface Body {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

const WIN_SCORE = 7

export function AirHockeyGame({
  inputs,
  playerIds,
  colors,
  running,
  difficulty,
  arenaId,
  onScore,
}: AirHockeyGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layerRef = useRef<HTMLCanvasElement | null>(null)
  const inputsRef = useRef(inputs)
  const runningRef = useRef(running)
  const onScoreRef = useRef(onScore)
  const paramsRef = useRef(airHockeyParams(difficulty))
  const arenaRef = useRef(getArena(arenaId))
  inputsRef.current = inputs
  runningRef.current = running
  onScoreRef.current = onScore
  paramsRef.current = airHockeyParams(difficulty)
  arenaRef.current = getArena(arenaId)

  const stateRef = useRef({
    p1: { x: 0.22, y: 0.5, vx: 0, vy: 0, r: 0.045 } as Body,
    p2: { x: 0.78, y: 0.5, vx: 0, vy: 0, r: 0.045 } as Body,
    puck: { x: 0.5, y: 0.5, vx: 0, vy: 0, r: 0.028 } as Body,
    s1: 0,
    s2: 0,
    cool: 0,
  })

  useEffect(() => {
    const s = stateRef.current
    s.p1 = { x: 0.22, y: 0.5, vx: 0, vy: 0, r: 0.045 }
    s.p2 = { x: 0.78, y: 0.5, vx: 0, vy: 0, r: 0.045 }
    resetPuck(s.puck, Math.random() > 0.5 ? 1 : -1)
    s.s1 = 0
    s.s2 = 0
    s.cool = 0
    layerRef.current = null
  }, [arenaId, difficulty])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const ensureLayer = (w: number, h: number) => {
      const arena = arenaRef.current
      let layer = layerRef.current
      if (!layer || layer.width !== w || layer.height !== h) {
        layer = document.createElement('canvas')
        layer.width = w
        layer.height = h
        const lctx = layer.getContext('2d')
        if (lctx) drawArenaStatic(lctx, w, h, arena)
        layerRef.current = layer
      }
      return layer
    }

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const w = canvas.width
      const h = canvas.height
      const s = stateRef.current
      const params = paramsRef.current
      const arena = arenaRef.current
      const friction = Math.pow(
        Math.pow(params.friction, arena.frictionMul),
        dt * 60,
      )

      if (runningRef.current) {
        if (s.cool > 0) s.cool -= dt
        const i1 = inputsRef.current[playerIds[0]]
        const i2 = inputsRef.current[playerIds[1]]
        movePaddle(s.p1, i1, dt, params.paddleSpeed, params.boostStrength, 0.08, 0.48)
        movePaddle(s.p2, i2, dt, params.paddleSpeed, params.boostStrength, 0.52, 0.92)

        if (s.cool <= 0) {
          s.puck.x += s.puck.vx * dt
          s.puck.y += s.puck.vy * dt
          s.puck.vx *= friction
          s.puck.vy *= friction

          const margin = 0.04
          if (s.puck.y < margin + s.puck.r || s.puck.y > 1 - margin - s.puck.r) {
            s.puck.vy *= -1
            s.puck.y = clamp(s.puck.y, margin + s.puck.r, 1 - margin - s.puck.r)
          }

          const goalTop = 0.36
          const goalBot = 0.64
          const inGoalY = s.puck.y > goalTop && s.puck.y < goalBot

          if (s.puck.x - s.puck.r < margin) {
            if (inGoalY) {
              s.s2 += 1
              onScoreRef.current([s.s1, s.s2])
              resetPuck(s.puck, 1)
              s.cool = 0.6
            } else {
              s.puck.vx = Math.abs(s.puck.vx)
              s.puck.x = margin + s.puck.r
            }
          }
          if (s.puck.x + s.puck.r > 1 - margin) {
            if (inGoalY) {
              s.s1 += 1
              onScoreRef.current([s.s1, s.s2])
              resetPuck(s.puck, -1)
              s.cool = 0.6
            } else {
              s.puck.vx = -Math.abs(s.puck.vx)
              s.puck.x = 1 - margin - s.puck.r
            }
          }

          collide(s.p1, s.puck)
          collide(s.p2, s.puck)

          const maxSp = 1.6 * params.puckSpeed * arena.puckMul
          const sp = Math.hypot(s.puck.vx, s.puck.vy)
          if (sp > maxSp) {
            s.puck.vx = (s.puck.vx / sp) * maxSp
            s.puck.vy = (s.puck.vy / sp) * maxSp
          }
        }
      }

      const layer = ensureLayer(w, h)
      ctx.drawImage(layer, 0, 0)
      drawDisc(ctx, s.p1, w, h, colors[0])
      drawDisc(ctx, s.p2, w, h, colors[1])
      drawDisc(ctx, s.puck, w, h, '#f5f5f7')

      ctx.font = `700 ${String(Math.floor(h * 0.09))}px Segoe UI`
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.textAlign = 'center'
      ctx.fillText(String(s.s1), w * 0.35, h * 0.12)
      ctx.fillText(String(s.s2), w * 0.65, h * 0.12)
      if (s.s1 >= WIN_SCORE || s.s2 >= WIN_SCORE) {
        ctx.font = `700 ${String(Math.floor(h * 0.06))}px Segoe UI`
        ctx.fillStyle = arena.accent
        ctx.fillText(
          s.s1 >= WIN_SCORE ? 'P1 venceu!' : 'P2 venceu!',
          w / 2,
          h * 0.2,
        )
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [colors, playerIds])

  return (
    <canvas ref={canvasRef} className="game-canvas" width={960} height={540} />
  )
}

function movePaddle(
  p: Body,
  input: PadInput | undefined,
  dt: number,
  speed: number,
  boost: number,
  xMin: number,
  xMax: number,
): void {
  const mul = input?.action ? boost : 1
  const ax = (input?.x ?? 0) * speed * mul
  const ay = (input?.y ?? 0) * speed * mul
  p.vx = ax
  p.vy = ay
  p.x = clamp(p.x + ax * dt, xMin, xMax)
  p.y = clamp(p.y + ay * dt, 0.1, 0.9)
}

function collide(paddle: Body, puck: Body): void {
  const dx = puck.x - paddle.x
  const dy = puck.y - paddle.y
  const dist = Math.hypot(dx, dy) || 0.0001
  const min = paddle.r + puck.r
  if (dist >= min) return
  const nx = dx / dist
  const ny = dy / dist
  const overlap = min - dist
  puck.x += nx * overlap
  puck.y += ny * overlap
  const relVx = puck.vx - paddle.vx
  const relVy = puck.vy - paddle.vy
  const vn = relVx * nx + relVy * ny
  if (vn < 0) {
    puck.vx -= 1.85 * vn * nx
    puck.vy -= 1.85 * vn * ny
  }
  puck.vx += paddle.vx * 0.55
  puck.vy += paddle.vy * 0.55
}

function resetPuck(puck: Body, dir: number): void {
  puck.x = 0.5
  puck.y = 0.5
  puck.vx = 0.48 * dir
  puck.vy = (Math.random() * 0.35 - 0.175) || 0.12
}

function drawDisc(
  ctx: CanvasRenderingContext2D,
  b: Body,
  w: number,
  h: number,
  color: string,
): void {
  const px = b.x * w
  const py = b.y * h
  const pr = b.r * Math.min(w, h)
  const g = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.35, color)
  g.addColorStop(1, shade(color, 0.55))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(px, py, pr, 0, Math.PI * 2)
  ctx.fill()
}

function shade(hex: string, factor: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  const f = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n * factor)))
      .toString(16)
      .padStart(2, '0')
  return `#${f(r)}${f(g)}${f(b)}`
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
