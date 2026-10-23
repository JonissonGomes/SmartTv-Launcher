import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { youtubeThumbUrl } from '@/services/tmdb'
import { isWebOsRuntime } from '@/services/webos'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './TrailerPlayer.module.css'

interface TrailerPlayerProps {
  youtubeKey: string
  title: string
  onClose: () => void
  onOpenYoutubeApp: () => void
}

/**
 * webOS: embed YouTube falha (erro 153) → thumbnail + app YouTube.
 * Dev/browser: tenta iframe; fallback igual.
 */
export function TrailerPlayer({
  youtubeKey,
  title,
  onClose,
  onOpenYoutubeApp,
}: TrailerPlayerProps) {
  const onTv = isWebOsRuntime()
  const [mode, setMode] = useState<'tv' | 'embed' | 'failed'>(
    onTv ? 'tv' : 'embed',
  )

  useEffect(() => {
    void setFocus(mode === 'embed' ? 'TRAILER_CLOSE' : 'TRAILER_PLAY_YT')
  }, [mode])

  useEffect(() => {
    if (mode !== 'embed') return
    const timer = window.setTimeout(() => {
      setMode('failed')
    }, 10_000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [mode, youtubeKey])

  const thumb = youtubeThumbUrl(youtubeKey)
  const embedSrc =
    `https://www.youtube-nocookie.com/embed/${youtubeKey}` +
    `?autoplay=1&rel=0&modestbranding=1&playsinline=1`

  return (
    <div className={styles.wrap}>
      {mode === 'embed' ? (
        <iframe
          className={styles.frame}
          src={embedSrc}
          title={`Trailer — ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => {
            setMode('failed')
          }}
        />
      ) : (
        <div className={styles.fallback}>
          {thumb ? (
            <img className={styles.thumb} src={thumb} alt="" />
          ) : null}
          <p className={styles.fallbackTitle}>{title}</p>
          <p>
            {onTv || mode === 'tv'
              ? 'Na TV o trailer abre no app YouTube (embed bloqueado pela LG).'
              : 'Player embutido indisponível. Use o app YouTube.'}
          </p>
          <Focusable
            focusKey="TRAILER_PLAY_YT"
            className={styles.fallbackBtn}
            onEnterPress={onOpenYoutubeApp}
          >
            Reproduzir trailer no YouTube
          </Focusable>
        </div>
      )}

      <div className={styles.bar}>
        <Focusable
          focusKey="TRAILER_CLOSE"
          className={styles.closeBtn}
          onEnterPress={onClose}
        >
          Fechar
        </Focusable>
        {mode === 'embed' ? (
          <Focusable
            focusKey="TRAILER_YT_APP"
            className={styles.ghostBtn}
            onEnterPress={onOpenYoutubeApp}
          >
            Abrir no app YouTube
          </Focusable>
        ) : null}
      </div>
    </div>
  )
}
