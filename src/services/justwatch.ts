import type { MediaType, Platform } from '@/domain/types'
import { TMDB_PROVIDER_IDS } from '@/services/tmdb'

/**
 * JustWatch GraphQL (não oficial, uso pessoal).
 * TMDB só diz *onde* está; JustWatch devolve a URL direta (com ID Netflix etc.).
 * Atribuir JustWatch na UI quando usar estes dados.
 */

const JUSTWATCH_GRAPHQL = 'https://apis.justwatch.com/graphql'
const CACHE_TTL_MS = 12 * 60 * 60 * 1000

const SEARCH_QUERY = `
query($country: Country!, $language: Language!, $first: Int!, $filter: TitleFilter) {
  popularTitles(country: $country, first: $first, filter: $filter) {
    edges {
      node {
        objectType
        content(country: $country, language: $language) {
          title
          originalReleaseYear
          externalIds { tmdbId imdbId }
        }
        offers(country: $country, platform: WEB) {
          monetizationType
          standardWebURL
          package { packageId clearName }
        }
      }
    }
  }
}`

interface JwOffer {
  monetizationType?: string
  standardWebURL?: string
  package?: { packageId?: number; clearName?: string }
}

interface JwNode {
  objectType?: string
  content?: {
    title?: string
    originalReleaseYear?: number
    externalIds?: { tmdbId?: string; imdbId?: string }
  }
  offers?: JwOffer[]
}

interface CacheEntry {
  expiresAt: number
  links: Partial<Record<Platform, string>>
}

const memoryCache = new Map<string, CacheEntry>()

/** packageId JustWatch ≈ provider_id TMDB */
const PACKAGE_TO_PLATFORM: Record<number, Platform> = {
  8: 'netflix',
  337: 'disney',
  1899: 'hbomax',
  384: 'hbomax',
  1825: 'hbomax',
  307: 'globoplay',
  350: 'disney',
}

export function extractNetflixId(url: string | undefined): string | undefined {
  if (!url) return undefined
  const match = url.match(/netflix\.com\/(?:[a-z]{2}\/)?(?:title|watch)\/(\d+)/i)
  return match?.[1]
}

export function extractProviderIdFromUrl(
  platform: Platform,
  url: string,
): string | undefined {
  if (platform === 'netflix') return extractNetflixId(url)
  return undefined
}

function cacheKey(title: string, mediaType: MediaType, tmdbId?: number): string {
  return `${mediaType}:${String(tmdbId ?? 0)}:${title.toLowerCase()}`
}

function mapOffersToPlatforms(
  offers: JwOffer[],
): Partial<Record<Platform, string>> {
  const links: Partial<Record<Platform, string>> = {}
  for (const offer of offers) {
    const pid = offer.package?.packageId
    const url = offer.standardWebURL
    if (!pid || !url) continue
    const platform = PACKAGE_TO_PLATFORM[pid]
    if (!platform) continue
    // Prefer flatrate / free over rent/buy when múltiplos.
    if (!links[platform] || offer.monetizationType === 'FLATRATE') {
      links[platform] = url
    }
  }
  return links
}

export async function fetchProviderDeepLinks(input: {
  title: string
  mediaType: MediaType
  tmdbId?: number
  year?: number
  country?: string
  language?: string
}): Promise<Partial<Record<Platform, string>>> {
  const country = (input.country ?? 'BR').toUpperCase()
  const language = input.language ?? 'pt'
  const key = cacheKey(input.title, input.mediaType, input.tmdbId)
  const cached = memoryCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.links

  const wantType = input.mediaType === 'tv' ? 'SHOW' : 'MOVIE'
  const tmdbKey = input.tmdbId
    ? `${input.mediaType === 'tv' ? 'tv' : 'movie'}/${String(input.tmdbId)}`
    : undefined

  try {
    const res = await fetch(JUSTWATCH_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: {
          country,
          language,
          first: 8,
          filter: { searchQuery: input.title },
        },
      }),
      signal: (() => {
        const ctrl = new AbortController()
        window.setTimeout(() => ctrl.abort(), 8000)
        return ctrl.signal
      })(),
    })

    if (!res.ok) {
      memoryCache.set(key, { expiresAt: Date.now() + 60_000, links: {} })
      return {}
    }

    const json = (await res.json()) as {
      data?: { popularTitles?: { edges?: Array<{ node: JwNode }> } }
    }

    const nodes = (json.data?.popularTitles?.edges ?? [])
      .map((e) => e.node)
      .filter((n) => n.objectType === wantType)

    const byTmdb = tmdbKey
      ? nodes.find((n) => n.content?.externalIds?.tmdbId === tmdbKey)
      : undefined
    const byYear =
      input.year != null
        ? nodes.find((n) => n.content?.originalReleaseYear === input.year)
        : undefined
    const chosen = byTmdb ?? byYear ?? nodes[0]
    const links = mapOffersToPlatforms(chosen?.offers ?? [])

    // Garante mapeamento mesmo se packageId variar — tenta pelo nome.
    for (const offer of chosen?.offers ?? []) {
      const name = (offer.package?.clearName ?? '').toLowerCase()
      const url = offer.standardWebURL
      if (!url) continue
      if (!links.netflix && name.includes('netflix')) links.netflix = url
      if (!links.disney && name.includes('disney')) links.disney = url
      if (
        !links.hbomax &&
        (name.includes('max') || name.includes('hbo'))
      ) {
        links.hbomax = url
      }
      if (!links.globoplay && name.includes('globo')) links.globoplay = url
    }

    memoryCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      links,
    })
    return links
  } catch {
    memoryCache.set(key, { expiresAt: Date.now() + 60_000, links: {} })
    return {}
  }
}

/** Plataformas que temos ID TMDB conhecido (para UI). */
export function knownProviderPackageIds(): number[] {
  return Object.values(TMDB_PROVIDER_IDS).filter(
    (id): id is number => typeof id === 'number',
  )
}
