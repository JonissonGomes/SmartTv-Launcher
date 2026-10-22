import type { CatalogItem, WatchEntry } from '@/domain/types'
import { useCatalog } from '@/hooks/useCatalog'
import { useHistoryStore } from '@/store/history'
import { useSettingsStore } from '@/store/settings'
import { Hero } from '@/ui/Hero/Hero'
import { Row } from '@/ui/Row/Row'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './HomeScreen.module.css'

interface HomeScreenProps {
  onOpenItem: (item: CatalogItem) => void
  onContinueEntry: (entry: WatchEntry) => void
}

export function HomeScreen({ onOpenItem, onContinueEntry }: HomeScreenProps) {
  const entries = useHistoryStore((s) => s.entries)
  const markFinished = useHistoryStore((s) => s.markFinished)
  const ownedPlatforms = useSettingsStore((s) => s.ownedPlatforms)
  const { loading, error, rows } = useCatalog(entries, ownedPlatforms)
  const hero = entries
    .filter((e) => !e.finished)
    .sort(
      (a, b) =>
        new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
    )[0]

  return (
    <Focusable focusKey="VIEW_home" className={styles.home} saveLastFocusedChild>
      <Hero
        entry={hero}
        onContinue={onContinueEntry}
        onMarkFinished={(entry) => {
          markFinished(entry.id, true)
        }}
      />

      <div className={styles.rows}>
        {loading ? (
          <div className={styles.skeletons}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cx('skeleton', styles.skeletonCard)} />
            ))}
          </div>
        ) : null}

        {error ? <p className="error-state">{error}</p> : null}

        {!loading && rows.length === 0 && !error ? (
          <p className="empty-state">
            Sem recomendações ainda. Assista algo ou configure a chave TMDB.
          </p>
        ) : null}

        {rows.map((row) => (
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
