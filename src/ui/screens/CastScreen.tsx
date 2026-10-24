import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  castPhoneUrl,
  createPlayerId,
  createRoomCode,
  qrImageUrl,
} from '@/cast/types'
import { useCastTvSession } from '@/cast/useCastSession'
import {
  isLoopbackHost,
  isUsablePublicOrigin,
  normalizeRelayOrigin,
  resolvePublicOrigin,
} from '@/services/publicOrigin'
import { useSettingsStore } from '@/store/settings'
import { Focusable } from '@/ui/focus/Focusable'
import { TvTextField } from '@/ui/input/TvTextField'
import styles from './CastScreen.module.css'

export function CastScreen() {
  const tvId = useMemo(() => createPlayerId(), [])
  const [roomId] = useState(() => createRoomCode())
  const relayOriginSaved = useSettingsStore((s) => s.relayOrigin)
  const setRelayOrigin = useSettingsStore((s) => s.setRelayOrigin)
  const [publicOrigin, setPublicOrigin] = useState(
    () => relayOriginSaved || window.location.origin,
  )
  const [relayDraft, setRelayDraft] = useState(relayOriginSaved)
  const videoRef = useRef<HTMLVideoElement>(null)

  const originOk = isUsablePublicOrigin(publicOrigin)
  const inviteUrl = castPhoneUrl(roomId, publicOrigin)
  const qrSrc = originOk ? qrImageUrl(inviteUrl) : ''
  const loopbackWarn =
    originOk && isLoopbackHost(new URL(publicOrigin).hostname)

  const { connected, error, status, statusText, phonePresent, hangup } =
    useCastTvSession({
      roomId,
      playerId: tvId,
      videoRef,
      relayOrigin: originOk ? publicOrigin : undefined,
    })

  useEffect(() => {
    void setFocus('VIEW_cast')
  }, [])

  useEffect(() => {
    setRelayDraft(relayOriginSaved)
  }, [relayOriginSaved])

  useEffect(() => {
    let cancelled = false
    void resolvePublicOrigin({ preferred: relayOriginSaved }).then((origin) => {
      if (!cancelled) setPublicOrigin(origin)
    })
    return () => {
      cancelled = true
    }
  }, [relayOriginSaved])

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
          {qrSrc ? (
            <img className={styles.qr} src={qrSrc} alt="QR para espelhar" />
          ) : (
            <div className={styles.qr} aria-hidden />
          )}
          <div>
            <h2>No celular</h2>
            <ol className={styles.steps}>
              <li>Mesma Wi‑Fi / internet (relay no servidor)</li>
              <li>Escaneie o QR (abre a página no celular)</li>
              <li>Toque em Compartilhar tela</li>
            </ol>
            {!originOk ? (
              <p className={styles.warn}>
                Sem servidor público (VITE_AUTH_API_URL). Rebuild com Render ou
                override abaixo.
              </p>
            ) : null}
            {loopbackWarn ? (
              <p className={styles.warn}>
                Host é localhost — o celular não alcança.
              </p>
            ) : null}
            <TvTextField
              focusKey="CAST_RELAY_URL"
              label="Override do relay (opcional)"
              value={relayDraft}
              onChange={setRelayDraft}
              placeholder="https://seu-servico.onrender.com"
              inputType="url"
              maxLength={120}
            />
            <Focusable
              focusKey="CAST_RELAY_SAVE"
              className={styles.hangup}
              onEnterPress={() => {
                const next = normalizeRelayOrigin(relayDraft)
                if (!next) return
                setRelayOrigin(next)
                setPublicOrigin(next)
                setRelayDraft(next)
              }}
            >
              Salvar override
            </Focusable>
            <p className={styles.url}>
              {originOk ? inviteUrl : 'QR indisponível — configure o relay'}
            </p>
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
