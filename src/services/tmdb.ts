import { get, set } from 'idb-keyval'
import type { CatalogItem, MediaType, Platform } from '@/domain/types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const PROVIDER_MAP: Record<number, Platform> = {
  8: 'netflix',
  337: 'disney',
  1899: 'hbomax',
  384: 'hbomax',
  307: 'globoplay',
}

interface CacheEntry<T> {
  expiresAt: number
  data: T
}

interface TmdbPagedResult<T> {
  results: T[]
}

interface TmdbSearchItem {
  id: number
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  genre_ids?: number[]
  vote_average?: number
  release_date?: string
  first_air_date?: string
  media_type?: MediaType | 'person'
}

interface TmdbProviderResponse {
  results?: {
    BR?: {
      flatrate?: Array<{ provider_id: number; provider_name: string }>
    }
  }
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

function readEnv(name: 'VITE_TMDB_TOKEN' | 'VITE_TMDB_API_KEY'): string | undefined {
  const value = import.meta.env[name]
  return value && value.trim().length > 0 ? value.trim() : undefined
}

/** API Read Access Token (Bearer) — método preferido pela TMDB. */
function accessToken(): string | undefined {
  return readEnv('VITE_TMDB_TOKEN')
}

/** API Key v3 — fallback via query string. */
function apiKey(): string | undefined {
  return readEnv('VITE_TMDB_API_KEY')
}

export function hasTmdbKey(): boolean {
  return Boolean(accessToken() ?? apiKey())
}

export function imageUrl(
  path: string | null | undefined,
  size: 'w342' | 'w780' | 'w1280' = 'w342',
): string | undefined {
  if (!path) return undefined
  return `${IMAGE_BASE}/${size}${path}`
}

interface TmdbVideo {
  key: string
  site: string
  type: string
  official?: boolean
  name?: string
}

function pickYoutubeTrailer(results: TmdbVideo[]): string | undefined {
  const videos = results.filter(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'),
  )
  const preferred =
    videos.find((v) => v.type === 'Trailer' && v.official) ??
    videos.find((v) => v.type === 'Trailer') ??
    videos[0]
  return preferred?.key
}

export async function getTrailerYoutubeKey(
  mediaType: MediaType,
  tmdbId: number,
): Promise<string | undefined> {
  if (!tmdbId) return undefined

  try {
    const path = `/${mediaType}/${String(tmdbId)}/videos`
    const local = await tmdbFetch<{ results: TmdbVideo[] }>(path, {
      language: 'pt-BR',
    })
    const localKey = pickYoutubeTrailer(local.results)
    if (localKey) return localKey

    // Muitos títulos só têm trailer em en-US
    const fallback = await tmdbFetch<{ results: TmdbVideo[] }>(path, {
      language: 'en-US',
    })
    return pickYoutubeTrailer(fallback.results)
  } catch {
    return undefined
  }
}

/** Thumbnail estático — embeds iframe falham com erro 153 no webOS/Simulator. */
export function youtubeThumbUrl(key: string, quality: 'hq' | 'mq' = 'hq'): string {
  return `https://i.ytimg.com/vi/${key}/${quality}default.jpg`
}

export function youtubeWatchUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${key}`
}

async function readCache<T>(key: string): Promise<T | undefined> {
  const mem = memoryCache.get(key) as CacheEntry<T> | undefined
  if (mem && mem.expiresAt > Date.now()) return mem.data

  try {
    const stored = await get<CacheEntry<T>>(key)
    if (stored && stored.expiresAt > Date.now()) {
      memoryCache.set(key, stored)
      return stored.data
    }
  } catch (err) {
    console.warn('[tmdb] cache read ignorado', err)
  }
  return undefined
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, expiresAt: Date.now() + CACHE_TTL_MS }
  memoryCache.set(key, entry)
  try {
    await set(key, entry)
  } catch (err) {
    // IndexedDB costuma falhar no Simulator com "Internal error."
    console.warn('[tmdb] cache write ignorado', err)
  }
}

async function tmdbFetch<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  const token = accessToken()
  const key = apiKey()

  if (!token && !key) {
    throw new Error(
      'Configure VITE_TMDB_TOKEN (preferível) ou VITE_TMDB_API_KEY no .env',
    )
  }

  const cacheKey = `tmdb:${path}?${new URLSearchParams(query).toString()}`
  const cached = await readCache<T>(cacheKey)
  if (cached !== undefined) return cached

  const params = new URLSearchParams({
    language: 'pt-BR',
    ...query,
  })

  // Token Bearer é o método padrão; api_key só entra se não houver token.
  if (!token && key) {
    params.set('api_key', key)
  }

  const headers: HeadersInit = {
    Accept: 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${TMDB_BASE}${path}?${params.toString()}`, { headers })
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'rede indisponível'
    throw new Error(`Falha de rede TMDB (${path}): ${reason}`)
  }

  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'status_message' in payload &&
      typeof (payload as { status_message: unknown }).status_message === 'string'
        ? (payload as { status_message: string }).status_message
        : `HTTP ${String(res.status)}`
    throw new Error(`TMDB ${path}: ${message}`)
  }

  const data = payload as T
  await writeCache(cacheKey, data)
  return data
}

