import { useCallback, useEffect, useRef, useState } from 'react'
import type { CastInbound, CastRole } from '@/cast/types'
import { wsCastUrl } from '@/cast/types'
import { isUsablePublicOrigin } from '@/services/publicOrigin'

interface UseCastSocketOptions {
  roomId: string
  playerId: string
  name: string
  role: CastRole
  /** Origem HTTP(S) do relay (cloud Render ou LAN). */
  relayOrigin?: string
  onMessage?: (msg: CastInbound) => void
  enabled?: boolean
}

export function useCastSocket({
  roomId,
  playerId,
  name,
  role,
  relayOrigin,
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

    const origin = relayOrigin?.trim() || window.location.origin
    const url = wsCastUrl(origin)
    if (!url || !isUsablePublicOrigin(origin)) {
      setConnected(false)
      setError(
        'Relay indisponível — confira VITE_AUTH_API_URL no build ou Configurações.',
      )
      return
    }

    let closed = false
    let retry: number | undefined
    const connect = () => {
      try {
        const ws = new WebSocket(url)
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
          setError('Relay indisponível (servidor / rede)')
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
  }, [enabled, name, playerId, relayOrigin, role, roomId])

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
