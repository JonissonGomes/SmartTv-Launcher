import { APP_CONFIGS } from '@/config/apps'
import type { CatalogItem, Platform } from '@/domain/types'
import { imageUrl } from '@/services/tmdb'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './Card.module.css'

interface CardProps {
  item: CatalogItem
  focusKey: string
  onSelect: (item: CatalogItem) => void
}

export function Card({ item, focusKey, onSelect }: CardProps) {
  const poster = imageUrl(item.posterPath, 'w342')

  return (
    <Focusable
      focusKey={focusKey}
      className={styles.card}
      onEnterPress={() => {
        onSelect(item)
      }}
    >
      {poster ? (
        <img
          className={styles.poster}
          src={poster}
          alt=""
          width={184}
          height={272}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={styles.placeholder}>{item.title}</div>
      )}
      <div className={styles.meta}>
        <p className={styles.title}>{item.title}</p>
        <p className={styles.sub}>
          <span>{item.voteAverage > 0 ? item.voteAverage.toFixed(1) : '—'}</span>
          {item.platforms.map((p) => (
            <span
              key={p}
              className={styles.platformDot}
              style={{ background: APP_CONFIGS[p as Platform].color }}
              title={APP_CONFIGS[p as Platform].label}
            />
          ))}
        </p>
      </div>
    </Focusable>
  )
}