function toCatalogItem(
  item: TmdbSearchItem,
  mediaType: MediaType,
  platforms: Platform[] = [],
): CatalogItem {
  const title = item.title ?? item.name ?? 'Sem título'
  const date = item.release_date ?? item.first_air_date
  return {
    tmdbId: item.id,
    mediaType,
    title,
    overview: item.overview ?? '',
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    genreIds: item.genre_ids ?? [],
    voteAverage: item.vote_average ?? 0,
    releaseYear: date ? Number(date.slice(0, 4)) : undefined,
    platforms,
  }
}

export async function getWatchProviders(
  mediaType: MediaType,
  tmdbId: number,
): Promise<Platform[]> {
  try {
    const data = await tmdbFetch<TmdbProviderResponse>(
      `/${mediaType}/${String(tmdbId)}/watch/providers`,
    )
    const flatrate = data.results?.BR?.flatrate ?? []
    const platforms: Platform[] = []
    for (const provider of flatrate) {
      const mapped = PROVIDER_MAP[provider.provider_id]
      if (mapped && !platforms.includes(mapped)) platforms.push(mapped)
    }
    return platforms
  } catch {
    return []
  }
}

export const TMDB_PROVIDER_IDS: Partial<Record<Platform, number>> = {
  netflix: 8,
  disney: 337,
  hbomax: 1899,
  globoplay: 307,
}

export async function searchMulti(query: string): Promise<CatalogItem[]> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>('/search/multi', {
    query,
    include_adult: 'false',
    region: 'BR',
  })

  return data.results
    .filter(
      (r): r is TmdbSearchItem & { media_type: MediaType } =>
        r.media_type === 'movie' || r.media_type === 'tv',
    )
    .map((r) => toCatalogItem(r, r.media_type))
}

export async function resolveByTitle(
  title: string,
  year?: number,
  preferredType: MediaType = 'movie',
): Promise<CatalogItem | undefined> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(
    `/search/${preferredType}`,
    {
      query: title,
      include_adult: 'false',
      region: 'BR',
      ...(year ? { year: String(year), first_air_date_year: String(year) } : {}),
    },
  )

  const first = data.results[0]
  if (!first) return undefined
  const item = toCatalogItem(first, preferredType)
  const platforms = await getWatchProviders(preferredType, item.tmdbId)
  return { ...item, platforms }
}

export async function getDetails(
  mediaType: MediaType,
  tmdbId: number,
): Promise<CatalogItem> {
  const data = await tmdbFetch<TmdbSearchItem & { genres?: Array<{ id: number }> }>(
    `/${mediaType}/${String(tmdbId)}`,
  )
  const item = toCatalogItem(
    {
      ...data,
      genre_ids: data.genres?.map((g) => g.id) ?? data.genre_ids,
    },
    mediaType,
  )
  const platforms = await getWatchProviders(mediaType, tmdbId)
  return { ...item, platforms }
}

export async function getRecommendations(
  mediaType: MediaType,
  tmdbId: number,
): Promise<CatalogItem[]> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(
    `/${mediaType}/${String(tmdbId)}/recommendations`,
  )
  return data.results.map((r) => toCatalogItem(r, mediaType))
}

export async function getSimilar(
  mediaType: MediaType,
  tmdbId: number,
): Promise<CatalogItem[]> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(
    `/${mediaType}/${String(tmdbId)}/similar`,
  )
  return data.results.map((r) => toCatalogItem(r, mediaType))
}

/** Recomendações; se vazio, usa similares. */
export async function getRelatedTitles(
  mediaType: MediaType,
  tmdbId: number,
): Promise<CatalogItem[]> {
  const recs = await getRecommendations(mediaType, tmdbId)
  if (recs.length > 0) return recs
  return getSimilar(mediaType, tmdbId)
}

