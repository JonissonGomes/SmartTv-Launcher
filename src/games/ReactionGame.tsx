import { useEffect, useRef, useState } from 'react'
import { reactionParams, type Difficulty } from '@/games/difficulty'
import type { PadInput } from '@/games/types'
import styles from './GameShared.module.css'

interface ReactionGameProps {
  inputs: Record<string, PadInput>
  playerIds: string[]
  colors: string[]
  names: string[]
  running: boolean
  difficulty: Difficulty
  onScore: (scores: number[]) => void
}

type Phase = 'wait' | 'go' | 'result'

export function ReactionGame({
  inputs,
  playerIds,
  colors,
  names,
  running,
  difficulty,
  onScore,
}: ReactionGameProps) {
  const [phase, setPhase] = useState<Phase>('wait')
  const [winner, setWinner] = useState<number | null>(null)
  const [scores, setScores] = useState(() => playerIds.map(() => 0))
  const [round, setRound] = useState(0)
  const armedAt = useRef(0)
  const onScoreRef = useRef(onScore)
  onScoreRef.current = onScore
  const params = reactionParams(difficulty)

  useEffect(() => {
    if (!running) return
    setPhase('wait')
    setWinner(null)
    const delay = params.waitMinMs + Math.random() * params.waitSpanMs
    const t = window.setTimeout(() => {
      armedAt.current = performance.now()
      setPhase('go')
    }, delay)
    return () => {
      window.clearTimeout(t)
    }
  }, [running, round, params.waitMinMs, params.waitSpanMs])

  useEffect(() => {
    if (phase !== 'go' || !running) return
    for (let i = 0; i < playerIds.length; i += 1) {
      const id = playerIds[i]
      if (!id) continue
      const input = inputs[id]
      if (input?.action && input.at >= armedAt.current - 30) {
        setWinner(i)
        setPhase('result')
        setScores((prev) => {
          const next = [...prev]
          next[i] = (next[i] ?? 0) + 1
          onScoreRef.current(next)
          return next
        })
        window.setTimeout(() => {
          setRound((r) => r + 1)
        }, params.resultMs)
        break
      }
    }
  }, [inputs, phase, playerIds, running, params.resultMs])

  return (
    <div
      className={styles.reaction}
      style={{
        background:
          phase === 'go'
            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
            : phase === 'result'
              ? 'linear-gradient(135deg, #1e2430, #0d0f14)'
              : 'linear-gradient(135deg, #7f1d1d, #450a0a)',
      }}
    >
      <p className={styles.reactionHint}>
        {phase === 'wait' && 'Espere o verde…'}
        {phase === 'go' && 'AGORA! Toque no celular'}
        {phase === 'result' &&
          winner !== null &&
          `Ponto para ${names[winner] ?? `P${String(winner + 1)}`}`}
      </p>
      <div className={styles.scoreRow}>
        {playerIds.map((id, i) => (
          <div
            key={id}
            className={styles.scoreChip}
            style={{ borderColor: colors[i] }}
          >
            <strong style={{ color: colors[i] }}>
              {names[i] ?? `P${String(i + 1)}`}
            </strong>
            <span>{String(scores[i] ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
