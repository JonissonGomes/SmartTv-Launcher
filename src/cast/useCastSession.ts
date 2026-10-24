import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { CastInbound } from '@/cast/types'
import { useCastSocket } from '@/cast/useCastSocket'

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

type SignalFn = (
  type: 'webrtc_offer' | 'webrtc_answer' | 'ice_candidate' | 'hangup',
  payload?: unknown,
) => void

interface UseCastTvOptions {
  roomId: string
  playerId: string
  videoRef: RefObject<HTMLVideoElement | null>
}

interface UseCastPhoneOptions {
  roomId: string
  playerId: string
  name?: string
}

export function useCastTvSession({
  roomId,
  playerId,
  videoRef,
}: UseCastTvOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const sendSignalRef = useRef<SignalFn>(() => undefined)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'live' | 'error'>(
    'waiting',
  )
  const [statusText, setStatusText] = useState('Aguardando celular…')
  const [phonePresent, setPhonePresent] = useState(false)

  const ensurePc = useCallback(() => {
    if (pcRef.current) return pcRef.current
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    pc.ontrack = (event) => {
      const el = videoRef.current
      const stream = event.streams[0] ?? new MediaStream([event.track])
      if (el) {
        el.srcObject = stream
        void el.play().catch(() => undefined)
      }
      setStatus('live')
      setStatusText('Espelhando')
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'failed' || state === 'disconnected') {
        setStatus('waiting')
        setStatusText('Conexão perdida — aguarde novo compartilhamento')
      }
      if (state === 'connected') {
        setStatus('live')
        setStatusText('Espelhando')
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalRef.current('ice_candidate', event.candidate.toJSON())
      }
    }

    return pc
  }, [videoRef])

  const onMessage = useCallback(
    (msg: CastInbound) => {
      if (msg.type === 'presence') {
        const phone = msg.peers.some((p) => p.role === 'phone')
        setPhonePresent(phone)
        if (!phone) {
          setStatus('waiting')
          setStatusText('Aguardando celular…')
        } else {
          setStatus((prev) => {
            if (prev === 'live') return prev
            setStatusText(
              'Celular na sala — toque em Compartilhar tela no phone',
            )
            return 'waiting'
          })
        }
        return
      }

      void (async () => {
        try {
          if (msg.type === 'webrtc_offer') {
            const offer = msg.payload as RTCSessionDescriptionInit
            const pc = ensurePc()
            await pc.setRemoteDescription(offer)
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            sendSignalRef.current('webrtc_answer', answer)
            setStatusText('Negociando…')
          }
          if (msg.type === 'ice_candidate' && msg.payload) {
            const pc = ensurePc()
            await pc.addIceCandidate(msg.payload as RTCIceCandidateInit)
          }
          if (msg.type === 'hangup') {
            pcRef.current?.close()
            pcRef.current = null
            if (videoRef.current) videoRef.current.srcObject = null
            setStatus('waiting')
            setStatusText('Celular encerrou — aguardando de novo')
          }
        } catch (err) {
          setStatus('error')
          setStatusText(
            err instanceof Error ? err.message : 'Falha na sessão WebRTC',
          )
        }
      })()
    },
    [ensurePc, videoRef],
  )

  const { connected, error, sendSignal } = useCastSocket({
    roomId,
    playerId,
    name: 'TV',
    role: 'tv',
    onMessage,
  })

  useEffect(() => {
    sendSignalRef.current = sendSignal
  }, [sendSignal])

  const hangup = useCallback(() => {
    sendSignal('hangup')
    pcRef.current?.close()
    pcRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('waiting')
    setStatusText('Encerrado — aguardando celular')
  }, [sendSignal, videoRef])

  useEffect(() => {
    return () => {
      pcRef.current?.close()
      pcRef.current = null
    }
  }, [])

  return {
    connected,
    error,
    status,
    statusText,
    phonePresent,
    hangup,
  }
}

export function useCastPhoneSession({
  roomId,
  playerId,
  name = 'Celular',
}: UseCastPhoneOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sendSignalRef = useRef<SignalFn>(() => undefined)
  const [status, setStatus] = useState<
    'idle' | 'sharing' | 'error' | 'unsupported'
  >('idle')
  const [statusText, setStatusText] = useState('Pronto para compartilhar')
  const [tvPresent, setTvPresent] = useState(false)

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      t.stop()
    })
    streamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
  }, [])

  const onMessage = useCallback(
    (msg: CastInbound) => {
      if (msg.type === 'presence') {
        setTvPresent(msg.peers.some((p) => p.role === 'tv'))
        return
      }

      void (async () => {
        try {
          if (msg.type === 'webrtc_answer' && pcRef.current) {
            await pcRef.current.setRemoteDescription(
              msg.payload as RTCSessionDescriptionInit,
            )
          }
          if (msg.type === 'ice_candidate' && msg.payload && pcRef.current) {
            await pcRef.current.addIceCandidate(
              msg.payload as RTCIceCandidateInit,
            )
          }
          if (msg.type === 'hangup') {
            cleanup()
            setStatus('idle')
            setStatusText('TV encerrou a sessão')
          }
        } catch (err) {
          setStatus('error')
          setStatusText(
            err instanceof Error ? err.message : 'Erro na sinalização',
          )
        }
      })()
    },
    [cleanup],
  )

  const { connected, error, sendSignal } = useCastSocket({
    roomId,
    playerId,
    name,
    role: 'phone',
    onMessage,
  })

  useEffect(() => {
    sendSignalRef.current = sendSignal
  }, [sendSignal])

  const startShare = useCallback(async () => {
    if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') {
      setStatus('unsupported')
      setStatusText(
        'Este navegador não permite capturar a tela. Tente Chrome no Android.',
      )
      return
    }

    try {
      cleanup()
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      streamRef.current = stream

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalRef.current('ice_candidate', event.candidate.toJSON())
        }
      }

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream)
        track.onended = () => {
          sendSignalRef.current('hangup')
          cleanup()
          setStatus('idle')
          setStatusText('Compartilhamento encerrado')
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal('webrtc_offer', offer)
      setStatus('sharing')
      setStatusText('Compartilhando tela…')
    } catch (err) {
      cleanup()
      setStatus('error')
      setStatusText(
        err instanceof Error
          ? err.message
          : 'Não foi possível capturar a tela',
      )
    }
  }, [cleanup, sendSignal])

  const stopShare = useCallback(() => {
    sendSignal('hangup')
    cleanup()
    setStatus('idle')
    setStatusText('Parado')
  }, [cleanup, sendSignal])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    connected,
    error,
    status,
    statusText,
    tvPresent,
    startShare,
    stopShare,
  }
}
