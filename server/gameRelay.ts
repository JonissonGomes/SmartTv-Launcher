import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'
import { WebSocketServer, type WebSocket } from 'ws'

interface ClientMeta {
  roomId: string
  role: 'host' | 'pad'
  playerId: string
  name: string
}

interface RelayMessage {
  type: string
  roomId?: string
  playerId?: string
  name?: string
  role?: 'host' | 'pad'
  payload?: unknown
}

function attachGameRelay(
  httpServer: NonNullable<ViteDevServer['httpServer']>,
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

  httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== '/ws/games') return

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws) => {
    ws.on('message', (buf) => {
      let msg: RelayMessage
      try {
        const text =
          typeof buf === 'string'
            ? buf
            : Buffer.isBuffer(buf)
              ? buf.toString('utf8')
              : Array.isArray(buf)
                ? Buffer.concat(buf).toString('utf8')
                : new TextDecoder().decode(buf as ArrayBuffer)
        msg = JSON.parse(text) as RelayMessage
      } catch {
        return
      }

      if (msg.type === 'join' && msg.roomId && msg.playerId && msg.role) {
        const roomId = msg.roomId.toUpperCase()
        let set = rooms.get(roomId)
        if (!set) {
          set = new Set()
          rooms.set(roomId, set)
        }
        set.add(ws)
        meta.set(ws, {
          roomId,
          role: msg.role,
          playerId: msg.playerId,
          name: msg.name ?? msg.playerId,
        })

        broadcast(roomId, {
          type: 'presence',
          roomId,
          players: [...set]
            .map((c) => meta.get(c))
            .filter((m): m is ClientMeta => Boolean(m))
            .map((m) => ({
              playerId: m.playerId,
              name: m.name,
              role: m.role,
            })),
        })
        return
      }

      const info = meta.get(ws)
      if (!info) return

      if (msg.type === 'input' || msg.type === 'host_state') {
        broadcast(info.roomId, {
          type: msg.type,
          roomId: info.roomId,
          playerId: info.playerId,
          name: info.name,
          payload: msg.payload,
        })
      }
    })

    ws.on('close', () => {
      const info = meta.get(ws)
      if (!info) return
      const set = rooms.get(info.roomId)
      set?.delete(ws)
      if (set && set.size === 0) rooms.delete(info.roomId)
      else if (set) {
        broadcast(info.roomId, {
          type: 'presence',
          roomId: info.roomId,
          players: [...set]
            .map((c) => meta.get(c))
            .filter((m): m is ClientMeta => Boolean(m))
            .map((m) => ({
              playerId: m.playerId,
              name: m.name,
              role: m.role,
            })),
        })
      }
    })
  })
}

/** Relay WebSocket TV↔celular em /ws/games (dev + preview). */
export function gameRelayPlugin(): Plugin {
  return {
    name: 'game-relay',
    configureServer(server: ViteDevServer) {
      if (server.httpServer) attachGameRelay(server.httpServer)
    },
    configurePreviewServer(server: PreviewServer) {
      if (server.httpServer) attachGameRelay(server.httpServer)
    },
  }
}
