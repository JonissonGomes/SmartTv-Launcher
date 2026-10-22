import type { CatalogItem } from '@/domain/types'
import { Card } from '@/ui/Card/Card'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './CatalogGrid.module.css'

interface CatalogGridProps {
  id: string
  items: CatalogItem[]
  onSelect: (item: CatalogItem) => void
  title?: string
}

/** Grade/mosaico de pôsteres — mais títulos visíveis que a fileira horizontal. */
export function CatalogGrid({ id, items, onSelect, title }: CatalogGridProps) {
  if (items.length === 0) return null

  return (
    <Focusable
      focusKey={`GRID_${id}`}
      className={styles.wrap}
      saveLastFocusedChild
    >
      {title ? <h2 className={styles.title}>{h2Title(title, items.length)}</h2> : null}
      <div className={styles.grid}>
        {items.map((item) => (
          <Card
            key={`${item.mediaType}-${String(item.tmdbId)}`}
            item={item}
            layout="grid"
            focusKey={`GRID_${id}_CARD_${String(item.tmdbId)}`}
            onSelect={onSelect}
          />
        ))}
      </div>
    </Focusable>
  )
}

function h2Title(title: string, count: number): string {
  return `${title} · ${String(count)}`
}
