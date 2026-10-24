/**
 * Relay WebSocket TV↔celular: /ws/games e /ws/cast.
 * Mesmo protocolo do plugin Vite (server/gameRelay.ts).
 */
import { WebSocketServer } from 'ws'

const ROOM_ID_RE = /^[A-Z0-9]{3,12}$/

/**
 * @param {Buffer | ArrayBuffer | Buffer[] | string} buf
 */
function parseMessage(buf) {
  try {
    const text =
      typeof buf === 'string'
        ? buf
        : Buffer.isBuffer(buf)
          ? buf.toString('utf8')
          : Array.isArray(buf)
            ? Buffer.concat(buf).toString('utf8')
            : new TextDecoder().decode(/** @type {ArrayBuffer} */ (buf))
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * @param {import('node:http').Server} httpServer
 * @param {'/ws/games' | '/ws/cast'} pathname
 */
function attachPathRelay(httpServer, pathname) {
  /** @type {Map<string, Set<import('ws').WebSocket>>} */
  const rooms = new Map()
  /** @type {WeakMap<import('ws').WebSocket, object>} */
  const meta = new WeakMap()
  const wss = new WebSocketServer({ noServer: true })

  /**
   * @param {string} roomId
   * @param {unknown} data
   * @param {import('ws').WebSocket} [except]
   */
  const broadcast = (roomId, data, except) => {
    const set = rooms.get(roomId)
    if (!set) return
    const raw = JSON.stringify(data)
    for (const client of set) {
      if (client !== except && client.readyState === 1) client.send(raw)
    }
  }

  /**
   * @param {string} roomId
   * @param {Set<import('ws').WebSocket>} set
   */
  const presencePayload = (roomId, set) => {
    if (pathname === '/ws/games') {
      return {
        type: 'presence',
        roomId,
        players: [...set]
          .map((c) => meta.get(c))
          .filter((m) => m && m.kind === 'games')
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
        .filter((m) => m && m.kind === 'cast')
        .map((m) => ({
          playerId: m.playerId,
          name: m.name,
          role: m.role,
        })),
    }
  }

  httpServer.on('upgrade', (req, socket, head) => {
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
        if (!ROOM_ID_RE.test(String(msg.roomId).trim().toUpperCase())) return
        const roomId = String(msg.roomId).trim().toUpperCase()

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

/**
 * @param {import('node:http').Server} httpServer
 */
export function attachGameRelays(httpServer) {
  attachPathRelay(httpServer, '/ws/games')
  attachPathRelay(httpServer, '/ws/cast')
}
