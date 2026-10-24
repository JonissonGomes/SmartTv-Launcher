import { useEffect, useRef } from 'react'
import { pongParams, type Difficulty } from '@/games/difficulty'
import type { PadInput } from '@/games/types'

interface PongGameProps {
  inputs: Record<string, PadInput>
  playerIds: [string, string]
  colors: [string, string]
  running: boolean
  difficulty: Difficulty
  onScore: (scores: [number, number]) => void
}

export function PongGame({
  inputs,
  playerIds,
  colors,
  running,
  difficulty,
  onScore,
}: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputsRef = useRef(inputs)
  const runningRef = useRef(running)
  const onScoreRef = useRef(onScore)
  const paramsRef = useRef(pongParams(difficulty))
  inputsRef.current = inputs
  runningRef.current = running
  onScoreRef.current = onScore
  paramsRef.current = pongParams(difficulty)

  const stateRef = useRef({
    ballX: 0.5,
    ballY: 0.5,
    vx: 0.35,
    vy: 0.22,
    p1: 0.5,
    p2: 0.5,
    s1: 0,
    s2: 0,
  })

  useEffect(() => {
    const s = stateRef.current
    const p = pongParams(difficulty)
    s.ballX = 0.5
    s.ballY = 0.5
    s.vx = 0.35 * p.ballSpeed
    s.vy = 0.22 * p.ballSpeed
    s.s1 = 0
    s.s2 = 0
  }, [difficulty])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const w = canvas.width
      const h = canvas.height
      const s = stateRef.current
      const params = paramsRef.current
      const currentInputs = inputsRef.current

      if (runningRef.current) {
        const i1 = currentInputs[playerIds[0]]
        const i2 = currentInputs[playerIds[1]]
        s.p1 = clamp(
          s.p1 + (i1?.y ?? 0) * dt * params.paddleSpeed,
          0.12,
          0.88,
        )
        s.p2 = clamp(
          s.p2 + (i2?.y ?? 0) * dt * params.paddleSpeed,
          0.12,
          0.88,
        )

        s.ballX += s.vx * dt
        s.ballY += s.vy * dt

        if (s.ballY < 0.03 || s.ballY > 0.97) s.vy *= -1

        if (s.ballX < 0.06 && Math.abs(s.ballY - s.p1) < 0.12) {
          s.vx = Math.abs(s.vx) * 1.05
          s.vy += (s.ballY - s.p1) * 1.2
        }
        if (s.ballX > 0.94 && Math.abs(s.ballY - s.p2) < 0.12) {
          s.vx = -Math.abs(s.vx) * 1.05
          s.vy += (s.ballY - s.p2) * 1.2
        }

        if (s.ballX < 0) {
          s.s2 += 1
          resetBall(s, 1, params.ballSpeed)
          onScoreRef.current([s.s1, s.s2])
        }
        if (s.ballX > 1) {
          s.s1 += 1
          resetBall(s, -1, params.ballSpeed)
          onScoreRef.current([s.s1, s.s2])
        }
      }

      ctx.fillStyle = '#0d0f14'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.setLineDash([8, 10])
      ctx.beginPath()
      ctx.moveTo(w / 2, 0)
      ctx.lineTo(w / 2, h)
      ctx.stroke()
      ctx.setLineDash([])

      const paddleH = h * 0.22
      ctx.fillStyle = colors[0]
      ctx.fillRect(w * 0.03, s.p1 * h - paddleH / 2, w * 0.018, paddleH)
      ctx.fillStyle = colors[1]
      ctx.fillRect(w * 0.952, s.p2 * h - paddleH / 2, w * 0.018, paddleH)

      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(s.ballX * w, s.ballY * h, Math.max(6, w * 0.012), 0, Math.PI * 2)
      ctx.fill()

      ctx.font = `700 ${String(Math.floor(h * 0.08))}px Segoe UI`
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText(String(s.s1), w * 0.35, h * 0.12)
      ctx.fillText(String(s.s2), w * 0.58, h * 0.12)

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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function resetBall(
  s: { ballX: number; ballY: number; vx: number; vy: number },
  dir: number,
  speedMul: number,
): void {
  s.ballX = 0.5
  s.ballY = 0.5
  s.vx = 0.35 * dir * speedMul
  s.vy = (Math.random() * 0.4 - 0.2 || 0.15) * speedMul
}
