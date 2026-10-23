import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useRef, useState } from 'react'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './VideoPlayer.module.css'

interface VideoPlayerProps {
  title: string
  subtitle?: string
  src: string
  poster?: string
  onClose: () => void
}

/** Player fullscreen nativo do launcher (sem browser / ads). */
export function VideoPlayer({
  title,
  subtitle,
  src,
  poster,
  onClose,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string>()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void setFocus('PLAYER_PLAY')
    const video = videoRef.current
    if (!video) return
    void video.play().catch(() => {
      setPaused(true)
    })
  }, [src])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.keyCode === 461 || event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1)
    }, 500)
    return () => {
      window.clearInterval(id)
    }
  }, [])

  const video = videoRef.current
  const duration = video?.duration && Number.isFinite(video.duration) ? video.duration : 0
  const current = video?.currentTime ?? 0
  const progress = duration > 0 ? current / duration : 0

  void tick

  const togglePlay = () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
      setPaused(false)
    } else {
      el.pause()
      setPaused(true)
    }
  }

  const seekBy = (delta: number) => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta))
    setTick((t) => t + 1)
  }

  return (
    <div className={styles.overlay}>
      <video
        ref={videoRef}
        className={styles.video}
        src={src}
        poster={poster}
        playsInline
        autoPlay
        onPlay={() => {
          setPaused(false)
        }}
        onPause={() => {
          setPaused(true)
        }}
        onError={() => {
          setError('Não foi possível reproduzir este vídeo.')
        }}
        onEnded={onClose}
      />

      <div className={styles.chrome}>
        <div className={styles.meta}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${String(Math.round(progress * 100))}%` }}
          />
        </div>

        <div className={styles.controls}>
          <Focusable
            focusKey="PLAYER_BACK_10"
            className={styles.btn}
            onEnterPress={() => {
              seekBy(-10)
            }}
          >
            −10s
          </Focusable>
          <Focusable
            focusKey="PLAYER_PLAY"
            className={styles.btnPrimary}
            onEnterPress={togglePlay}
          >
            {paused ? 'Play' : 'Pause'}
          </Focusable>
          <Focusable
            focusKey="PLAYER_FWD_10"
            className={styles.btn}
            onEnterPress={() => {
              seekBy(10)
            }}
          >
            +10s
          </Focusable>
          <Focusable
            focusKey="PLAYER_CLOSE"
            className={styles.btn}
            onEnterPress={onClose}
          >
            Fechar
          </Focusable>
        </div>
      </div>
    </div>
  )
}
