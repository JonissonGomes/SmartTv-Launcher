import { useCallback, useEffect, useRef, useState } from 'react'
import type { CastInbound, CastRole } from '@/cast/types'
import { wsCastUrl } from '@/cast/types'

interface UseCastSocketOptions {
  roomId: string
  playerId: string
  name: string
  role: CastRole
  onMessage?: (msg: CastInbound) => void
  enabled?: boolean
}

export function useCastSocket({
  roomId,
  playerId,
  name,
  role,
  onMessage,
  enabled = true,
}: UseCastSocketOptions) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string>()
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!enabled || !roomId) return

    let closed = false
    let retry: number | undefined
    const connect = () => {
      try {
        const ws = new WebSocket(wsCastUrl())
        wsRef.current = ws

        ws.onopen = () => {
          if (closed) return
          setConnected(true)
          setError(undefined)
          ws.send(
            JSON.stringify({
              type: 'join',
              roomId,
              playerId,
              name,
              role,
            }),
          )
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(String(event.data)) as CastInbound
            onMessageRef.current?.(msg)
          } catch {
            // ignore
          }
        }

        ws.onclose = () => {
          setConnected(false)
          if (!closed) {
            retry = window.setTimeout(connect, 1200)
          }
        }

        ws.onerror = () => {
          setError('Relay indisponível (use npm run dev na mesma rede)')
        }
      } catch {
        setError('WebSocket não suportado neste ambiente')
      }
    }

    connect()

    return () => {
      closed = true
      if (retry) window.clearTimeout(retry)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [enabled, name, playerId, role, roomId])

  const sendSignal = useCallback(
    (
      type: 'webrtc_offer' | 'webrtc_answer' | 'ice_candidate' | 'hangup',
      payload?: unknown,
    ) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ type, payload }))
    },
    [],
  )

  return { connected, error, sendSignal }
}
