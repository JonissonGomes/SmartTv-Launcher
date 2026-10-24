export type Difficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY_OPTIONS: Array<{
  id: Difficulty
  label: string
}> = [
  { id: 'easy', label: 'Fácil' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Difícil' },
]

export function difficultyLabel(id: Difficulty): string {
  return DIFFICULTY_OPTIONS.find((d) => d.id === id)?.label ?? id
}

export interface PongDifficultyParams {
  ballSpeed: number
  paddleSpeed: number
}

export interface ReactionDifficultyParams {
  waitMinMs: number
  waitSpanMs: number
  resultMs: number
}

export interface QuizDifficultyParams {
  feedbackMs: number
}

export interface AirHockeyDifficultyParams {
  puckSpeed: number
  friction: number
  paddleSpeed: number
  boostStrength: number
}

export function pongParams(d: Difficulty): PongDifficultyParams {
  if (d === 'easy') return { ballSpeed: 0.82, paddleSpeed: 1.15 }
  if (d === 'hard') return { ballSpeed: 1.35, paddleSpeed: 1.45 }
  return { ballSpeed: 1, paddleSpeed: 1.25 }
}

export function reactionParams(d: Difficulty): ReactionDifficultyParams {
  if (d === 'easy') return { waitMinMs: 1600, waitSpanMs: 3200, resultMs: 1600 }
  if (d === 'hard') return { waitMinMs: 700, waitSpanMs: 1600, resultMs: 1000 }
  return { waitMinMs: 1200, waitSpanMs: 2800, resultMs: 1400 }
}

export function quizParams(d: Difficulty): QuizDifficultyParams {
  if (d === 'easy') return { feedbackMs: 2200 }
  if (d === 'hard') return { feedbackMs: 1100 }
  return { feedbackMs: 1800 }
}

export function airHockeyParams(d: Difficulty): AirHockeyDifficultyParams {
  if (d === 'easy') {
    return {
      puckSpeed: 0.85,
      friction: 0.992,
      paddleSpeed: 1.05,
      boostStrength: 1.15,
    }
  }
  if (d === 'hard') {
    return {
      puckSpeed: 1.35,
      friction: 0.997,
      paddleSpeed: 1.45,
      boostStrength: 1.45,
    }
  }
  return {
    puckSpeed: 1,
    friction: 0.995,
    paddleSpeed: 1.25,
    boostStrength: 1.28,
  }
}
