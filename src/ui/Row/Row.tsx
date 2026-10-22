import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
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

const CARD_SIZE = 200

export function Row({ id, title, items, onSelect }: RowProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_SIZE,
    horizontal: true,
    overscan: 4,
  })

  if (items.length === 0) return null

  return (
    <Focusable
      focusKey={`ROW_${id}`}
      className={styles.row}
      saveLastFocusedChild
    >
      <h2 className={styles.title}>{title}</h2>
      <div ref={parentRef} className={styles.viewport}>
        <div
          className={styles.scroller}
          style={{
            width: `${String(virtualizer.getTotalSize())}px`,
            position: 'relative',
            height: 'var(--card-height)',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = items[virtualItem.index]
            if (!item) return null
            return (
              <div
                key={item.tmdbId}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${String(virtualItem.size)}px`,
                  height: '100%',
                  transform: `translateX(${String(virtualItem.start)}px)`,
                }}
              >
                <Card
                  item={item}
                  focusKey={`ROW_${id}_CARD_${String(item.tmdbId)}`}
                  onSelect={onSelect}
                />
              </div>
            )
          })}
        </div>
      </div>
    </Focusable>
  )
}
