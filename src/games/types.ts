import { buildAppQueryUrl } from '@/services/publicOrigin'

export type GameId = 'pong' | 'reaction' | 'quiz'

export interface GamePlayer {
  playerId: string
  name: string
  role: 'host' | 'pad'
  color: string
}

export interface PadInput {
  /** -1 | 0 | 1 */
  x: number
  /** -1 | 0 | 1 */
  y: number
  action: boolean
  choice?: 'A' | 'B' | 'C' | 'D'
  at: number
}

export interface RoomPresenceMessage {
  type: 'presence'
  roomId: string
  players: Array<{ playerId: string; name: string; role: 'host' | 'pad' }>
}

export interface InputMessage {
  type: 'input'
  roomId: string
  playerId: string
  name: string
  payload: PadInput
}

export interface HostStateMessage {
  type: 'host_state'
  roomId: string
  payload: unknown
}

export type RelayInbound = RoomPresenceMessage | InputMessage | HostStateMessage

export const PLAYER_COLORS: string[] = [
  '#e21221',
  '#5b9bff',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#f26522',
]

export function playerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length] ?? '#e21221'
}

export const GAME_CATALOG: Array<{
  id: GameId
  title: string
  blurb: string
  minPlayers: number
  maxPlayers: number
}> = [
  {
    id: 'pong',
    title: 'Pong Duelo',
    blurb: '2 jogadores · raquetes na vertical',
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: 'reaction',
    title: 'Reação Relâmpago',
    blurb: '2–4 jogadores · quem tocar primeiro vence',
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: 'quiz',
    title: 'Quiz Relâmpago',
    blurb: '2–4 jogadores · perguntas rápidas A/B/C/D',
    minPlayers: 2,
    maxPlayers: 4,
  },
]

export function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

export function createPlayerId(): string {
  return `p_${Math.random().toString(36).slice(2, 9)}`
}

export function controllerUrl(roomId: string, origin?: string): string {
  return buildAppQueryUrl(origin ?? window.location.origin, {
    controller: '1',
    room: roomId,
  })
}

export function qrImageUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`
}

export function wsGamesUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/games`
}
