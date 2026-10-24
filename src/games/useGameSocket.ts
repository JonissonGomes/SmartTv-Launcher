import { useCallback, useEffect, useRef, useState } from 'react'
import type { PadInput, RelayInbound } from '@/games/types'
import { wsGamesUrl } from '@/games/types'
import { isUsablePublicOrigin } from '@/services/publicOrigin'

interface UseGameSocketOptions {
  roomId: string
  playerId: string
  name: string
  role: 'host' | 'pad'
  /** Origem HTTP(S) do relay (cloud Render ou LAN). */
  relayOrigin?: string
  onMessage?: (msg: RelayInbound) => void
  enabled?: boolean
}

export function useGameSocket({
  roomId,
  playerId,
  name,
  role,
  relayOrigin,
  onMessage,
  enabled = true,
}: UseGameSocketOptions) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string>()
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!enabled || !roomId) return

    const origin = relayOrigin?.trim() || window.location.origin
    const url = wsGamesUrl(origin)
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
            const msg = JSON.parse(String(event.data)) as RelayInbound
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

  const sendInput = useCallback((payload: PadInput) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'input', payload }))
  }, [])

  const sendHostState = useCallback((payload: unknown) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'host_state', payload }))
  }, [])

  return { connected, error, sendInput, sendHostState }
}
