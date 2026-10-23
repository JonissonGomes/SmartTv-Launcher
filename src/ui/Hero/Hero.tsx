import { useEffect, useState, type CSSProperties } from 'react'
import type { WatchEntry } from '@/domain/types'
import { getTrailerYoutubeKey } from '@/services/tmdb'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { TrailerArt } from '@/ui/media/TrailerArt'
import styles from './Hero.module.css'

interface HeroProps {
  entry: WatchEntry
  onContinue: (entry: WatchEntry) => void
  onMarkFinished: (entry: WatchEntry) => void
  onMoreInfo: (entry: WatchEntry) => void
  /** 0 = totalmente visível, 1 = recolhido */
  collapse?: number
  onFocusHero?: () => void
}

export function Hero({
  entry,
  onContinue,
  onMarkFinished,
  onMoreInfo,
  collapse = 0,
  onFocusHero,
}: HeroProps) {
  const [trailerKey, setTrailerKey] = useState<string>()
  const episodeLabel =
    entry.mediaType === 'tv' && (entry.season || entry.episode)
      ? `T${String(entry.season ?? 1)} E${String(entry.episode ?? 1)}`
      : null
  const rating =
    entry.voteAverage && entry.voteAverage > 0
      ? entry.voteAverage.toFixed(1)
      : null

  const clamped = Math.min(1, Math.max(0, collapse))
  const collapsedAway = clamped >= 0.92

  useEffect(() => {
    let cancelled = false
    setTrailerKey(undefined)
    if (!entry.tmdbId) return

    void (async () => {
      const key = await getTrailerYoutubeKey(
        entry.mediaType,
        entry.tmdbId as number,
      )
      if (!cancelled) setTrailerKey(key)
    })()

    return () => {
      cancelled = true
    }
  }, [entry.mediaType, entry.tmdbId])

  return (
    <Focusable
      focusKey="HERO"
      className={cx(styles.hero, collapsedAway && styles.heroGone)}
      style={
        {
          '--hero-collapse': String(clamped),
        } as CSSProperties
      }
      saveLastFocusedChild
      onFocus={() => {
        onFocusHero?.()
      }}
    >
      <TrailerArt
        className={styles.backdrop}
        backdropPath={entry.backdropPath}
        posterPath={entry.posterPath}
        youtubeKey={trailerKey}
      />
      <div className={styles.overlay} />
      {rating ? <span className={styles.rating}>{rating}</span> : null}
      <div className={styles.body}>
        <p className={styles.kicker}>Continuar de onde parei</p>
        <h2 className={styles.title}>{entry.title}</h2>
        <p className={styles.overview}>
          {[entry.platform.toUpperCase(), episodeLabel, entry.overview]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className={styles.actions}>
          <Focusable
            focusKey="HERO_CONTINUE"
            className={styles.btn}
            onEnterPress={() => {
              onContinue(entry)
            }}
          >
            Assistir
          </Focusable>
          <Focusable
            focusKey="HERO_INFO"
            className={cx(styles.btn, styles.btnGhost)}
            onEnterPress={() => {
              onMoreInfo(entry)
            }}
          >
            Mais informações
          </Focusable>
          <Focusable
            focusKey="HERO_DONE"
            className={cx(styles.btn, styles.btnGhost)}
            onEnterPress={() => {
              onMarkFinished(entry)
            }}
          >
            Concluído
          </Focusable>
        </div>
      </div>
    </Focusable>
  )
}
