import type { AfAnime } from '@/domain/animefire'
import { Focusable } from '@/ui/focus/Focusable'
import styles from '@/ui/screens/LibraryScreen.module.css'

export interface AnimeRowItem {
  id: string
  name: string
  posterUrl?: string
  subtitle?: string
  streamUrl?: string
  badge?: string
}

export function AnimeRow({
  id,
  title,
  items,
  onSelect,
}: {
  id: string
  title: string
  items: AnimeRowItem[]
  onSelect: (item: AnimeRowItem) => void
}) {
  if (items.length === 0) return null
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.viewport} data-scroll-x="row">
        <div className={styles.scroller}>
          {items.map((item) => (
            <Focusable
              key={`${id}-${item.id}`}
              focusKey={`ANIME_ROW_${id}_${item.id}`}
              className={styles.posterCard}
              onEnterPress={() => {
                onSelect(item)
              }}
            >
              <PosterFace item={item} />
              <span className={styles.cardTitle}>{item.name}</span>
            </Focusable>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PosterGrid({
  id,
  items,
  onSelect,
}: {
  id: string
  items: AfAnime[]
  onSelect: (item: AfAnime) => void
}) {
  if (items.length === 0) return null
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <Focusable
          key={`${id}-${item.id}`}
          focusKey={`ANIME_GRID_${id}_${item.id}`}
          className={styles.posterCard}
          onEnterPress={() => {
            onSelect(item)
          }}
        >
          <PosterFace
            item={{
              id: item.id,
              name: item.name,
              posterUrl: item.posterUrl,
              badge: item.mostLiked ? 'TOP' : undefined,
            }}
          />
          <span className={styles.cardTitle}>{item.name}</span>
        </Focusable>
      ))}
    </div>
  )
}

function PosterFace({ item }: { item: AnimeRowItem }) {
  return (
    <div className={styles.posterWrap}>
      {item.posterUrl ? (
        <img
          className={styles.poster}
          src={item.posterUrl}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={styles.posterFallback}>{item.name}</div>
      )}
      {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
    </div>
  )
}
