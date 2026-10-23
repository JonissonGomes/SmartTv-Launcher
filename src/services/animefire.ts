import type {
  AfAnime,
  AfEpisode,
  AfSeason,
  AfStream,
} from '@/domain/animefire'

const PROD_API = 'https://api.animefire.one'
export const AF_SITE = 'https://animefire.one'

function apiRoot(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/api/animefire`
  }
  return PROD_API
}

async function getJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch(`${apiRoot()}${path}`, {
      headers: {
        Accept: 'application/json',
        Origin: AF_SITE,
        Referer: `${AF_SITE}/`,
      },
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`AnimeFire HTTP ${String(res.status)}`)
    return (await res.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}

function titleOf(titles: unknown): string {
  if (!titles || typeof titles !== 'object') return ''
  const t = titles as Record<string, unknown>
  for (const key of ['BR', 'US', 'JP']) {
    if (typeof t[key] === 'string' && t[key]) return t[key] as string
  }
  const first = Object.values(t).find((v) => typeof v === 'string' && v)
  return typeof first === 'string' ? first : ''
}

function yearFrom(date?: string): number | undefined {
  if (!date) return undefined
  const y = Number.parseInt(date.slice(0, 4), 10)
  return Number.isFinite(y) ? y : undefined
}

function mapListItem(raw: unknown): AfAnime | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as Record<string, unknown>
  if (typeof v.id !== 'string') return null
  const name = titleOf(v.titles)
  if (!name) return null
  return {
    id: v.id,
    name,
    posterUrl: typeof v.poster_src === 'string' ? v.poster_src : undefined,
    audio: typeof v.audio === 'string' ? v.audio : undefined,
    status: typeof v.status === 'string' ? v.status : undefined,
    year: yearFrom(typeof v.published_at === 'string' ? v.published_at : undefined),
    mostLiked: Boolean(v.most_liked),
  }
}

function unwrapList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return []
  const data = (payload as { data?: unknown }).data
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const nested = data as { animes?: unknown; data?: unknown }
    if (Array.isArray(nested.animes)) return nested.animes
    if (Array.isArray(nested.data)) return nested.data
  }
  return []
}

export function animePageUrl(id: string): string {
  return `${AF_SITE}/anime/${id}`
}

export async function fetchAfSection(path: string): Promise<AfAnime[]> {
  const json = await getJson<unknown>(path)
  return unwrapList(json)
    .map(mapListItem)
    .filter((a): a is AfAnime => a != null)
}

export async function fetchAfHome(): Promise<{
  highlights: AfAnime[]
  latest: AfAnime[]
  movies: AfAnime[]
  upcoming: AfAnime[]
}> {
  const [highlights, latest, movies, upcoming] = await Promise.all([
    fetchAfSection('/animes'),
    fetchAfSection('/animes/lancamentos'),
    fetchAfSection('/animes/filmes'),
    fetchAfSection('/animes/em-breve'),
  ])
  return {
    highlights: highlights.slice(0, 24),
    latest: latest.slice(0, 24),
    movies: movies.slice(0, 24),
    upcoming: upcoming.slice(0, 24),
  }
}

export interface AfSearchFilters {
  q?: string
  audio?: 'dublado' | 'legendado' | ''
  genre?: string
  page?: number
}

/** Busca/listagem com filtros do site (q, audio, genre, page). */
export async function searchAfAnimes(
  filters: AfSearchFilters | string,
): Promise<AfAnime[]> {
  const f: AfSearchFilters =
    typeof filters === 'string' ? { q: filters } : filters
  const params = new URLSearchParams()
  const q = f.q?.trim() ?? ''
  if (q) params.set('q', q)
  if (f.audio) params.set('audio', f.audio)
  if (f.genre) params.set('genre', f.genre)
  if (f.page && f.page > 1) params.set('page', String(f.page))

  const qs = params.toString()
  // Com texto usa /pesquisar; só filtro usa /animes (como no site)
  const base = q.length >= 1 ? '/animes/pesquisar' : '/animes'
  return fetchAfSection(qs ? `${base}?${qs}` : base)
}

export async function fetchAfAnimeDetail(id: string): Promise<{
  anime: AfAnime
  seasons: AfSeason[]
  episodes: AfEpisode[]
}> {
  const json = await getJson<{ data?: Record<string, unknown> }>(
    `/anime/${encodeURIComponent(id)}`,
  )
  const data = json.data
  if (!data) throw new Error('Anime não encontrado')

  const hero = (data.hero ?? {}) as Record<string, unknown>
  const name = titleOf(hero.titles) || id
  const anime: AfAnime = {
    id: typeof hero.id === 'string' ? hero.id : id,
    name,
    posterUrl: typeof hero.poster_src === 'string' ? hero.poster_src : undefined,
    backdropUrl:
      typeof hero.backdrop_src === 'string' ? hero.backdrop_src : undefined,
    audio: typeof hero.audio === 'string' ? hero.audio : undefined,
    status: typeof hero.status === 'string' ? hero.status : undefined,
    synopsis: typeof hero.synopsis === 'string' ? hero.synopsis : undefined,
    score: typeof hero.score === 'number' ? hero.score : undefined,
    genres: Array.isArray(hero.genres)
      ? hero.genres.filter((g): g is string => typeof g === 'string')
      : undefined,
    year: yearFrom(
      typeof hero.published_at === 'string' ? hero.published_at : undefined,
    ),
    mostLiked: Boolean(hero.most_liked),
  }

  const seasons: AfSeason[] = []
  if (Array.isArray(data.seasons)) {
    for (const s of data.seasons) {
      if (!s || typeof s !== 'object') continue
      const v = s as Record<string, unknown>
      const number = typeof v.number === 'number' ? v.number : 0
      seasons.push({
        number,
        title: typeof v.title === 'string' ? v.title : undefined,
        firstEpisodeNumber:
          typeof v.first_episode_number === 'number'
            ? v.first_episode_number
            : 1,
      })
    }
  }

  const episodes: AfEpisode[] = []
  if (Array.isArray(data.episodes)) {
    for (const e of data.episodes) {
      if (!e || typeof e !== 'object') continue
      const v = e as Record<string, unknown>
      if (typeof v.id !== 'string') continue
      episodes.push({
        id: v.id,
        title:
          typeof v.title === 'string'
            ? v.title
            : `Episódio ${String(v.number ?? '')}`,
        season: typeof v.season === 'number' ? v.season : 1,
        number: typeof v.number === 'number' ? v.number : 0,
        audio: typeof v.audio === 'string' ? v.audio : undefined,
        stillUrl: typeof v.still_src === 'string' ? v.still_src : undefined,
        synopsis: typeof v.synopsis === 'string' ? v.synopsis : undefined,
      })
    }
  }

  return { anime, seasons, episodes }
}

export async function fetchAfEpisodeStreams(
  episodeId: string,
): Promise<AfStream[]> {
  const json = await getJson<{ data?: { streams?: unknown } }>(
    `/episode/${encodeURIComponent(episodeId)}`,
  )
  const raw = json.data?.streams
  if (!Array.isArray(raw)) return []
  const out: AfStream[] = []
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue
    const v = s as Record<string, unknown>
    if (typeof v.url !== 'string' || !v.url) continue
    out.push({
      audio: typeof v.audio === 'string' ? v.audio : 'default',
      url: v.url,
      qualities: Array.isArray(v.qualities)
        ? v.qualities.filter((q): q is string => typeof q === 'string')
        : [],
    })
  }
  return out
}
