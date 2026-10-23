import { useCallback, useRef, useState } from 'react'
import type { CatalogItem, ContentRow, WatchEntry } from '@/domain/types'
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
  onMoreInfoEntry: (entry: WatchEntry) => void
}

/** Distância de scroll (px) para recolher o banner por completo. */
const HERO_COLLAPSE_RANGE = 280

export function HomeScreen({
  rows,
  loading,
  error,
  onOpenItem,
  onContinueEntry,
  onMoreInfoEntry,
}: HomeScreenProps) {
  const markFinished = useHistoryStore((s) => s.markFinished)
  const entries = useHistoryStore((s) => s.entries)
  const rowsRef = useRef<HTMLDivElement>(null)
  const [collapse, setCollapse] = useState(0)
  const rafRef = useRef(0)

  const hero = entries
    .filter((e) => !e.finished)
    .sort(
      (a, b) =>
        new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
    )[0]

  const catalogRows = rows.filter((row) => row.id !== 'continue' || Boolean(hero))

  const syncCollapse = useCallback(() => {
    const el = rowsRef.current
    if (!el) return
    const next = Math.min(1, Math.max(0, el.scrollTop / HERO_COLLAPSE_RANGE))
    // Threshold maior = menos re-renders do Hero durante o scroll.
    setCollapse((prev) => (Math.abs(prev - next) < 0.05 ? prev : next))
  }, [])

  const onRowsScroll = () => {
    if (rafRef.current) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0
      syncCollapse()
    })
  }

  const expandHero = () => {
    const el = rowsRef.current
    if (!el) return
    el.scrollTo({ top: 0 })
    setCollapse(0)
  }

  return (
    <Focusable focusKey="VIEW_home" className={styles.home} saveLastFocusedChild>
      {hero ? (
        <Hero
          entry={hero}
          collapse={collapse}
          onFocusHero={expandHero}
          onContinue={onContinueEntry}
          onMoreInfo={onMoreInfoEntry}
          onMarkFinished={(entry) => {
            markFinished(entry.id, true)
          }}
        />
      ) : null}

      <div
        ref={rowsRef}
        className={styles.rows}
        data-scroll-y="catalog"
        onScroll={onRowsScroll}
      >
        {loading ? (
          <div className={styles.skeletons}>
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className={styles.skeletonRow}>
                <div className={cx('skeleton', styles.skeletonTitle)} />
                <div className={styles.skeletonCards}>
                  {Array.from({ length: 7 }).map((__, i) => (
                    <div
                      key={i}
                      className={cx('skeleton', styles.skeletonCard)}
                    />
                  ))}
                </div>
              </div>
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