export async function discoverByGenres(
  genreIds: number[],
  mediaType: MediaType = 'movie',
  options: {
    excludeAnimation?: boolean
    /** 'and' = todos os gêneros; 'or' = qualquer um */
    match?: 'and' | 'or'
  } = {},
): Promise<CatalogItem[]> {
  if (genreIds.length === 0) return []
  const sep = options.match === 'or' ? '|' : ','
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(
    `/discover/${mediaType}`,
    {
      with_genres: genreIds.slice(0, 4).join(sep),
      sort_by: 'popularity.desc',
      watch_region: 'BR',
      region: 'BR',
      include_adult: 'false',
      ...(options.excludeAnimation ? { without_genres: '16' } : {}),
    },
  )
  return data.results.map((r) => toCatalogItem(r, mediaType))
}

export async function discoverPopular(
  mediaType: MediaType,
  options: {
    withoutGenres?: number[]
    withWatchProvider?: number
    sortBy?: string
  } = {},
): Promise<CatalogItem[]> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(
    `/discover/${mediaType}`,
    {
      sort_by: options.sortBy ?? 'popularity.desc',
      watch_region: 'BR',
      region: 'BR',
      include_adult: 'false',
      ...(options.withoutGenres?.length
        ? { without_genres: options.withoutGenres.join(',') }
        : {}),
      ...(options.withWatchProvider
        ? {
            with_watch_providers: String(options.withWatchProvider),
            with_watch_monetization_types: 'flatrate',
          }
        : {}),
    },
  )
  const items = data.results.map((r) => toCatalogItem(r, mediaType))
  if (!options.withWatchProvider) return items

  const platform = (
    Object.entries(TMDB_PROVIDER_IDS) as Array<[Platform, number]>
  ).find(([, id]) => id === options.withWatchProvider)?.[0]

  if (!platform) return items
  return items.map((item) =>
    item.platforms.includes(platform)
      ? item
      : { ...item, platforms: [...item.platforms, platform] },
  )
}

async function mapList(
  path: string,
  mediaType: MediaType,
  query: Record<string, string> = {},
): Promise<CatalogItem[]> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(path, {
    region: 'BR',
    include_adult: 'false',
    ...query,
  })
  return data.results.map((r) => toCatalogItem(r, mediaType))
}

export function getPopularMovies(): Promise<CatalogItem[]> {
  return mapList('/movie/popular', 'movie')
}

export function getPopularTv(): Promise<CatalogItem[]> {
  return mapList('/tv/popular', 'tv')
}

export function getTopRatedMovies(): Promise<CatalogItem[]> {
  return mapList('/movie/top_rated', 'movie')
}

export function getTopRatedTv(): Promise<CatalogItem[]> {
  return mapList('/tv/top_rated', 'tv')
}

export function getNowPlaying(): Promise<CatalogItem[]> {
  return mapList('/movie/now_playing', 'movie')
}

export function getUpcoming(): Promise<CatalogItem[]> {
  return mapList('/movie/upcoming', 'movie')
}

export function getOnTheAir(): Promise<CatalogItem[]> {
  return mapList('/tv/on_the_air', 'tv')
}

export async function getTrending(
  mediaType: MediaType | 'all' = 'all',
  window: 'day' | 'week' = 'week',
): Promise<CatalogItem[]> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(
    `/trending/${mediaType}/${window}`,
    { region: 'BR' },
  )

  return data.results
    .filter((r) => {
      const type = r.media_type ?? mediaType
      return type === 'movie' || type === 'tv'
    })
    .map((r) => {
      const type = (r.media_type === 'tv' ? 'tv' : 'movie') as MediaType
      return toCatalogItem(r, type)
    })
}

export function isMostlyAnimation(item: CatalogItem): boolean {
  return item.genreIds.includes(16) && item.genreIds.length <= 2
}

export const RAIL_GENRES: Array<{ id: number; label: string }> = [
  { id: 28, label: 'Ação' },
  { id: 35, label: 'Comédia' },
  { id: 18, label: 'Drama' },
  { id: 878, label: 'Ficção' },
  { id: 27, label: 'Terror' },
  { id: 10749, label: 'Romance' },
]

/** Catálogo ampliado para a tela Categorias (IDs TMDB filme; TV mapeia o que couber). */
export const CATEGORY_GENRES: Array<{ id: number; label: string }> = [
  ...RAIL_GENRES,
  { id: 12, label: 'Aventura' },
  { id: 16, label: 'Animação' },
  { id: 80, label: 'Crime' },
  { id: 99, label: 'Documentário' },
  { id: 14, label: 'Fantasia' },
  { id: 36, label: 'História' },
  { id: 10402, label: 'Musical' },
  { id: 9648, label: 'Mistério' },
  { id: 53, label: 'Thriller' },
  { id: 10751, label: 'Família' },
  { id: 10765, label: 'Sci-Fi & Fantasy' },
]
