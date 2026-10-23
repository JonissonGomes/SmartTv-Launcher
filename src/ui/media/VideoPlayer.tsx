import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import Hls from 'hls.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  availableAudioKinds,
  filterEpisodesByAudio,
} from '@/domain/animeAudio'
import { useUiSessionStore } from '@/store/uiSession'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { MediaIcons } from '@/ui/icons/MediaIcons'
import { pushBackHandler } from '@/ui/input/backStack'
import styles from './VideoPlayer.module.css'

export interface PlayerEpisodeOption {
  id: string
  label: string
  audio?: string
  season?: number
}

interface CaptionTrack {
  id: string
  label: string
  /** Índice em video.textTracks ou hls.subtitleTracks */
  index: number
  kind: 'native' | 'hls'
}

interface VideoPlayerProps {
  title: string
  subtitle?: string
  src: string
  /** Outras URLs se a principal falhar (comum na TV). */
  fallbackSrcs?: string[]
  poster?: string
  onClose: () => void
  /** Retoma em segundos (continuar assistindo). */
  startAt?: number
  /** Callback periódico de progresso. */
  onProgress?: (currentTime: number, duration: number) => void
  episodeId?: string
  episodes?: PlayerEpisodeOption[]
  onPrevEpisode?: () => void
  onNextEpisode?: () => void
  onSelectEpisode?: (id: string) => void
  hasPrevEpisode?: boolean
  hasNextEpisode?: boolean
}

const HIDE_MS = 4200
const EMPTY_FALLBACKS: string[] = []

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

function collectNativeTracks(video: HTMLVideoElement): CaptionTrack[] {
  const out: CaptionTrack[] = []
  const list = video.textTracks
  for (let i = 0; i < list.length; i++) {
    const t = list[i]
    if (!t) continue
    if (t.kind !== 'subtitles' && t.kind !== 'captions') continue
    out.push({
      id: `native-${String(i)}`,
      label: t.label || t.language || `Legenda ${String(i + 1)}`,
      index: i,
      kind: 'native',
    })
  }
  return out
}

