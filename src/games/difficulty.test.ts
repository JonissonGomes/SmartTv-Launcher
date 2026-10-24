import { describe, expect, it } from 'vitest'
import { AIR_HOCKEY_ARENAS, getArena } from '@/games/airHockeyArenas'
import {
  airHockeyParams,
  difficultyLabel,
  pongParams,
  reactionParams,
} from '@/games/difficulty'

describe('difficulty + arenas', () => {
  it('rotula dificuldades', () => {
    expect(difficultyLabel('easy')).toBe('Fácil')
    expect(difficultyLabel('hard')).toBe('Difícil')
  })

  it('hard deixa pong mais rápido que easy', () => {
    expect(pongParams('hard').ballSpeed).toBeGreaterThan(
      pongParams('easy').ballSpeed,
    )
  })

  it('hard reduz espera da reação', () => {
    expect(reactionParams('hard').waitMinMs).toBeLessThan(
      reactionParams('easy').waitMinMs,
    )
  })

  it('neon é mais rápido que clássica', () => {
    expect(getArena('neon').puckMul).toBeGreaterThan(getArena('classic').puckMul)
  })

  it('tem 3 arenas e params de hockey', () => {
    expect(AIR_HOCKEY_ARENAS).toHaveLength(3)
    expect(airHockeyParams('normal').paddleSpeed).toBeGreaterThan(0)
  })
})
