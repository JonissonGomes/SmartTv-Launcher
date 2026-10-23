import { memo } from 'react'
import type { CatalogItem } from '@/domain/types'
import { Card } from '@/ui/Card/Card'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './Row.module.css'

interface RowProps {
  id: string
  title: string
  items: CatalogItem[]
  onSelect: (item: CatalogItem) => void
}

/** Fileira horizontal — cards memoizados; content-visibility no CSS. */
function RowInner({ id, title, items, onSelect }: RowProps) {
  if (items.length === 0) return null

  const limit = id.startsWith('top10') ? 10 : 12
  const visible = items.slice(0, limit)

  return (
    <Focusable
      focusKey={`ROW_${id}`}
      className={styles.row}
      saveLastFocusedChild
    >
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.viewport} data-scroll-x="row">
        <div className={styles.scroller}>
          {visible.map((item) => (
            <Card
              key={`${item.mediaType}-${String(item.tmdbId)}`}
              item={item}
              focusKey={`ROW_${id}_CARD_${String(item.tmdbId)}`}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </Focusable>
  )
}

export const Row = memo(RowInner)
