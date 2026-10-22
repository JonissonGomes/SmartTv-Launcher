import { get, set } from 'idb-keyval'
import type { CatalogItem, MediaType, Platform } from '@/domain/types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const PROVIDER_MAP: Record<number, Platform> = {
  8: 'netflix',
  1899: 'hbomax',
  307: 'globoplay',
  // YouTube não é provider TMDB clássico; mantemos vazio
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

async function readCache<T>(key: string): Promise<T | undefined> {
  const mem = memoryCache.get(key) as CacheEntry<T> | undefined
  if (mem && mem.expiresAt > Date.now()) return mem.data

  const stored = await get<CacheEntry<T>>(key)
  if (stored && stored.expiresAt > Date.now()) {
    memoryCache.set(key, stored)
    return stored.data
  }
  return undefined
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, expiresAt: Date.now() + CACHE_TTL_MS }
  memoryCache.set(key, entry)
  await set(key, entry)
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

  const res = await fetch(`${TMDB_BASE}${path}?${params.toString()}`, { headers })
  if (!res.ok) {
    throw new Error(`TMDB ${String(res.status)}: ${path}`)
  }

  const data = (await res.json()) as T
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

async function withProviders(items: CatalogItem[]): Promise<CatalogItem[]> {
  const enriched = await Promise.all(
    items.slice(0, 20).map(async (item) => {
      if (item.platforms.length > 0) return item
      const platforms = await getWatchProviders(item.mediaType, item.tmdbId)
      return { ...item, platforms }
    }),
  )
  return enriched
}

export async function searchMulti(query: string): Promise<CatalogItem[]> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>('/search/multi', {
    query,
    include_adult: 'false',
    region: 'BR',
  })

  const items = data.results
    .filter(
      (r): r is TmdbSearchItem & { media_type: MediaType } =>
        r.media_type === 'movie' || r.media_type === 'tv',
    )
    .map((r) => toCatalogItem(r, r.media_type))

  return withProviders(items)
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
  return withProviders(data.results.map((r) => toCatalogItem(r, mediaType)))
}

export async function discoverByGenres(
  genreIds: number[],
  mediaType: MediaType = 'movie',
): Promise<CatalogItem[]> {
  if (genreIds.length === 0) return []
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(
    `/discover/${mediaType}`,
    {
      with_genres: genreIds.slice(0, 3).join(','),
      sort_by: 'popularity.desc',
      watch_region: 'BR',
      region: 'BR',
    },
  )
  return withProviders(data.results.map((r) => toCatalogItem(r, mediaType)))
}

export async function getTrending(mediaType: MediaType | 'all' = 'all'): Promise<CatalogItem[]> {
  const data = await tmdbFetch<TmdbPagedResult<TmdbSearchItem>>(
    `/trending/${mediaType}/week`,
    { region: 'BR' },
  )

  return withProviders(
    data.results
      .filter((r) => {
        const type = r.media_type ?? mediaType
        return type === 'movie' || type === 'tv'
      })
      .map((r) => {
        const type = (r.media_type === 'tv' ? 'tv' : 'movie') as MediaType
        return toCatalogItem(r, type)
      }),
  )
}
