import { useEffect, useMemo, useState } from 'react'
import { quizParams, type Difficulty } from '@/games/difficulty'
import { QUIZ_BANK } from '@/games/quizData'
import type { PadInput } from '@/games/types'
import styles from './GameShared.module.css'

interface QuizGameProps {
  inputs: Record<string, PadInput>
  playerIds: string[]
  colors: string[]
  names: string[]
  running: boolean
  difficulty: Difficulty
  onScore: (scores: number[]) => void
}

export function QuizGame({
  inputs,
  playerIds,
  colors,
  names,
  running,
  difficulty,
  onScore,
}: QuizGameProps) {
  const order = useMemo(
    () => [...QUIZ_BANK].sort(() => Math.random() - 0.5).slice(0, 6),
    [],
  )
  const [index, setIndex] = useState(0)
  const [scores, setScores] = useState(() => playerIds.map(() => 0))
  const [locked, setLocked] = useState(false)
  const [feedback, setFeedback] = useState('')
  const question = order[index]
  const params = quizParams(difficulty)

  useEffect(() => {
    if (!running || !question || locked) return
    for (let i = 0; i < playerIds.length; i += 1) {
      const id = playerIds[i]
      if (!id) continue
      const choice = inputs[id]?.choice
      if (!choice) continue
      setLocked(true)
      const label = names[i] ?? `P${String(i + 1)}`
      const correct = choice === question.answer
      if (correct) {
        setScores((prev) => {
          const next = [...prev]
          next[i] = (next[i] ?? 0) + 1
          onScore(next)
          return next
        })
        setFeedback(`${label} acertou!`)
      } else {
        setFeedback(`${label} errou · correta: ${question.answer}`)
      }
      window.setTimeout(() => {
        setLocked(false)
        setFeedback('')
        setIndex((n) => (n + 1) % order.length)
      }, params.feedbackMs)
      break
    }
  }, [
    inputs,
    locked,
    names,
    onScore,
    order.length,
    params.feedbackMs,
    playerIds,
    question,
    running,
  ])

  if (!question) return null

  return (
    <div className={styles.quiz}>
      <p className={styles.quizProgress}>
        Pergunta {String(index + 1)}/{String(order.length)}
      </p>
      <h2 className={styles.quizQ}>{question.q}</h2>
      <div className={styles.quizOptions}>
        {question.options.map((opt, i) => {
          const letter = (['A', 'B', 'C', 'D'] as const)[i]
          return (
            <div key={letter} className={styles.quizOpt}>
              <span className={styles.quizBadge}>{letter}</span>
              <span>{opt}</span>
            </div>
          )
        })}
      </div>
      {feedback ? <p className={styles.quizFeedback}>{feedback}</p> : null}
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
