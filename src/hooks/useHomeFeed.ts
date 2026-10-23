import { useEffect, useState } from 'react'
import { PLATFORM_ORDER } from '@/config/apps'
import {
  buildGenreScores,
  getRecentDistinctEntries,
  rankRecommendations,
  topGenreIds,
} from '@/domain/recommend'
import type { CatalogItem, ContentRow, Platform, WatchEntry } from '@/domain/types'
import {
  applyCurateToRows,
  curateWithJev,
  pickFeaturedCandidate,
} from '@/services/jevCurate'
import {
  discoverByGenres,
  discoverByOriginCountry,
  discoverPopular,
  getNowPlaying,
  getOnTheAir,
  getPopularMovies,
  getPopularTv,
  getRecommendations,
  getTopRatedMovies,
  getTrending,
  getUpcoming,
  hasTmdbKey,
  isMostlyAnimation,
  RAIL_GENRES,
  TMDB_PROVIDER_IDS,
} from '@/services/tmdb'
import { useAnimeHistoryStore } from '@/store/animeHistory'

export interface RailGenreTile {
  id: number
  label: string
  posterPath: string | null
}

export interface RailInsights {
  topRated: CatalogItem[]
  trending: CatalogItem[]
  genres: RailGenreTile[]
}

interface HomeFeedState {
  loading: boolean
  error?: string
  rows: ContentRow[]
  featured?: CatalogItem
  rail: RailInsights
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

function historySignature(history: WatchEntry[]): string {
  return history
    .slice(0, 30)
    .map((e) => `${e.id}:${e.lastWatchedAt}:${e.finished ? 1 : 0}`)
    .join('|')
}

function uniqueById(items: CatalogItem[]): CatalogItem[] {
  const map = new Map<string, CatalogItem>()
  for (const item of items) {
    const key = `${item.mediaType}:${String(item.tmdbId)}`
    if (!map.has(key)) map.set(key, item)
  }
  return [...map.values()]
}

function pushRow(
  rows: ContentRow[],
  id: string,
  title: string,
  items: CatalogItem[],
  limit = 14,
): void {
  const cleaned = uniqueById(items).filter((i) => i.posterPath).slice(0, limit)
  if (cleaned.length > 0) rows.push({ id, title, items: cleaned })
}

const EMPTY_RAIL: RailInsights = { topRated: [], trending: [], genres: [] }

export function useHomeFeed(
  history: WatchEntry[],
  ownedPlatforms: Platform[],
  preferredGenreIds: number[] = [],
): HomeFeedState {
  const [state, setState] = useState<HomeFeedState>({
    loading: true,
    rows: [],
    rail: EMPTY_RAIL,
  })
  const historyKey = historySignature(history)
  const platformsKey = ownedPlatforms.slice().sort().join(',')
  const prefsKey = preferredGenreIds.slice(0, 6).join(',')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState((s) => ({ ...s, loading: true, error: undefined }))

      try {
        if (!hasTmdbKey()) {
          if (!cancelled) {
            setState({
              loading: false,
              error:
                'Configure VITE_TMDB_TOKEN ou VITE_TMDB_API_KEY no .env para recomendações e pôsteres.',
              rows: [],
              rail: EMPTY_RAIL,
            })
          }
          return
        }

        const recent = getRecentDistinctEntries(history, 5)
        const historyGenres = topGenreIds(buildGenreScores(recent), 3)
        const tasteGenres = [
          ...new Set([...preferredGenreIds.slice(0, 4), ...historyGenres]),
        ].slice(0, 4)
        const owned = PLATFORM_ORDER.filter((p) => ownedPlatforms.includes(p))

        const [
          trendingWeek,
          trendingDay,
          trendingMovies,
          popularMovies,
          popularTv,
          topRatedMovies,
          nowPlaying,
          upcoming,
          onTheAir,
          liveActionMovies,
          liveActionTv,
          actionMovies,
          comedyMovies,
          dramaMovies,
          personalizedDiscover,
          nationalMovies,
          recLists,
          providerLists,
        ] = await Promise.all([
          getTrending('all', 'week'),
          getTrending('all', 'day'),
          getTrending('movie', 'week'),
          getPopularMovies(),
          getPopularTv(),
          getTopRatedMovies(),
          getNowPlaying(),
          getUpcoming(),
          getOnTheAir(),
          discoverPopular('movie', { withoutGenres: [16] }),
          discoverPopular('tv', { withoutGenres: [16] }),
          discoverByGenres([28], 'movie', { excludeAnimation: true }),
          discoverByGenres([35], 'movie', { excludeAnimation: true }),
          discoverByGenres([18], 'movie', { excludeAnimation: true }),
          tasteGenres.length > 0
            ? discoverByGenres(tasteGenres, 'movie', { excludeAnimation: true })
            : Promise.resolve([] as CatalogItem[]),
          discoverByOriginCountry('BR', 'movie', { pages: 2 }).catch(
            () => [] as CatalogItem[],
          ),
          Promise.all(
            recent
              .filter((e) => e.tmdbId)
              .slice(0, 2)
              .map((e) =>
                getRecommendations(e.mediaType, e.tmdbId as number).catch(
                  () => [] as CatalogItem[],
                ),
              ),
          ),
          Promise.all(
            owned.map((platform) => {
              const providerId = TMDB_PROVIDER_IDS[platform]
              if (!providerId) return Promise.resolve([] as CatalogItem[])
              return discoverPopular('movie', {
                withWatchProvider: providerId,
                withoutGenres: [16],
              }).catch(() => [] as CatalogItem[])
            }),
          ),
        ])

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
        pushRow(rows, 'continue', 'Continuar assistindo', continueItems)

        if (preferredGenreIds.length > 0 && personalizedDiscover.length > 0) {
          pushRow(
            rows,
            'profile-prefs',
            'Para o seu perfil',
            personalizedDiscover,
            18,
          )
        }

        const ranked = rankRecommendations(
          [
            ...personalizedDiscover,
            ...recLists.flat(),
            ...liveActionMovies,
            ...trendingMovies,
          ],
          history,
          ownedPlatforms,
          24,
        )

        if (recent[0]) {
          pushRow(
            rows,
            'because',
            `Porque você assistiu ${recent[0].title}`,
            ranked,
          )
        }

        // Sessões por streaming em destaque (antes das fileiras genéricas)
        owned.forEach((platform, index) => {
          pushRow(
            rows,
            `provider-${platform}`,
            `${platformLabel(platform)}`,
            providerLists[index] ?? [],
          )
        })

        pushRow(
          rows,
          'trending-day',
          'Novidades de hoje',
          trendingDay.filter((i) => !isMostlyAnimation(i)),
        )
        pushRow(
          rows,
          'trending-movies',
          'Filmes em alta',
          trendingMovies.length > 0 ? trendingMovies : liveActionMovies,
        )
        pushRow(rows, 'national-movies', 'Filmes nacionais', nationalMovies, 16)
        pushRow(rows, 'now-playing', 'Nos cinemas', nowPlaying)
        pushRow(rows, 'popular-movies', 'Filmes populares', popularMovies)
        pushRow(
          rows,
          'popular-tv',
          'Séries populares',
          [...popularTv, ...liveActionTv].filter((i) => !isMostlyAnimation(i)),
        )
        pushRow(rows, 'on-air', 'No ar esta semana', onTheAir)
        pushRow(rows, 'upcoming', 'Em breve', upcoming)
        pushRow(rows, 'action', 'Ação e aventura', actionMovies)
        pushRow(rows, 'comedy', 'Comédia', comedyMovies)
        pushRow(rows, 'drama', 'Drama', dramaMovies)
        pushRow(rows, 'top-rated', 'Mais bem avaliados', topRatedMovies)

        // Animes no home (TMDB) — o Player nativo fica no menu Animes.
        const animeRecent = useAnimeHistoryStore.getState().getRecent(5)
        const watchedAnime =
          animeRecent.length > 0 ||
          history.some(
            (e) => e.genreIds.includes(16) || /anime/i.test(e.title),
          )
        const animeTaste = await discoverByGenres([16], 'tv', {
          pages: 2,
        }).catch(() => [])
        pushRow(
          rows,
          'anime-recommend',
          watchedAnime
            ? 'Animes para você'
            : 'Animes em alta',
          [
            ...animeTaste,
            ...trendingWeek.filter(isMostlyAnimation),
            ...popularTv.filter(isMostlyAnimation),
          ],
          18,
        )

        pushRow(
          rows,
          'animation',
          'Animações',
          [...trendingWeek, ...popularMovies].filter(isMostlyAnimation),
        )

        const candidatePool = uniqueById([
          ...ranked,
          ...trendingDay,
          ...trendingMovies,
          ...popularMovies,
          ...topRatedMovies,
        ]).filter((i) => i.posterPath)

        const curate = await curateWithJev(history, candidatePool, rows)
        const orderedRows = applyCurateToRows(rows, curate.primaryRowId)
        const jevFeatured = pickFeaturedCandidate(candidatePool, curate.featuredId)

        const featured =
          continueItems[0] ??
          jevFeatured ??
          liveActionMovies.find((i) => i.backdropPath) ??
          trendingMovies.find((i) => i.backdropPath)

        const pool = [
          ...actionMovies,
          ...comedyMovies,
          ...dramaMovies,
          ...liveActionMovies,
        ]
        const genreTiles: RailGenreTile[] = RAIL_GENRES.map((genre) => {
          const sample =
            pool.find((item) => item.genreIds.includes(genre.id) && item.posterPath) ??
            null
          return {
            id: genre.id,
            label: genre.label,
            posterPath: sample?.posterPath ?? null,
          }
        })

        const railTrending = uniqueById([
          ...(jevFeatured ? [jevFeatured] : []),
          ...trendingDay.filter((i) => !isMostlyAnimation(i)),
        ])
          .filter((i) => i.posterPath)
          .slice(0, 4)

        const rail: RailInsights = {
          topRated: uniqueById(topRatedMovies)
            .filter((i) => i.posterPath)
            .slice(0, 4),
          trending: railTrending,
          genres: genreTiles.filter((g) => g.posterPath),
        }

        if (!cancelled) {
          setState({
            loading: false,
            rows: orderedRows,
            featured,
            rail,
            error:
              orderedRows.length === 0
                ? 'Nenhum título retornado pela TMDB.'
                : undefined,
          })
        }
      } catch (err) {
        console.error('[home-feed]', err)
        if (!cancelled) {
          setState({
            loading: false,
            error:
              err instanceof Error ? err.message : 'Falha ao carregar catálogo',
            rows: [],
            rail: EMPTY_RAIL,
          })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [history, historyKey, ownedPlatforms, platformsKey, preferredGenreIds, prefsKey])

  return state
}

function platformLabel(platform: Platform): string {
  switch (platform) {
    case 'netflix':
      return 'Netflix'
    case 'disney':
      return 'Disney+'
    case 'hbomax':
      return 'HBO Max'
    case 'globoplay':
      return 'Globoplay'
    case 'youtube':
      return 'YouTube'
  }
}
