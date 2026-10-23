import { useMemo } from 'react'
import type { AfAnime, AfEpisode, AfSeason } from '@/domain/animefire'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from '@/ui/screens/LibraryScreen.module.css'

interface AnimeDetailProps {
  anime: AfAnime
  episodes: AfEpisode[]
  seasons: AfSeason[]
  seasonFilter: number | 'all'
  loading: boolean
  onBack: () => void
  onSeasonFilter: (value: number | 'all') => void
  onPlayEpisode: (ep: AfEpisode) => void
}

export function AnimeDetail({
  anime,
  episodes,
  seasons,
  seasonFilter,
  loading,
  onBack,
  onSeasonFilter,
  onPlayEpisode,
}: AnimeDetailProps) {
  const filteredEps = useMemo(() => {
    if (seasonFilter === 'all') return episodes.slice(0, 80)
    return episodes.filter((e) => e.season === seasonFilter).slice(0, 80)
  }, [episodes, seasonFilter])

  return (
    <>
      <Focusable
        focusKey="ANIME_RAIL_CLOSE"
        className={styles.backBtn}
        onEnterPress={onBack}
      >
        Fechar
      </Focusable>
      <div className={styles.detail}>
        {anime.posterUrl ? (
          <img className={styles.detailPoster} src={anime.posterUrl} alt="" />
        ) : (
          <div className={styles.posterFallback}>{anime.name}</div>
        )}
        <div>
          <h1 className={styles.detailTitle}>{anime.name}</h1>
          <p className={styles.detailMeta}>
            {[
              anime.year,
              anime.audio,
              anime.status,
              anime.score ? `★ ${anime.score.toFixed(1)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {anime.genres?.length ? (
            <p className={styles.detailMeta}>{anime.genres.join(' · ')}</p>
          ) : null}
          {anime.synopsis ? (
            <p className={styles.detailSynopsis}>{anime.synopsis}</p>
          ) : null}
        </div>
      </div>

      {loading ? <p className={styles.hint}>Carregando episódios…</p> : null}

      {seasons.length > 1 ? (
        <div className={styles.chips}>
          <Focusable
            focusKey="ANIME_SEASON_all"
            className={cx(
              styles.chip,
              seasonFilter === 'all' && styles.chipActive,
            )}
            onEnterPress={() => {
              onSeasonFilter('all')
            }}
          >
            Todas
          </Focusable>
          {seasons.slice(0, 12).map((s) => (
            <Focusable
              key={s.number}
              focusKey={`ANIME_SEASON_${String(s.number)}`}
              className={cx(
                styles.chip,
                seasonFilter === s.number && styles.chipActive,
              )}
              onEnterPress={() => {
                onSeasonFilter(s.number)
              }}
            >
              {s.title || `Temporada ${String(s.number)}`}
            </Focusable>
          ))}
        </div>
      ) : null}

      <div className={styles.epList}>
        {filteredEps.map((ep) => (
          <Focusable
            key={ep.id}
            focusKey={`ANIME_EP_${ep.id}`}
            className={styles.epRow}
            onEnterPress={() => {
              onPlayEpisode(ep)
            }}
          >
            {ep.stillUrl ? (
              <img
                className={styles.epThumb}
                src={ep.stillUrl}
                alt=""
                loading="lazy"
              />
            ) : (
              <div className={styles.epThumb} />
            )}
            <div>
              <div className={styles.epTitle}>
                T{ep.season} E{ep.number} — {ep.title}
              </div>
              <div className={styles.epSub}>{ep.audio}</div>
            </div>
            <span className={styles.epPlay}>Play</span>
          </Focusable>
        ))}
      </div>
    </>
  )
}
