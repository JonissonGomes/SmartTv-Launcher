import type {
  OtakuAnime,
  OtakuCatalogDetail,
  OtakuCategory,
  OtakuEpisode,
  OtakuSeason,
} from '@/domain/otaku'

const PROD_GQL = 'https://api.otakulogia.com/graphql'
export const OTAKU_SITE = 'https://otakulogia.com'

const ANIME_FIELDS = `
fragment AnimeFields on AnimeEntity {
  id
  upstreamCid
  name
  slug
  nameEn
  year
  status
  synopsis
  posterUrl
  audioMix
  hasNewEpisode
}
`

function gqlEndpoint(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/api/otakulogia`
  }
  return PROD_GQL
}

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch(gqlEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`Otakulogia HTTP ${String(res.status)}`)
    const json = (await res.json()) as {
      data?: T
      errors?: Array<{ message?: string }>
    }
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message ?? 'Erro GraphQL Otakulogia')
    }
    if (!json.data) throw new Error('Resposta vazia da API Otakulogia')
    return json.data
  } finally {
    window.clearTimeout(timer)
  }
}

function asAnime(raw: unknown): OtakuAnime | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as Record<string, unknown>
  if (typeof v.id !== 'string' || typeof v.name !== 'string') return null
  if (typeof v.slug !== 'string') return null
  const upstreamCid =
    typeof v.upstreamCid === 'number'
      ? v.upstreamCid
      : Number.parseInt(String(v.upstreamCid ?? ''), 10)
  if (!Number.isFinite(upstreamCid)) return null
  return {
    id: v.id,
    upstreamCid,
    name: v.name,
    slug: v.slug,
    nameEn: typeof v.nameEn === 'string' ? v.nameEn : undefined,
    year: typeof v.year === 'number' ? v.year : undefined,
    status: typeof v.status === 'string' ? v.status : undefined,
    synopsis: typeof v.synopsis === 'string' ? v.synopsis : undefined,
    posterUrl: typeof v.posterUrl === 'string' ? v.posterUrl : undefined,
    audioMix: typeof v.audioMix === 'string' ? v.audioMix : undefined,
    hasNewEpisode: Boolean(v.hasNewEpisode),
  }
}

function mapAnimes(list: unknown): OtakuAnime[] {
  if (!Array.isArray(list)) return []
  return list.map(asAnime).filter((a): a is OtakuAnime => a != null)
}

export function animePageUrl(slug: string, siteBase = OTAKU_SITE): string {
  const base = siteBase.replace(/\/?$/, '/')
  return new URL(`anime/${slug}`, base).toString()
}

export async function fetchHomeHighlights(limit = 18): Promise<OtakuAnime[]> {
  const data = await gql<{ homeHighlights: unknown }>(
    `query HomeHighlights($input: HomeHighlightsInput) {
      homeHighlights(input: $input) { ...AnimeFields }
    }
    ${ANIME_FIELDS}`,
    { input: { limit } },
  )
  return mapAnimes(data.homeHighlights)
}

export async function fetchLatestReleases(
  limit = 24,
  offset = 0,
): Promise<{ total: number; items: OtakuAnime[] }> {
  const data = await gql<{
    latestReleases: { total?: number; items?: unknown }
  }>(
    `query LatestReleases($input: LatestReleasesInput) {
      latestReleases(input: $input) {
        total
        items { ...AnimeFields }
      }
    }
    ${ANIME_FIELDS}`,
    { input: { limit, offset } },
  )
  return {
    total: data.latestReleases.total ?? 0,
    items: mapAnimes(data.latestReleases.items),
  }
}

export async function fetchCategories(
  limit = 88,
): Promise<OtakuCategory[]> {
  const data = await gql<{
    categories: { items?: unknown }
  }>(
    `query Categories($input: CategoriesInput) {
      categories(input: $input) {
        items { id kind name slug animeCount }
      }
    }`,
    { input: { limit, offset: 0 } },
  )
  const items = Array.isArray(data.categories.items)
    ? data.categories.items
    : []
  const out: OtakuCategory[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const v = raw as Record<string, unknown>
    if (
      typeof v.id !== 'string' ||
      typeof v.name !== 'string' ||
      typeof v.slug !== 'string'
    ) {
      continue
    }
    out.push({
      id: v.id,
      kind: typeof v.kind === 'string' ? v.kind : 'GENRE',
      name: v.name,
      slug: v.slug,
      animeCount: typeof v.animeCount === 'number' ? v.animeCount : 0,
    })
  }
  return out
}

export async function fetchAnimesByCategory(
  categoryId: string,
  limit = 48,
  offset = 0,
): Promise<{ total: number; items: OtakuAnime[] }> {
  const data = await gql<{
    animesByCategory: { total?: number; items?: unknown }
  }>(
    `query AnimesByCategory($input: AnimesByCategoryInput!) {
      animesByCategory(input: $input) {
        total
        items { ...AnimeFields }
      }
    }
    ${ANIME_FIELDS}`,
    { input: { categoryId, limit, offset } },
  )
  return {
    total: data.animesByCategory.total ?? 0,
    items: mapAnimes(data.animesByCategory.items),
  }
}

export async function searchAnimes(
  query: string,
  limit = 48,
  offset = 0,
): Promise<{ total: number; items: OtakuAnime[] }> {
  const q = query.trim()
  if (!q) return { total: 0, items: [] }
  const data = await gql<{
    searchAnimes: { total?: number; items?: unknown }
  }>(
    `query SearchAnimes($input: SearchAnimesInput) {
      searchAnimes(input: $input) {
        total
        items { ...AnimeFields }
      }
    }
    ${ANIME_FIELDS}`,
    { input: { query: q, limit, offset } },
  )
  return {
    total: data.searchAnimes.total ?? 0,
    items: mapAnimes(data.searchAnimes.items),
  }
}

export async function fetchAnimeDetail(
  upstreamCid: number,
  upstreamTid?: number,
): Promise<OtakuCatalogDetail> {
  const data = await gql<{ animeCatalogDetail: unknown }>(
    `query AnimeCatalogDetail($upstreamCid: Int!, $upstreamTid: Int) {
      animeCatalogDetail(upstreamCid: $upstreamCid, upstreamTid: $upstreamTid) {
        anime { ...AnimeFields }
        seasons {
          id upstreamTid name slug imageUrl audioType year status
        }
        episodes {
          id upstreamId title slug episodeNumber upstreamTempId
          description videoUrl videoUrlFhd videoUrlSd
          thumbnailLarge thumbnailSmall audioType isNew
        }
      }
    }
    ${ANIME_FIELDS}`,
    { upstreamCid, upstreamTid: upstreamTid ?? null },
  )

  const raw = data.animeCatalogDetail as Record<string, unknown> | null
  const anime = asAnime(raw?.anime)
  if (!anime) throw new Error('Anime não encontrado')

  const seasons: OtakuSeason[] = []
  if (Array.isArray(raw?.seasons)) {
    for (const s of raw.seasons) {
      if (!s || typeof s !== 'object') continue
      const v = s as Record<string, unknown>
      if (typeof v.id !== 'string' || typeof v.name !== 'string') continue
      const upstreamTidNum =
        typeof v.upstreamTid === 'number'
          ? v.upstreamTid
          : Number.parseInt(String(v.upstreamTid ?? ''), 10)
      seasons.push({
        id: v.id,
        upstreamTid: Number.isFinite(upstreamTidNum) ? upstreamTidNum : 0,
        name: v.name,
        slug: typeof v.slug === 'string' ? v.slug : v.id,
        imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : undefined,
        audioType: typeof v.audioType === 'string' ? v.audioType : undefined,
        year: typeof v.year === 'number' ? v.year : undefined,
        status: typeof v.status === 'string' ? v.status : undefined,
      })
    }
  }

  const episodes: OtakuEpisode[] = []
  if (Array.isArray(raw?.episodes)) {
    for (const e of raw.episodes) {
      if (!e || typeof e !== 'object') continue
      const v = e as Record<string, unknown>
      if (typeof v.id !== 'string' || typeof v.title !== 'string') continue
      const upstreamId =
        typeof v.upstreamId === 'number'
          ? v.upstreamId
          : Number.parseInt(String(v.upstreamId ?? ''), 10)
      episodes.push({
        id: v.id,
        upstreamId: Number.isFinite(upstreamId) ? upstreamId : 0,
        title: v.title,
        slug: typeof v.slug === 'string' ? v.slug : v.id,
        episodeNumber:
          typeof v.episodeNumber === 'number' ? v.episodeNumber : 0,
        upstreamTempId:
          typeof v.upstreamTempId === 'number' ? v.upstreamTempId : undefined,
        description:
          typeof v.description === 'string' ? v.description : undefined,
        videoUrl: typeof v.videoUrl === 'string' ? v.videoUrl : undefined,
        videoUrlFhd:
          typeof v.videoUrlFhd === 'string' ? v.videoUrlFhd : undefined,
        videoUrlSd: typeof v.videoUrlSd === 'string' ? v.videoUrlSd : undefined,
        thumbnailLarge:
          typeof v.thumbnailLarge === 'string' ? v.thumbnailLarge : undefined,
        thumbnailSmall:
          typeof v.thumbnailSmall === 'string' ? v.thumbnailSmall : undefined,
        audioType: typeof v.audioType === 'string' ? v.audioType : undefined,
        isNew: Boolean(v.isNew),
      })
    }
  }

  return { anime, seasons, episodes }
}
