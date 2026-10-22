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

/** Fileira horizontal simples (sem virtualizar) — mais estável no Simulator/webOS. */
export function Row({ id, title, items, onSelect }: RowProps) {
  if (items.length === 0) return null

  const visible = items.slice(0, 12)

  return (
    <Focusable
      focusKey={`ROW_${id}`}
      className={styles.row}
      saveLastFocusedChild
    >
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.viewport}>
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
