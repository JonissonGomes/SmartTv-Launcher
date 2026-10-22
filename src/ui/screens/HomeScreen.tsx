import type { CatalogItem, WatchEntry } from '@/domain/types'
import type { ContentRow } from '@/domain/types'
import { useHistoryStore } from '@/store/history'
import { Hero } from '@/ui/Hero/Hero'
import { Row } from '@/ui/Row/Row'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './HomeScreen.module.css'

interface HomeScreenProps {
  rows: ContentRow[]
  loading: boolean
  error?: string
  onOpenItem: (item: CatalogItem) => void
  onContinueEntry: (entry: WatchEntry) => void
}

export function HomeScreen({
  rows,
  loading,
  error,
  onOpenItem,
  onContinueEntry,
}: HomeScreenProps) {
  const markFinished = useHistoryStore((s) => s.markFinished)
  const entries = useHistoryStore((s) => s.entries)
  const hero = entries
    .filter((e) => !e.finished)
    .sort(
      (a, b) =>
        new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
    )[0]

  const catalogRows = rows.filter((row) => row.id !== 'continue' || Boolean(hero))

  return (
    <Focusable focusKey="VIEW_home" className={styles.home} saveLastFocusedChild>
      {hero ? (
        <Hero
          entry={hero}
          onContinue={onContinueEntry}
          onMarkFinished={(entry) => {
            markFinished(entry.id, true)
          }}
        />
      ) : null}

      <div className={styles.rows}>
        {loading ? (
          <div className={styles.skeletons}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cx('skeleton', styles.skeletonCard)} />
            ))}
          </div>
        ) : null}

        {error ? <p className="error-state">{error}</p> : null}

        {catalogRows.map((row) => (
          <Row
            key={row.id}
            id={row.id}
            title={row.title}
            items={row.items}
            onSelect={onOpenItem}
          />
        ))}
      </div>
    </Focusable>
  )
}
