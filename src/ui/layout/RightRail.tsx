import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, type RefObject } from 'react'
import type { CatalogItem, WatchEntry } from '@/domain/types'
import type { RailInsights } from '@/hooks/useHomeFeed'
import { imageUrl } from '@/services/tmdb'
import { useProfilesStore } from '@/store/profiles'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './RightRail.module.css'

interface RightRailProps {
  continuing: WatchEntry[]
  rail: RailInsights
  onOpenItem: (item: CatalogItem) => void
  onExpandedChange?: (expanded: boolean) => void
}

function entryToCatalog(entry: WatchEntry): CatalogItem {
  return {
    tmdbId: entry.tmdbId ?? 0,
    mediaType: entry.mediaType,
    title: entry.title,
    overview: entry.overview ?? '',
    posterPath: entry.posterPath ?? null,
    backdropPath: entry.backdropPath ?? null,
    genreIds: entry.genreIds,
    voteAverage: entry.voteAverage ?? 0,
    platforms: [entry.platform],
  }
}

export function RightRail({
  continuing,
  rail,
  onOpenItem,
  onExpandedChange,
}: RightRailProps) {
  const profiles = useProfilesStore((s) => s.profiles)
  const activeProfileId = useProfilesStore((s) => s.activeProfileId)
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0]

  const { ref, focused, hasFocusedChild, focusKey } = useFocusable({
    focusKey: 'RIGHT_RAIL',
    trackChildren: true,
    saveLastFocusedChild: true,
  })

  const expanded = focused || hasFocusedChild

  useEffect(() => {
    onExpandedChange?.(expanded)
  }, [expanded, onExpandedChange])

  return (
    <FocusContext.Provider value={focusKey}>
      <aside
        ref={ref as RefObject<HTMLElement>}
        className={cx(styles.rail, expanded && styles.railExpanded)}
        data-expanded={expanded ? 'true' : 'false'}
      >
        <div className={styles.peek} aria-hidden={!expanded}>
          <span className={styles.peekMark}>❚</span>
        </div>

        <div className={styles.railInner}>
          <div className={styles.profile}>
            <div className={styles.profileMeta}>
              <strong>{activeProfile?.name ?? 'Perfil'}</strong>
              <span>Perfil ativo</span>
            </div>
            <div
              className={styles.avatar}
              style={
                activeProfile
                  ? { background: activeProfile.color, color: '#fff' }
                  : undefined
              }
            >
              {activeProfile
                ? activeProfile.name.slice(0, 1).toUpperCase()
                : '?'}
            </div>
          </div>

          {continuing.length > 0 ? (
            <section>
              <h2 className={styles.sectionTitle}>Continuar</h2>
              <div className={styles.list}>
                {continuing.map((entry) => {
                  const thumb = imageUrl(
                    entry.posterPath ?? entry.backdropPath,
                    'w342',
                  )
                  const progress = entry.progressPct ?? 35
                  return (
                    <Focusable
                      key={entry.id}
                      focusKey={`RAIL_CONTINUE_${entry.id}`}
                      className={styles.continueCard}
                      onEnterPress={() => {
                        onOpenItem(entryToCatalog(entry))
                      }}
                    >
                      {thumb ? (
                        <img
                          className={styles.thumb}
                          src={thumb}
                          alt=""
                          loading="lazy"
                        />
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
        </div>
      </aside>
    </FocusContext.Provider>
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
