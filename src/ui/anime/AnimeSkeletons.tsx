import { cx } from '@/ui/cx'
import styles from '@/ui/screens/LibraryScreen.module.css'

/** Skeleton do banner + fileiras (Início). */
export function AnimeHomeSkeleton() {
  return (
    <div className={styles.skelHome} aria-hidden>
      <div className={cx('skeleton', styles.skelBanner)} />
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row} className={styles.skelRow}>
          <div className={cx('skeleton', styles.skelRowTitle)} />
          <div className={styles.skelRowCards}>
            {Array.from({ length: 8 }).map((__, i) => (
              <div
                key={i}
                className={cx('skeleton', styles.skeletonCard)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Skeleton de grade de posters (categoria / busca). */
export function AnimeGridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className={styles.skelGrid} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cx('skeleton', styles.skeletonCard)} />
      ))}
    </div>
  )
}

/** Skeleton do hub de catálogo (tiles + gêneros). */
export function AnimeCatalogSkeleton() {
  return (
    <div className={styles.skelCatalog} aria-hidden>
      <div className={cx('skeleton', styles.skelRowTitle)} />
      <div className={styles.skelCatGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cx('skeleton', styles.skelCatTile)} />
        ))}
      </div>
      <div className={cx('skeleton', styles.skelRowTitle)} />
      <div className={styles.skelRowCards}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={cx('skeleton', styles.skelGenreTile)} />
        ))}
      </div>
    </div>
  )
}

/** Skeleton do painel de detalhes. */
export function AnimeDetailSkeleton() {
  return (
    <div className={styles.skelDetail} aria-hidden>
      <div className={cx('skeleton', styles.skelDetailPoster)} />
      <div className={styles.skelDetailMeta}>
        <div className={cx('skeleton', styles.skelDetailLineLg)} />
        <div className={cx('skeleton', styles.skelDetailLine)} />
        <div className={cx('skeleton', styles.skelDetailLine)} />
        <div className={cx('skeleton', styles.skelDetailBlock)} />
      </div>
      <div className={styles.skelEpList}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cx('skeleton', styles.skelEpItem)} />
        ))}
      </div>
    </div>
  )
}
