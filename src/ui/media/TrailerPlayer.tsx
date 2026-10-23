import { useEffect, useState } from 'react'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './TrailerPlayer.module.css'

interface TrailerPlayerProps {
  youtubeKey: string
  title: string
  onClose: () => void
  /** Fallback: abrir no app YouTube da TV. */
  onOpenYoutubeApp: () => void
}

/**
 * Player embutido via youtube-nocookie.
 * Em webOS antigo pode falhar (erro 153) — aí oferecemos abrir o app YouTube.
 */
export function TrailerPlayer({
  youtubeKey,
  title,
  onClose,
  onOpenYoutubeApp,
}: TrailerPlayerProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Se o iframe não “acordar”, após 12s sugerimos fallback.
      // (não há onError confiável no embed do YouTube)
    }, 12_000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [youtubeKey])

  const src =
    `https://www.youtube-nocookie.com/embed/${youtubeKey}` +
    `?autoplay=1&rel=0&modestbranding=1&playsinline=1&fs=1`

  return (
    <div className={styles.wrap}>
      {!failed ? (
        <iframe
          className={styles.frame}
          src={src}
          title={`Trailer — ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => {
            setFailed(true)
          }}
        />
      ) : (
        <div className={styles.fallback}>
          <p>O player embutido não está disponível neste aparelho.</p>
          <Focusable
            focusKey="TRAILER_FALLBACK_YT"
            className={styles.fallbackBtn}
            onEnterPress={onOpenYoutubeApp}
          >
            Abrir no YouTube
          </Focusable>
        </div>
      )}

      <div className={styles.bar}>
        <Focusable
          focusKey="TRAILER_CLOSE"
          className={styles.closeBtn}
          onEnterPress={onClose}
        >
          Fechar trailer
        </Focusable>
        <Focusable
          focusKey="TRAILER_YT_APP"
          className={styles.ghostBtn}
          onEnterPress={() => {
            setFailed(true)
            onOpenYoutubeApp()
          }}
        >
          Abrir no app YouTube
        </Focusable>
      </div>
    </div>
  )
}
