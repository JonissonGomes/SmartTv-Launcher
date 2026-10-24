import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  castPhoneUrl,
  createPlayerId,
  createRoomCode,
  qrImageUrl,
} from '@/cast/types'
import { useCastTvSession } from '@/cast/useCastSession'
import { isLoopbackHost, resolvePublicOrigin } from '@/services/publicOrigin'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './CastScreen.module.css'

export function CastScreen() {
  const tvId = useMemo(() => createPlayerId(), [])
  const [roomId] = useState(() => createRoomCode())
  const [publicOrigin, setPublicOrigin] = useState(window.location.origin)
  const videoRef = useRef<HTMLVideoElement>(null)

  const inviteUrl = castPhoneUrl(roomId, publicOrigin)
  const qrSrc = qrImageUrl(inviteUrl)
  const loopbackWarn = isLoopbackHost(new URL(publicOrigin).hostname)

  const { connected, error, status, statusText, phonePresent, hangup } =
    useCastTvSession({
      roomId,
      playerId: tvId,
      videoRef,
    })

  useEffect(() => {
    void setFocus('VIEW_cast')
  }, [])

  useEffect(() => {
    let cancelled = false
    void resolvePublicOrigin().then((origin) => {
      if (!cancelled) setPublicOrigin(origin)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Focusable focusKey="VIEW_cast" className={styles.screen} saveLastFocusedChild>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Celular → TV</p>
          <h1 className={styles.title}>Espelhar tela</h1>
        </div>
        <p className={styles.meta}>
          Sala <strong>{roomId}</strong>
          {' · '}
          {connected ? 'relay online' : error ?? 'aguardando relay…'}
          {' · '}
          {phonePresent ? 'celular na sala' : 'sem celular'}
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.invite}>
          <img className={styles.qr} src={qrSrc} alt="QR para espelhar" />
          <div>
            <h2>No celular</h2>
            <ol className={styles.steps}>
              <li>Mesma Wi‑Fi do PC que roda <code>npm run dev</code></li>
              <li>Escaneie o QR (ou abra o link)</li>
              <li>Toque em Compartilhar tela</li>
            </ol>
            {loopbackWarn ? (
              <p className={styles.warn}>
                Abra o launcher pelo IP da rede (URL Network do Vite), não por
                localhost.
              </p>
            ) : null}
            <p className={styles.url}>{inviteUrl}</p>
            <p className={styles.status}>{statusText}</p>
            <Focusable
              focusKey="CAST_HANGUP"
              className={styles.hangup}
              onEnterPress={hangup}
            >
              Encerrar sessão
            </Focusable>
          </div>
        </section>

        <section className={styles.stage} data-live={status === 'live'}>
          <video
            ref={videoRef}
            className={styles.video}
            autoPlay
            playsInline
            muted={false}
          />
          {status !== 'live' ? (
            <div className={styles.placeholder}>
              <p>Aguardando vídeo do celular</p>
            </div>
          ) : null}
        </section>
      </div>
    </Focusable>
  )
}
