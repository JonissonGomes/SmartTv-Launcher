import { buildAppQueryUrl, wsUrlFromOrigin } from '@/services/publicOrigin'
import { createPlayerId, createRoomCode, qrImageUrl } from '@/games/types'

export type CastRole = 'tv' | 'phone'

export interface CastPeer {
  playerId: string
  name: string
  role: CastRole
}

export interface CastPresenceMessage {
  type: 'presence'
  roomId: string
  peers: CastPeer[]
}

export interface CastSignalMessage {
  type: 'webrtc_offer' | 'webrtc_answer' | 'ice_candidate' | 'hangup'
  roomId: string
  playerId: string
  name: string
  role: CastRole
  payload?: unknown
}

export type CastInbound = CastPresenceMessage | CastSignalMessage

export { createPlayerId, createRoomCode, qrImageUrl }

export function castPhoneUrl(roomId: string, origin?: string): string {
  return buildAppQueryUrl(
    origin ?? window.location.origin,
    {
      cast: '1',
      room: roomId,
    },
    '/',
  )
}

export function wsCastUrl(origin?: string): string | null {
  return wsUrlFromOrigin(origin ?? window.location.origin, '/ws/cast')
}
