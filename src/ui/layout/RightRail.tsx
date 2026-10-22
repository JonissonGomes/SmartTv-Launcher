import type { WatchEntry } from '@/domain/types'
import { imageUrl } from '@/services/tmdb'
import { useHistoryStore } from '@/store/history'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './RightRail.module.css'

interface RightRailProps {
  onContinue: (entry: WatchEntry) => void
}

export function RightRail({ onContinue }: RightRailProps) {
  const entries = useHistoryStore((s) => s.entries)
  const continuing = entries
    .filter((e) => !e.finished)
    .sort(
      (a, b) =>
        new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
    )
    .slice(0, 5)

  return (
    <Focusable focusKey="RIGHT_RAIL" className={styles.rail} saveLastFocusedChild>
      <div className={styles.profile}>
        <div className={styles.profileMeta}>
          <strong>Jonis</strong>
          <span>Perfil local</span>
        </div>
        <div className={styles.avatar}>J</div>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Continuar</h2>
        {continuing.length === 0 ? (
          <p className={styles.empty}>Nada em andamento.</p>
        ) : (
          <div className={styles.list}>
            {continuing.map((entry) => {
              const thumb = imageUrl(entry.posterPath ?? entry.backdropPath, 'w342')
              const progress = entry.progressPct ?? 35
              return (
                <Focusable
                  key={entry.id}
                  focusKey={`RAIL_CONTINUE_${entry.id}`}
                  className={styles.continueCard}
                  onEnterPress={() => {
                    onContinue(entry)
                  }}
                >
                  {thumb ? (
                    <img className={styles.thumb} src={thumb} alt="" loading="lazy" />
                  ) : (
                    <div className={styles.thumb} />
                  )}
                  <div className={styles.continueMeta}>
                    <h3>{entry.title}</h3>
                    <p>{entry.platform}</p>
                    <div className={styles.progress}>
                      <span style={{ width: `${String(progress)}%` }} />
                    </div>
                    <span className={styles.watchBtn}>Assistir</span>
                  </div>
                </Focusable>
              )
            })}
          </div>
        )}
      </section>
    </Focusable>
  )
}
