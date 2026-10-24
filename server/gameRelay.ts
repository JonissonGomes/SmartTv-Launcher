import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'
import { WebSocketServer, type WebSocket } from 'ws'
import { isSafeGameRoomId } from '../src/services/launchSafety'

type GameRole = 'host' | 'pad'
type CastRole = 'tv' | 'phone'

interface GameClientMeta {
  kind: 'games'
  roomId: string
  role: GameRole
  playerId: string
  name: string
}

interface CastClientMeta {
  kind: 'cast'
  roomId: string
  role: CastRole
  playerId: string
  name: string
}

type ClientMeta = GameClientMeta | CastClientMeta

interface RelayMessage {
  type: string
  roomId?: string
  playerId?: string
  name?: string
  role?: string
  payload?: unknown
}

function parseMessage(buf: Buffer | ArrayBuffer | Buffer[] | string): RelayMessage | null {
  try {
    const text =
      typeof buf === 'string'
        ? buf
        : Buffer.isBuffer(buf)
          ? buf.toString('utf8')
          : Array.isArray(buf)
            ? Buffer.concat(buf).toString('utf8')
            : new TextDecoder().decode(buf as ArrayBuffer)
    return JSON.parse(text) as RelayMessage
  } catch {
    return null
  }
}

function attachPathRelay(
  httpServer: NonNullable<ViteDevServer['httpServer']>,
  pathname: '/ws/games' | '/ws/cast',
): void {
  const rooms = new Map<string, Set<WebSocket>>()
  const meta = new WeakMap<WebSocket, ClientMeta>()
  const wss = new WebSocketServer({ noServer: true })

  const broadcast = (roomId: string, data: unknown, except?: WebSocket) => {
    const set = rooms.get(roomId)
    if (!set) return
    const raw = JSON.stringify(data)
    for (const client of set) {
      if (client !== except && client.readyState === 1) client.send(raw)
    }
  }

  const presencePayload = (roomId: string, set: Set<WebSocket>) => {
    if (pathname === '/ws/games') {
      return {
        type: 'presence',
        roomId,
        players: [...set]
          .map((c) => meta.get(c))
          .filter((m): m is GameClientMeta => m?.kind === 'games')
          .map((m) => ({
            playerId: m.playerId,
            name: m.name,
            role: m.role,
          })),
      }
    }
    return {
      type: 'presence',
      roomId,
      peers: [...set]
        .map((c) => meta.get(c))
        .filter((m): m is CastClientMeta => m?.kind === 'cast')
        .map((m) => ({
          playerId: m.playerId,
          name: m.name,
          role: m.role,
        })),
    }
  }

  httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== pathname) return

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws) => {
    ws.on('message', (buf) => {
      const msg = parseMessage(buf)
      if (!msg) return

      if (msg.type === 'join' && msg.roomId && msg.playerId && msg.role) {
        if (!isSafeGameRoomId(msg.roomId)) return
        const roomId = msg.roomId.trim().toUpperCase()

        if (pathname === '/ws/games') {
          if (msg.role !== 'host' && msg.role !== 'pad') return
          let set = rooms.get(roomId)
          if (!set) {
            set = new Set()
            rooms.set(roomId, set)
          }
          set.add(ws)
          meta.set(ws, {
            kind: 'games',
            roomId,
            role: msg.role,
            playerId: msg.playerId,
            name: msg.name ?? msg.playerId,
          })
          broadcast(roomId, presencePayload(roomId, set))
          return
        }

        if (msg.role !== 'tv' && msg.role !== 'phone') return
        let set = rooms.get(roomId)
        if (!set) {
          set = new Set()
          rooms.set(roomId, set)
        }
        set.add(ws)
        meta.set(ws, {
          kind: 'cast',
          roomId,
          role: msg.role,
          playerId: msg.playerId,
          name: msg.name ?? msg.playerId,
        })
        broadcast(roomId, presencePayload(roomId, set))
        return
      }

      const info = meta.get(ws)
      if (!info) return

      if (pathname === '/ws/games' && info.kind === 'games') {
        if (msg.type === 'input' || msg.type === 'host_state') {
          broadcast(info.roomId, {
            type: msg.type,
            roomId: info.roomId,
            playerId: info.playerId,
            name: info.name,
            payload: msg.payload,
          })
        }
        return
      }

      if (pathname === '/ws/cast' && info.kind === 'cast') {
        if (
          msg.type === 'webrtc_offer' ||
          msg.type === 'webrtc_answer' ||
          msg.type === 'ice_candidate' ||
          msg.type === 'hangup'
        ) {
          broadcast(
            info.roomId,
            {
              type: msg.type,
              roomId: info.roomId,
              playerId: info.playerId,
              name: info.name,
              role: info.role,
              payload: msg.payload,
            },
            ws,
          )
        }
      }
    })

    ws.on('close', () => {
      const info = meta.get(ws)
      if (!info) return
      const set = rooms.get(info.roomId)
      set?.delete(ws)
      if (set && set.size === 0) rooms.delete(info.roomId)
      else if (set) broadcast(info.roomId, presencePayload(info.roomId, set))
    })
  })
}

function attachRelays(httpServer: NonNullable<ViteDevServer['httpServer']>): void {
  attachPathRelay(httpServer, '/ws/games')
  attachPathRelay(httpServer, '/ws/cast')
}

/** Relay WebSocket TV↔celular em /ws/games e /ws/cast (dev + preview). */
export function gameRelayPlugin(): Plugin {
  return {
    name: 'game-relay',
    configureServer(server: ViteDevServer) {
      if (server.httpServer) attachRelays(server.httpServer)
    },
    configurePreviewServer(server: PreviewServer) {
      if (server.httpServer) attachRelays(server.httpServer)
    },
  }
}
