import { useEffect, useState } from 'react'
import { PLATFORM_ORDER } from '@/config/apps'
import {
  getRecentDistinctEntries,
  rankRecommendations,
  topGenreIds,
  buildGenreScores,
} from '@/domain/recommend'
import type { CatalogItem, ContentRow, Platform, WatchEntry } from '@/domain/types'
import {
  discoverByGenres,
  getRecommendations,
  getTrending,
  hasTmdbKey,
} from '@/services/tmdb'

interface CatalogState {
  loading: boolean
  error?: string
  rows: ContentRow[]
}

function entryToCatalog(entry: WatchEntry): CatalogItem {
  return {
    tmdbId:
      entry.tmdbId ?? (Number.parseInt(entry.id.replace(/\D/g, ''), 10) || 0),
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

export function useCatalog(
  history: WatchEntry[],
  ownedPlatforms: Platform[],
): CatalogState {
  const [state, setState] = useState<CatalogState>({ loading: true, rows: [] })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState((s) => ({ ...s, loading: true, error: undefined }))

      try {
        const continueItems = history
          .filter((e) => !e.finished)
          .sort(
            (a, b) =>
              new Date(b.lastWatchedAt).getTime() -
              new Date(a.lastWatchedAt).getTime(),
          )
          .slice(0, 20)
          .map(entryToCatalog)
          .filter((i) => i.tmdbId > 0 || i.posterPath)

        const rows: ContentRow[] = []

        if (continueItems.length > 0) {
          rows.push({
            id: 'continue',
            title: 'Continuar assistindo',
            items: continueItems,
          })
        }

        if (!hasTmdbKey()) {
          if (!cancelled) {
            setState({
              loading: false,
              error:
                'Configure VITE_TMDB_TOKEN ou VITE_TMDB_API_KEY no .env para recomendações e pôsteres.',
              rows,
            })
          }
          return
        }

        const recent = getRecentDistinctEntries(history, 5)
        const genreScores = buildGenreScores(recent)
        const genres = topGenreIds(genreScores, 3)

        const [discoveredMovies, discoveredTv, trending, ...recLists] =
          await Promise.all([
            discoverByGenres(genres, 'movie'),
            discoverByGenres(genres, 'tv'),
            getTrending('all'),
            ...recent
              .filter((e) => e.tmdbId)
              .slice(0, 5)
              .map((e) => getRecommendations(e.mediaType, e.tmdbId as number)),
          ])

        const candidates = [
          ...discoveredMovies,
          ...discoveredTv,
          ...trending,
          ...recLists.flat(),
        ]

        const ranked = rankRecommendations(
          candidates,
          history,
          ownedPlatforms,
          20,
        )

        if (recent[0]) {
          rows.push({
            id: 'because',
            title: `Porque você assistiu ${recent[0].title}`,
            items: ranked.slice(0, 12),
          })
        } else {
          rows.push({
            id: 'trending',
            title: 'Em alta esta semana',
            items: trending.slice(0, 12),
          })
        }

        for (const platform of PLATFORM_ORDER.filter((p) =>
          ownedPlatforms.includes(p),
        )) {
          const platformItems = ranked
            .filter((i) => i.platforms.includes(platform))
            .slice(0, 10)
          if (platformItems.length > 0) {
            rows.push({
              id: `hot-${platform}`,
              title: `Em alta no ${platformLabel(platform)}`,
              items: platformItems,
            })
          }
        }

        const fresh = trending.filter((i) =>
          i.platforms.some((p) => ownedPlatforms.includes(p)),
        )
        if (fresh.length > 0) {
          rows.push({
            id: 'new-owned',
            title: 'Novidades nas suas plataformas',
            items: fresh.slice(0, 12),
          })
        }

        if (!cancelled) {
          setState({ loading: false, rows })
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : 'Falha ao carregar catálogo',
            rows: [],
          })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [history, ownedPlatforms])

  return state
}

function platformLabel(platform: Platform): string {
  switch (platform) {
    case 'netflix':
      return 'Netflix'
    case 'hbomax':
      return 'HBO Max'
    case 'globoplay':
      return 'Globoplay'
    case 'youtube':
      return 'YouTube'
  }
}
