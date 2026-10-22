import type { WatchEntry } from '@/domain/types'
import { imageUrl } from '@/services/tmdb'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './Hero.module.css'

interface HeroProps {
  entry?: WatchEntry
  onContinue: (entry: WatchEntry) => void
  onMarkFinished: (entry: WatchEntry) => void
}

export function Hero({ entry, onContinue, onMarkFinished }: HeroProps) {
  if (!entry) {
    return (
      <Focusable focusKey="HERO" className={styles.hero}>
        <div className={styles.empty}>
          <p>
            Nada em andamento. Abra um título ou importe o CSV da Netflix em
            Configurações.
          </p>
        </div>
      </Focusable>
    )
  }

  const backdrop = imageUrl(entry.backdropPath ?? entry.posterPath, 'w780')
  const episodeLabel =
    entry.mediaType === 'tv' && (entry.season || entry.episode)
      ? `T${String(entry.season ?? 1)} E${String(entry.episode ?? 1)}`
      : null

  return (
    <Focusable focusKey="HERO" className={styles.hero} saveLastFocusedChild>
      {backdrop ? (
        <img
          className={styles.backdrop}
          src={backdrop}
          alt=""
          width={1280}
          height={720}
          decoding="async"
        />
      ) : null}
      <div className={styles.overlay} />
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
            Continuar
          </Focusable>
          <Focusable
            focusKey="HERO_DONE"
            className={cx(styles.btn, styles.btnGhost)}
            onEnterPress={() => {
              onMarkFinished(entry)
            }}
          >
            Marcar concluído
          </Focusable>
        </div>
      </div>
    </Focusable>
  )
}
