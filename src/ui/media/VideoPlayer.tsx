import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import Hls from 'hls.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './VideoPlayer.module.css'

export interface PlayerEpisodeOption {
  id: string
  label: string
}

interface VideoPlayerProps {
  title: string
  subtitle?: string
  src: string
  poster?: string
  onClose: () => void
  /** Episódio atual (para destacar na lista). */
  episodeId?: string
  episodes?: PlayerEpisodeOption[]
  onPrevEpisode?: () => void
  onNextEpisode?: () => void
  onSelectEpisode?: (id: string) => void
  hasPrevEpisode?: boolean
  hasNextEpisode?: boolean
}

const HIDE_MS = 3500

function looksLikeHls(url: string): boolean {
  const u = url.toLowerCase()
  return (
    u.includes('.m3u8') ||
    u.includes('mpegurl') ||
    u.includes('/h.jpg') ||
    u.includes('akumast.') ||
    u.includes('application/vnd.apple.mpegurl')
  )
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m)}:${String(s).padStart(2, '0')}`
}

/** Player fullscreen — controles minimalistas com auto-hide (estilo TV/mídia). */
export function VideoPlayer({
  title,
  subtitle,
  src,
  poster,
  onClose,
  episodeId,
  episodes = [],
  onPrevEpisode,
  onNextEpisode,
  onSelectEpisode,
  hasPrevEpisode,
  hasNextEpisode,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const hideTimer = useRef<number>(0)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string>()
  const [tick, setTick] = useState(0)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [epListOpen, setEpListOpen] = useState(false)

  const showChrome = useCallback(() => {
    setChromeVisible(true)
    window.clearTimeout(hideTimer.current)
    if (epListOpen) return
    hideTimer.current = window.setTimeout(() => {
      const el = videoRef.current
      if (el && !el.paused) setChromeVisible(false)
    }, HIDE_MS)
  }, [epListOpen])

  useEffect(() => {
    void setFocus('PLAYER_PLAY')
    const video = videoRef.current
    if (!video) return

    setError(undefined)
    hlsRef.current?.destroy()
    hlsRef.current = null

    const play = () => {
      void video.play().catch(() => {
        setPaused(true)
      })
    }

    if (looksLikeHls(src) && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
      })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        play()
      })
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad()
          return
        }
        setError('Não foi possível reproduzir este stream (HLS).')
      })
    } else if (
      looksLikeHls(src) &&
      video.canPlayType('application/vnd.apple.mpegurl')
    ) {
      video.src = src
      play()
    } else {
      video.src = src
      play()
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [src])

  useEffect(() => {
    showChrome()
    return () => {
      window.clearTimeout(hideTimer.current)
    }
  }, [showChrome, src])

  useEffect(() => {
    if (epListOpen) {
      setChromeVisible(true)
      window.clearTimeout(hideTimer.current)
      void setFocus(
        episodeId
          ? `PLAYER_EP_${episodeId}`
          : 'PLAYER_EP_CLOSE',
      )
      return
    }
    showChrome()
  }, [epListOpen, episodeId, showChrome])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.keyCode === 461 || event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (epListOpen) {
          setEpListOpen(false)
          void setFocus('PLAYER_EPS')
          return
        }
        onClose()
        return
      }
      // Qualquer tecla do controle mostra o chrome
      if (
        event.key.startsWith('Arrow') ||
        event.key === 'Enter' ||
        event.key === ' ' ||
        event.keyCode === 13 ||
        event.keyCode === 32
      ) {
        showChrome()
      }
    }
    const onMove = () => {
      showChrome()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('pointerdown', onMove)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
  }, [onClose, epListOpen, showChrome])

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1)
    }, 500)
    return () => {
      window.clearInterval(id)
    }
  }, [])

  const video = videoRef.current
  const duration =
    video?.duration && Number.isFinite(video.duration) ? video.duration : 0
  const current = video?.currentTime ?? 0
  const progress = duration > 0 ? current / duration : 0
  void tick

  const togglePlay = () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
      setPaused(false)
      showChrome()
    } else {
      el.pause()
      setPaused(true)
      setChromeVisible(true)
      window.clearTimeout(hideTimer.current)
    }
  }

  const seekBy = (delta: number) => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = Math.max(
      0,
      Math.min(el.duration || 0, el.currentTime + delta),
    )
    setTick((t) => t + 1)
    showChrome()
  }

  const canEpNav = episodes.length > 1
  const showPrev = Boolean(onPrevEpisode && (hasPrevEpisode ?? canEpNav))
  const showNext = Boolean(onNextEpisode && (hasNextEpisode ?? canEpNav))
  const showList = Boolean(onSelectEpisode && episodes.length > 0)

  return (
    <div
      className={cx(
        styles.overlay,
        chromeVisible && styles.chromeVisible,
      )}
    >
      <video
        ref={videoRef}
        className={styles.video}
        poster={poster}
        playsInline
        onPlay={() => {
          setPaused(false)
          showChrome()
        }}
        onPause={() => {
          setPaused(true)
          setChromeVisible(true)
          window.clearTimeout(hideTimer.current)
        }}
        onError={() => {
          setError('Não foi possível reproduzir este vídeo.')
        }}
        onEnded={() => {
          if (showNext && onNextEpisode) {
            onNextEpisode()
            return
          }
          onClose()
        }}
      />

      {!chromeVisible ? (
        <button
          type="button"
          className={styles.tapCatcher}
          aria-label="Mostrar controles"
          onClick={showChrome}
        />
      ) : null}

      <div
        className={cx(styles.chrome, chromeVisible && styles.visible)}
        onMouseMove={showChrome}
      >
        <div className={styles.topMeta}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.bottom}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${String(Math.round(progress * 100))}%` }}
            />
          </div>
          <div className={styles.timeRow}>
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className={styles.controls}>
            {showPrev ? (
              <Focusable
                focusKey="PLAYER_PREV_EP"
                className={styles.iconBtn}
                onEnterPress={() => {
                  onPrevEpisode?.()
                  showChrome()
                }}
              >
                ⏮
              </Focusable>
            ) : null}

            <Focusable
              focusKey="PLAYER_BACK_10"
              className={styles.iconBtn}
              onEnterPress={() => {
                seekBy(-10)
              }}
            >
              <span className={styles.seekLabel}>−10</span>
            </Focusable>

            <Focusable
              focusKey="PLAYER_PLAY"
              className={styles.iconBtnPrimary}
              onEnterPress={togglePlay}
            >
              {paused ? '▶' : '❚❚'}
            </Focusable>

            <Focusable
              focusKey="PLAYER_FWD_10"
              className={styles.iconBtn}
              onEnterPress={() => {
                seekBy(10)
              }}
            >
              <span className={styles.seekLabel}>+10</span>
            </Focusable>

            {showNext ? (
              <Focusable
                focusKey="PLAYER_NEXT_EP"
                className={styles.iconBtn}
                onEnterPress={() => {
                  onNextEpisode?.()
                  showChrome()
                }}
              >
                ⏭
              </Focusable>
            ) : null}

            {showList ? (
              <Focusable
                focusKey="PLAYER_EPS"
                className={styles.iconBtn}
                onEnterPress={() => {
                  setEpListOpen(true)
                }}
              >
                ≡
              </Focusable>
            ) : null}

            <Focusable
              focusKey="PLAYER_CLOSE"
              className={styles.iconBtn}
              onEnterPress={onClose}
            >
              ✕
            </Focusable>
          </div>
        </div>
      </div>

      {epListOpen && showList ? (
        <aside className={styles.epPanel} data-scroll-y="player-eps">
          <p className={styles.epPanelTitle}>Episódios</p>
          <div className={styles.epList}>
            {episodes.map((ep) => (
              <Focusable
                key={ep.id}
                focusKey={`PLAYER_EP_${ep.id}`}
                className={cx(
                  styles.epItem,
                  ep.id === episodeId && styles.epItemActive,
                )}
                onEnterPress={() => {
                  onSelectEpisode?.(ep.id)
                  setEpListOpen(false)
                  showChrome()
                }}
              >
                {ep.label}
              </Focusable>
            ))}
          </div>
          <Focusable
            focusKey="PLAYER_EP_CLOSE"
            className={styles.epClose}
            onEnterPress={() => {
              setEpListOpen(false)
              void setFocus('PLAYER_EPS')
            }}
          >
            Fechar lista
          </Focusable>
        </aside>
      ) : null}
    </div>
  )
}
