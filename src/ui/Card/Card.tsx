import type { CatalogItem } from '@/domain/types'
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
  const rating = item.voteAverage > 0 ? item.voteAverage.toFixed(1) : null

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
          width={192}
          height={280}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={styles.placeholder}>{item.title}</div>
      )}
      {rating ? <span className={styles.rating}>{rating}</span> : null}
      <span className={styles.play} aria-hidden>
        ▶
      </span>
      <div className={styles.meta}>
        <p className={styles.title}>{item.title}</p>
      </div>
    </Focusable>
  )
}
