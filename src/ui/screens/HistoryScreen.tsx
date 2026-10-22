import { useHistoryStore } from '@/store/history'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './HistoryScreen.module.css'

interface HistoryScreenProps {
  onContinueId: (id: string) => void
}

export function HistoryScreen({ onContinueId }: HistoryScreenProps) {
  const entries = useHistoryStore((s) => s.entries)
  const markFinished = useHistoryStore((s) => s.markFinished)
  const removeEntry = useHistoryStore((s) => s.removeEntry)
  const updateEntry = useHistoryStore((s) => s.updateEntry)

  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
  )

  return (
    <Focusable focusKey="VIEW_history" className={styles.screen} saveLastFocusedChild>
      {sorted.length === 0 ? (
        <p className="empty-state">Histórico vazio.</p>
      ) : (
        <div className={styles.list}>
          {sorted.map((entry) => (
            <Focusable
              key={entry.id}
              focusKey={`HISTORY_${entry.id}`}
              className={styles.item}
              saveLastFocusedChild
            >
              <div className={styles.meta}>
                <h3>{entry.title}</h3>
                <p>
                  {entry.platform} · {entry.mediaType}
                  {entry.season
                    ? ` · T${String(entry.season)}E${String(entry.episode ?? 1)}`
                    : ''}
                  {entry.finished ? ' · concluído' : ''}
                </p>
              </div>
              <div className={styles.actions}>
                <Focusable
                  focusKey={`HISTORY_${entry.id}_OPEN`}
                  className={styles.action}
                  onEnterPress={() => {
                    onContinueId(entry.id)
                  }}
                >
                  Abrir
                </Focusable>
                <Focusable
                  focusKey={`HISTORY_${entry.id}_EP`}
                  className={styles.action}
                  onEnterPress={() => {
                    updateEntry(entry.id, {
                      episode: (entry.episode ?? 0) + 1,
                      season: entry.season ?? 1,
                      mediaType: 'tv',
                    })
                  }}
                >
                  +Ep
                </Focusable>
                <Focusable
                  focusKey={`HISTORY_${entry.id}_DONE`}
                  className={styles.action}
                  onEnterPress={() => {
                    markFinished(entry.id, !entry.finished)
                  }}
                >
                  {entry.finished ? 'Reabrir' : 'Concluir'}
                </Focusable>
                <Focusable
                  focusKey={`HISTORY_${entry.id}_DEL`}
                  className={styles.action}
                  onEnterPress={() => {
                    removeEntry(entry.id)
                  }}
                >
                  Remover
                </Focusable>
              </div>
            </Focusable>
          ))}
        </div>
      )}
    </Focusable>
  )
}
