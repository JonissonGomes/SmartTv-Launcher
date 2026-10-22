import type { CatalogItem } from '@/domain/types'
import { imageUrl } from '@/services/tmdb'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './Card.module.css'

interface CardProps {
  item: CatalogItem
  focusKey: string
  onSelect: (item: CatalogItem) => void
  /** grid = mosaico 16:9; row = pôster vertical nas fileiras */
  layout?: 'row' | 'grid'
}

export function Card({
  item,
  focusKey,
  onSelect,
  layout = 'row',
}: CardProps) {
  const src =
    layout === 'grid'
      ? imageUrl(item.backdropPath ?? item.posterPath, 'w780')
      : imageUrl(item.posterPath, 'w342')
  const rating = item.voteAverage > 0 ? item.voteAverage.toFixed(1) : null

  return (
    <Focusable
      focusKey={focusKey}
      className={cx(styles.card, layout === 'grid' && styles.cardGrid)}
      onEnterPress={() => {
        onSelect(item)
      }}
    >
      {src ? (
        <img
          className={styles.poster}
          src={src}
          alt={item.title}
          width={layout === 'grid' ? 320 : 192}
          height={layout === 'grid' ? 180 : 280}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={styles.placeholder} title={item.title}>
          {item.title}
        </div>
      )}
      {rating ? <span className={styles.rating}>{rating}</span> : null}
    </Focusable>
  )
}
