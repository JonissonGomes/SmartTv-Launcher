export type ArenaId = 'classic' | 'neon' | 'wood'

export interface AirHockeyArena {
  id: ArenaId
  name: string
  blurb: string
  /** Multiplicador de velocidade do puck. */
  puckMul: number
  /** Multiplicador de atrito (maior = freia mais). */
  frictionMul: number
  table: [string, string]
  rail: string
  line: string
  goal: string
  accent: string
}

export const AIR_HOCKEY_ARENAS: AirHockeyArena[] = [
  {
    id: 'classic',
    name: 'Clássica',
    blurb: 'Gelo verde · baseline',
    puckMul: 1,
    frictionMul: 1,
    table: ['#0f6b4c', '#0a4d38'],
    rail: '#dfe7ef',
    line: 'rgba(255,255,255,0.55)',
    goal: 'rgba(255,255,255,0.35)',
    accent: '#7dd3a7',
  },
  {
    id: 'neon',
    name: 'Neon',
    blurb: 'Glow cyan/magenta · mais rápido',
    puckMul: 1.12,
    frictionMul: 0.96,
    table: ['#0b1020', '#16102a'],
    rail: '#5b9bff',
    line: 'rgba(120, 220, 255, 0.7)',
    goal: 'rgba(255, 80, 180, 0.45)',
    accent: '#ff4fd8',
  },
  {
    id: 'wood',
    name: 'Madeira',
    blurb: 'Tom quente · mais atrito',
    puckMul: 0.94,
    frictionMul: 1.08,
    table: ['#6b3f24', '#4a2c18'],
    rail: '#c4a484',
    line: 'rgba(255, 220, 180, 0.5)',
    goal: 'rgba(255, 200, 140, 0.4)',
    accent: '#e8b86d',
  },
]

export function getArena(id: ArenaId): AirHockeyArena {
  return AIR_HOCKEY_ARENAS.find((a) => a.id === id) ?? AIR_HOCKEY_ARENAS[0]!
}