/** Player fullscreen — Lucide + auto-hide estável + episódios/CC. */
export function VideoPlayer({
  title,
  subtitle,
  src,
  fallbackSrcs,
  poster,
  onClose,
  startAt = 0,
  onProgress,
  episodeId,
  episodes = [],
  onPrevEpisode,
  onNextEpisode,
  onSelectEpisode,
  hasPrevEpisode,
  hasNextEpisode,
}: VideoPlayerProps) {
  const setPlayerOpen = useUiSessionStore((s) => s.setPlayerOpen)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const hideTimer = useRef(0)
  const startApplied = useRef(false)
  const panelOpenRef = useRef(false)
  const chromeVisibleRef = useRef(true)
  const fillRef = useRef<HTMLDivElement>(null)
  const timeCurRef = useRef<HTMLSpanElement>(null)
  const timeDurRef = useRef<HTMLSpanElement>(null)
  const extras = fallbackSrcs ?? EMPTY_FALLBACKS
  const srcQueue = useMemo(
    () => [src, ...extras].filter(Boolean),
    [src, extras],
  )
  const [srcIndex, setSrcIndex] = useState(0)
  const activeSrc = srcQueue[Math.min(srcIndex, srcQueue.length - 1)] ?? src

  const [paused, setPaused] = useState(false)
  const [buffering, setBuffering] = useState(true)
  const [error, setError] = useState<string>()
  const [chromeVisible, setChromeVisible] = useState(true)
  const [epListOpen, setEpListOpen] = useState(false)
  const [capListOpen, setCapListOpen] = useState(false)
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([])
  const [activeCaptionId, setActiveCaptionId] = useState<string | null>(null)
  const [cueText, setCueText] = useState('')
  const audioKinds = useMemo(() => availableAudioKinds(episodes), [episodes])
  const [epAudioFilter, setEpAudioFilter] = useState<
    'dublado' | 'legendado' | 'all'
  >('all')
  const [epSeasonFilter, setEpSeasonFilter] = useState<number | 'all'>('all')

  const seasonsInList = useMemo(() => {
    const set = new Set<number>()
    for (const e of episodes) {
      if (typeof e.season === 'number') set.add(e.season)
    }
    return [...set].sort((a, b) => a - b)
  }, [episodes])

  const filteredEpisodes = useMemo(() => {
    let list = filterEpisodesByAudio(episodes, epAudioFilter)
    if (epSeasonFilter !== 'all') {
      list = list.filter((e) => e.season === epSeasonFilter)
    }
    return list
  }, [episodes, epAudioFilter, epSeasonFilter])

  const panelOpen = epListOpen || capListOpen
  panelOpenRef.current = panelOpen

  const setChrome = useCallback((visible: boolean) => {
    chromeVisibleRef.current = visible
    setChromeVisible(visible)
  }, [])

  /** Só agenda o hide — não reabre o chrome. */
  const armHide = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    if (panelOpenRef.current) return
    const el = videoRef.current
    if (!el || el.paused) return
    hideTimer.current = window.setTimeout(() => {
      if (panelOpenRef.current) return
      const v = videoRef.current
      if (v && !v.paused) setChrome(false)
    }, HIDE_MS)
  }, [setChrome])

  /** Mostra controles (ação explícita do usuário). */
  const revealChrome = useCallback(() => {
    setChrome(true)
    armHide()
  }, [armHide, setChrome])

  /** Com chrome já visível, só renova o timer (mousemove no painel). */
  const bumpChrome = useCallback(() => {
    if (!chromeVisibleRef.current) return
    armHide()
  }, [armHide])

  useEffect(() => {
    setPlayerOpen(true)
    return () => {
      setPlayerOpen(false)
      window.clearTimeout(hideTimer.current)
    }
  }, [setPlayerOpen])

  useEffect(() => {
    if (audioKinds.length === 1) setEpAudioFilter(audioKinds[0]!)
    else setEpAudioFilter('all')
  }, [audioKinds])

  const refreshTracks = useCallback(() => {
    const video = videoRef.current
    const hls = hlsRef.current
    if (!video) return

    if (hls && hls.subtitleTracks.length > 0) {
      const tracks: CaptionTrack[] = hls.subtitleTracks.map((t, i) => ({
        id: `hls-${String(i)}`,
        label: t.name || t.lang || `Legenda ${String(i + 1)}`,
        index: i,
        kind: 'hls' as const,
      }))
      setCaptionTracks(tracks)
      return
    }

    setCaptionTracks(collectNativeTracks(video))
  }, [])

  const applyCaption = useCallback(
    (trackId: string | null) => {
      const video = videoRef.current
      const hls = hlsRef.current
      if (!video) return

      setActiveCaptionId(trackId)
      setCueText('')

      if (hls && hls.subtitleTracks.length > 0) {
        if (trackId === null) {
          hls.subtitleTrack = -1
        } else {
          const t = captionTracks.find((c) => c.id === trackId)
          if (t?.kind === 'hls') hls.subtitleTrack = t.index
        }
      }

      const list = video.textTracks
      for (let i = 0; i < list.length; i++) {
        const tt = list[i]
        if (!tt) continue
        if (tt.kind !== 'subtitles' && tt.kind !== 'captions') continue
        const match =
          trackId !== null &&
          captionTracks.some(
            (c) => c.id === trackId && c.kind === 'native' && c.index === i,
          )
        tt.mode = match ? 'showing' : 'hidden'
      }
    },
    [captionTracks],
  )

  // Nova fila de URLs (outro episódio) → volta para a primeira candidata
  useEffect(() => {
    setSrcIndex(0)
  }, [src])

  const tryNextSrc = useCallback(() => {
    setSrcIndex((i) => {
      if (i + 1 < srcQueue.length) return i + 1
      return i
    })
  }, [srcQueue.length])

  useEffect(() => {
    void setFocus('PLAYER_PLAY')
    const video = videoRef.current
    if (!video || !activeSrc) return

    let cancelled = false
    let networkRetries = 0
    setError(undefined)
    setBuffering(true)
    setCaptionTracks([])
    setActiveCaptionId(null)
    setCueText('')
    setPaused(false)
    startApplied.current = false
    setChrome(true)
    armHide()

    // Limpa mídia anterior (troca de ep / remount) — evita travar no webOS
    try {
      hlsRef.current?.destroy()
    } catch {
      /* ignore */
    }
    hlsRef.current = null
    video.pause()
    video.removeAttribute('src')
    video.load()

    const failOrFallback = (msg: string) => {
      if (cancelled) return
      if (srcIndex + 1 < srcQueue.length) {
        tryNextSrc()
        return
      }
      setError(msg)
      setBuffering(false)
    }

    const play = () => {
      if (cancelled) return
      void video.play().then(
        () => {
          if (!cancelled) {
            setPaused(false)
            setBuffering(false)
          }
        },
        () => {
          if (!cancelled) setPaused(true)
        },
      )
    }

    const onAddTrack = () => {
      refreshTracks()
    }
    video.textTracks.addEventListener('addtrack', onAddTrack)

    if (looksLikeHls(activeSrc) && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        maxBufferLength: 24,
        maxMaxBufferLength: 48,
        startLevel: -1,
        xhrSetup: (xhr) => {
          // Alguns CDNs exigem referer do site; try/catch se o browser bloquear
          try {
            xhr.setRequestHeader('Referer', 'https://animefire.one/')
          } catch {
            /* ignore */
          }
        },
      })
      hlsRef.current = hls
      hls.loadSource(activeSrc)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return
        play()
        refreshTracks()
      })
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        if (!cancelled) refreshTracks()
      })
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (cancelled || !data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
          networkRetries += 1
          hls.startLoad()
          return
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && networkRetries < 2) {
          networkRetries += 1
          hls.recoverMediaError()
          return
        }
        failOrFallback('Não foi possível reproduzir este stream (HLS).')
      })
    } else if (
      looksLikeHls(activeSrc) &&
      video.canPlayType('application/vnd.apple.mpegurl')
    ) {
      video.src = activeSrc
      play()
      window.setTimeout(() => {
        if (!cancelled) refreshTracks()
      }, 800)
    } else {
      video.src = activeSrc
      play()
      window.setTimeout(() => {
        if (!cancelled) refreshTracks()
      }, 400)
    }

    return () => {
      cancelled = true
      video.textTracks.removeEventListener('addtrack', onAddTrack)
      try {
        hlsRef.current?.destroy()
      } catch {
        /* ignore */
      }
      hlsRef.current = null
      video.pause()
      video.removeAttribute('src')
      try {
        video.load()
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc, srcIndex])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeCaptionId) {
      setCueText('')
      return
    }
    const native = captionTracks.find(
      (c) => c.id === activeCaptionId && c.kind === 'native',
    )
    if (!native) return
    const track = video.textTracks[native.index]
    if (!track) return

    const onCue = () => {
      const cues = track.activeCues
      if (!cues || cues.length === 0) {
        setCueText('')
        return
      }
      const parts: string[] = []
      for (let i = 0; i < cues.length; i++) {
        const c = cues[i]
        if (
          c &&
          'text' in c &&
          typeof (c as TextTrackCue & { text?: string }).text === 'string'
        ) {
          parts.push((c as TextTrackCue & { text: string }).text)
        }
      }
      setCueText(parts.join('\n'))
    }
    track.addEventListener('cuechange', onCue)
    onCue()
    return () => {
      track.removeEventListener('cuechange', onCue)
    }
  }, [activeCaptionId, captionTracks])

  // Abrir/fechar painéis — sem rearmar chrome a cada mudança de lista
  useEffect(() => {
    if (epListOpen) {
      window.clearTimeout(hideTimer.current)
      setChrome(true)
      const el = videoRef.current
      if (el && !el.paused) {
        el.pause()
        setPaused(true)
      }
      window.requestAnimationFrame(() => {
        void setFocus(
          episodeId && filteredEpisodes.some((e) => e.id === episodeId)
            ? `PLAYER_EP_${episodeId}`
            : 'PLAYER_EP_CLOSE',
        )
      })
      return
    }
    if (capListOpen) {
      window.clearTimeout(hideTimer.current)
      setChrome(true)
      window.requestAnimationFrame(() => {
        void setFocus('PLAYER_CAP_OFF')
      })
      return
    }
    armHide()
    // Só reage a abrir/fechar painéis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epListOpen, capListOpen])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onMeta = () => {
      if (startApplied.current) return
      if (
        startAt > 5 &&
        Number.isFinite(el.duration) &&
        startAt < el.duration - 5
      ) {
        el.currentTime = startAt
      }
      startApplied.current = true
    }
    el.addEventListener('loadedmetadata', onMeta)
    if (el.readyState >= 1) onMeta()
    return () => {
      el.removeEventListener('loadedmetadata', onMeta)
    }
  }, [activeSrc, startAt])

  useEffect(() => {
    if (!onProgress) return
    const id = window.setInterval(() => {
      const el = videoRef.current
      if (!el || el.paused) return
      const dur = el.duration
      if (!Number.isFinite(dur) || dur <= 0) return
      onProgress(el.currentTime, dur)
    }, 5000)
    return () => {
      window.clearInterval(id)
    }
  }, [onProgress, activeSrc])

  useEffect(() => {
    return pushBackHandler(() => {
      if (capListOpen) {
        setCapListOpen(false)
        void setFocus('PLAYER_CC')
        return true
      }
      if (epListOpen) {
        setEpListOpen(false)
        void setFocus('PLAYER_EPS')
        return true
      }
      onClose()
      return true
    })
  }, [capListOpen, epListOpen, onClose])

  // Entrada explícita: teclado / clique. NÃO escuta mousemove global
  // (Magic Remote dispara move contínuo e faz o chrome piscar).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.keyCode === 461 || event.key === 'Escape') return
      if (
        event.key.startsWith('Arrow') ||
        event.key === 'Enter' ||
        event.key === ' ' ||
        event.keyCode === 13 ||
        event.keyCode === 32 ||
        event.keyCode === 412 ||
        event.keyCode === 417 ||
        event.keyCode === 19
      ) {
        revealChrome()
      }
    }
    const onPointer = () => {
      revealChrome()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [revealChrome])

  // Progresso via DOM (sem setState/s — evita re-render a 1Hz)
  useEffect(() => {
    const id = window.setInterval(() => {
      const el = videoRef.current
      if (!el) return
      const dur =
        el.duration && Number.isFinite(el.duration) ? el.duration : 0
      const cur = el.currentTime || 0
      const pct = dur > 0 ? Math.round((cur / dur) * 100) : 0
      if (fillRef.current) fillRef.current.style.width = `${String(pct)}%`
      if (timeCurRef.current) timeCurRef.current.textContent = formatTime(cur)
      if (timeDurRef.current) timeDurRef.current.textContent = formatTime(dur)
    }, 500)
    return () => {
      window.clearInterval(id)
    }
  }, [activeSrc])

  const togglePlay = () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
      setPaused(false)
      revealChrome()
    } else {
      el.pause()
      setPaused(true)
      window.clearTimeout(hideTimer.current)
      setChrome(true)
    }
  }

  const seekBy = (delta: number) => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = Math.max(
      0,
      Math.min(el.duration || 0, el.currentTime + delta),
    )
    revealChrome()
  }

  const canEpNav = episodes.length > 1
  const showPrev = Boolean(
    onPrevEpisode && (hasPrevEpisode !== undefined ? hasPrevEpisode : canEpNav),
  )
  const showNext = Boolean(
    onNextEpisode && (hasNextEpisode !== undefined ? hasNextEpisode : canEpNav),
  )
  const showList =
    episodes.length > 0 && typeof onSelectEpisode === 'function'
  const showCc = captionTracks.length > 0
  const ccOn = activeCaptionId !== null

  return (
    <div
      className={cx(styles.overlay, chromeVisible && styles.chromeVisible)}
    >
      <video
        ref={videoRef}
        className={styles.video}
        poster={poster}
        playsInline
        preload="auto"
        onPlay={() => {
          setPaused(false)
          setBuffering(false)
          // Não chama revealChrome: play automático/HLS não deve piscar o chrome.
          armHide()
        }}
        onPlaying={() => {
          setBuffering(false)
          setPaused(false)
        }}
        onWaiting={() => {
          setBuffering(true)
        }}
        onCanPlay={() => {
          setBuffering(false)
        }}
        onPause={() => {
          setPaused(true)
          window.clearTimeout(hideTimer.current)
          setChrome(true)
        }}
        onError={() => {
          if (srcIndex + 1 < srcQueue.length) {
            tryNextSrc()
            return
          }
          setBuffering(false)
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

      {buffering && !error ? (
        <div className={styles.buffering} aria-live="polite">
          <div className={styles.spinner} />
          <span>Carregando…</span>
        </div>
      ) : null}

      {cueText ? (
        <div className={styles.cueBox} aria-live="polite">
          {cueText}
        </div>
      ) : null}

      {!chromeVisible ? (
        <button
          type="button"
          className={styles.tapCatcher}
          aria-label="Mostrar controles"
          onClick={revealChrome}
        />
      ) : null}

      <div
        className={cx(styles.chrome, chromeVisible && styles.visible)}
        onMouseMove={bumpChrome}
      >
        <div className={styles.topMeta}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.bottom}>
          <Focusable
            focusKey="PLAYER_SEEK"
            className={styles.progressFocus}
            onArrowPress={(direction) => {
              if (direction === 'left') {
                seekBy(-10)
                return false
              }
              if (direction === 'right') {
                seekBy(10)
                return false
              }
              return true
            }}
          >
            <div className={styles.progressTrack}>
              <div ref={fillRef} className={styles.progressFill} style={{ width: '0%' }} />
            </div>
          </Focusable>
          <div className={styles.timeRow}>
            <span ref={timeCurRef}>0:00</span>
            <span ref={timeDurRef}>0:00</span>
          </div>

          <div className={styles.controls}>
            {canEpNav ? (
              <Focusable
                focusKey="PLAYER_PREV_EP"
                className={cx(styles.iconBtn, !showPrev && styles.iconBtnDisabled)}
                focusable={showPrev}
                onEnterPress={() => {
                  if (!showPrev) return
                  onPrevEpisode?.()
                  revealChrome()
                }}
              >
                <MediaIcons.PrevEp />
              </Focusable>
            ) : null}

            <Focusable
              focusKey="PLAYER_BACK_10"
              className={styles.iconBtn}
              onEnterPress={() => {
                seekBy(-10)
              }}
            >
              <span className={styles.seekStack}>
                <MediaIcons.SeekBack />
                <span className={styles.seekLabel}>10</span>
              </span>
            </Focusable>

            <Focusable
              focusKey="PLAYER_PLAY"
              className={styles.iconBtnPrimary}
              onEnterPress={togglePlay}
            >
              {paused ? (
                <MediaIcons.Play size={26} />
              ) : (
                <MediaIcons.Pause size={26} />
              )}
            </Focusable>

            <Focusable
              focusKey="PLAYER_FWD_10"
              className={styles.iconBtn}
              onEnterPress={() => {
                seekBy(10)
              }}
            >
              <span className={styles.seekStack}>
                <MediaIcons.SeekFwd />
                <span className={styles.seekLabel}>10</span>
              </span>
            </Focusable>

            {canEpNav ? (
              <Focusable
                focusKey="PLAYER_NEXT_EP"
                className={cx(styles.iconBtn, !showNext && styles.iconBtnDisabled)}
                focusable={showNext}
                onEnterPress={() => {
                  if (!showNext) return
                  onNextEpisode?.()
                  revealChrome()
                }}
              >
                <MediaIcons.NextEp />
              </Focusable>
            ) : null}

            {showList ? (
              <Focusable
                focusKey="PLAYER_EPS"
                className={styles.iconBtn}
                onEnterPress={() => {
                  setCapListOpen(false)
                  setEpListOpen(true)
                }}
              >
                <MediaIcons.Episodes />
              </Focusable>
            ) : null}

            {showCc ? (
              <Focusable
                focusKey="PLAYER_CC"
                className={cx(styles.iconBtn, ccOn && styles.iconBtnOn)}
                onEnterPress={() => {
                  setEpListOpen(false)
                  setCapListOpen(true)
                }}
              >
                {ccOn ? <MediaIcons.CaptionsOn /> : <MediaIcons.CaptionsOff />}
              </Focusable>
            ) : null}
          </div>
        </div>
      </div>

      {epListOpen && showList ? (
        <div className={styles.epModalBackdrop}>
          <div className={styles.epModal} data-scroll-y="player-eps">
            <p className={styles.sidePanelTitle}>Episódios</p>

            {audioKinds.length > 1 ? (
              <div className={styles.epFilters}>
                <Focusable
                  focusKey="PLAYER_EPA_all"
                  className={cx(
                    styles.epChip,
                    epAudioFilter === 'all' && styles.epChipActive,
                  )}
                  onEnterPress={() => {
                    setEpAudioFilter('all')
                  }}
                >
                  Todos
                </Focusable>
                {audioKinds.map((kind) => (
                  <Focusable
                    key={kind}
                    focusKey={`PLAYER_EPA_${kind}`}
                    className={cx(
                      styles.epChip,
                      epAudioFilter === kind && styles.epChipActive,
                    )}
                    onEnterPress={() => {
                      setEpAudioFilter(kind)
                    }}
                  >
                    {kind === 'dublado' ? 'Dublado' : 'Legendado'}
                  </Focusable>
                ))}
              </div>
            ) : null}

            {seasonsInList.length > 1 ? (
              <div className={styles.epFilters}>
                <Focusable
                  focusKey="PLAYER_EPS_all"
                  className={cx(
                    styles.epChip,
                    epSeasonFilter === 'all' && styles.epChipActive,
                  )}
                  onEnterPress={() => {
                    setEpSeasonFilter('all')
                  }}
                >
                  Temporadas
                </Focusable>
                {seasonsInList.map((n) => (
                  <Focusable
                    key={n}
                    focusKey={`PLAYER_EPS_${String(n)}`}
                    className={cx(
                      styles.epChip,
                      epSeasonFilter === n && styles.epChipActive,
                    )}
                    onEnterPress={() => {
                      setEpSeasonFilter(n)
                    }}
                  >
                    T{n}
                  </Focusable>
                ))}
              </div>
            ) : null}

            <div className={styles.sideList}>
              {filteredEpisodes.map((ep) => (
                <Focusable
                  key={ep.id}
                  focusKey={`PLAYER_EP_${ep.id}`}
                  className={cx(
                    styles.sideItem,
                    ep.id === episodeId && styles.sideItemActive,
                  )}
                  onEnterPress={() => {
                    onSelectEpisode?.(ep.id)
                    setEpListOpen(false)
                    revealChrome()
                  }}
                >
                  {ep.label}
                  {ep.audio ? (
                    <span className={styles.epAudioTag}>{ep.audio}</span>
                  ) : null}
                </Focusable>
              ))}
            </div>
            <Focusable
              focusKey="PLAYER_EP_CLOSE"
              className={styles.sideClose}
              onEnterPress={() => {
                setEpListOpen(false)
                void setFocus('PLAYER_EPS')
              }}
            >
              Fechar lista
            </Focusable>
          </div>
        </div>
      ) : null}

      {capListOpen && showCc ? (
        <aside className={styles.sidePanel} data-scroll-y="player-cc">
          <p className={styles.sidePanelTitle}>Legendas</p>
          <div className={styles.sideList}>
            <Focusable
              focusKey="PLAYER_CAP_OFF"
              className={cx(
                styles.sideItem,
                activeCaptionId === null && styles.sideItemActive,
              )}
              onEnterPress={() => {
                applyCaption(null)
                setCapListOpen(false)
                void setFocus('PLAYER_CC')
                revealChrome()
              }}
            >
              Desligadas
            </Focusable>
            {captionTracks.map((t) => (
              <Focusable
                key={t.id}
                focusKey={`PLAYER_CAP_${t.id}`}
                className={cx(
                  styles.sideItem,
                  t.id === activeCaptionId && styles.sideItemActive,
                )}
                onEnterPress={() => {
                  applyCaption(t.id)
                  setCapListOpen(false)
                  void setFocus('PLAYER_CC')
                  revealChrome()
                }}
              >
                {t.label}
              </Focusable>
            ))}
          </div>
          <Focusable
            focusKey="PLAYER_CAP_CLOSE"
            className={styles.sideClose}
            onEnterPress={() => {
              setCapListOpen(false)
              void setFocus('PLAYER_CC')
            }}
          >
            Fechar
          </Focusable>
        </aside>
      ) : null}
    </div>
  )
}
