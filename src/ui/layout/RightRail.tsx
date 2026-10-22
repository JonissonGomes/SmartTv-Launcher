import type { CatalogItem, WatchEntry } from '@/domain/types'
import type { RailInsights } from '@/hooks/useHomeFeed'
import { imageUrl } from '@/services/tmdb'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './RightRail.module.css'

interface RightRailProps {
  continuing: WatchEntry[]
  rail: RailInsights
  onContinue: (entry: WatchEntry) => void
  onOpenItem: (item: CatalogItem) => void
}

export function RightRail({
  continuing,
  rail,
  onContinue,
  onOpenItem,
}: RightRailProps) {
  return (
    <aside className={styles.rail}>
      <Focusable focusKey="RIGHT_RAIL" className={styles.railInner} saveLastFocusedChild>
        <div className={styles.profile}>
          <div className={styles.profileMeta}>
            <strong>Jonis</strong>
            <span>Perfil local</span>
          </div>
          <div className={styles.avatar}>J</div>
        </div>

        {continuing.length > 0 ? (
          <section>
            <h2 className={styles.sectionTitle}>Continuar</h2>
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
                    </div>
                  </Focusable>
                )
              })}
            </div>
          </section>
        ) : null}

        {rail.trending.length > 0 ? (
          <section>
            <h2 className={styles.sectionTitle}>Em alta</h2>
            <div className={styles.list}>
              {rail.trending.map((item) => (
                <Focusable
                  key={`trend-${String(item.tmdbId)}`}
                  focusKey={`RAIL_TREND_${String(item.tmdbId)}`}
                  className={styles.miniCard}
                  onEnterPress={() => {
                    onOpenItem(item)
                  }}
                >
                  <RailPoster item={item} />
                </Focusable>
              ))}
            </div>
          </section>
        ) : null}

        {rail.topRated.length > 0 ? (
          <section>
            <h2 className={styles.sectionTitle}>Top avaliados</h2>
            <div className={styles.list}>
              {rail.topRated.map((item) => (
                <Focusable
                  key={`top-${String(item.tmdbId)}`}
                  focusKey={`RAIL_TOP_${String(item.tmdbId)}`}
                  className={styles.miniCard}
                  onEnterPress={() => {
                    onOpenItem(item)
                  }}
                >
                  <RailPoster item={item} />
                </Focusable>
              ))}
            </div>
          </section>
        ) : null}

        {rail.genres.length > 0 ? (
          <section>
            <h2 className={styles.sectionTitle}>Gêneros</h2>
            <div className={styles.genreGrid}>
              {rail.genres.map((genre) => {
                const poster = imageUrl(genre.posterPath, 'w342')
                return (
                  <div key={genre.id} className={styles.genreTile}>
                    {poster ? (
                      <img
                        src={poster}
                        alt=""
                        loading="lazy"
                        className={styles.genreImg}
                      />
                    ) : null}
                    <span>{genre.label}</span>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </Focusable>
    </aside>
  )
}

function RailPoster({ item }: { item: CatalogItem }) {
  const thumb = imageUrl(item.posterPath, 'w342')
  return (
    <>
      {thumb ? (
        <img className={styles.thumb} src={thumb} alt="" loading="lazy" />
      ) : (
        <div className={styles.thumb} />
      )}
      <div className={styles.continueMeta}>
        <h3>{item.title}</h3>
        <p>{item.voteAverage > 0 ? item.voteAverage.toFixed(1) : '—'}</p>
      </div>
    </>
  )
}
