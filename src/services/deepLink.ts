import type { Platform } from '@/domain/types'
import { extractNetflixId } from '@/services/justwatch'

export interface DeepLinkContext {
  title: string
  tmdbId?: number
  netflixId?: string
  providerUrl?: string
  youtubeVideoId?: string
}

/** Extrai ID/path útil de URLs JustWatch → Max. */
export function extractMaxContentRef(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    if (!/max\.com$/i.test(u.hostname) && !u.hostname.includes('max.com')) {
      return undefined
    }
    // play.max.com/movie/uuid | /show/uuid | /video/watch/uuid
    const path = u.pathname.replace(/\/+$/, '')
    if (path.length > 1) return `https://play.max.com${path}`
  } catch {
    // ignore
  }
  return undefined
}

export function extractGloboplayPath(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    if (!u.hostname.includes('globoplay.globo.com')) return undefined
    return u.toString()
  } catch {
    return undefined
  }
}

/**
 * Um único payload de deep link.
 * Max: perfil na abertura é comportamento do app Max (não dá para pular via Luna).
 * Globoplay: URLs de busca quebram o app — só deep link com URL JustWatch real,
 * senão abre o app limpo.
 */
export function pickBestDeepLink(
  platform: Platform,
  ctx: DeepLinkContext,
): Record<string, unknown> | undefined {
  const title = ctx.title.trim()
  const q = encodeURIComponent(title)

  const netflixId =
    ctx.netflixId ??
    (platform === 'netflix' ? extractNetflixId(ctx.providerUrl) : undefined)

  switch (platform) {
    case 'netflix': {
      if (netflixId) {
        const id = netflixId.replace(/\D/g, '')
        return {
          contentTarget: `m=http://api.netflix.com/catalog/titles/movies/${id}&source_type=4`,
          contentId: `m=https://www.netflix.com/title/${id}`,
        }
      }
      if (ctx.providerUrl) {
        const fromUrl = extractNetflixId(ctx.providerUrl)
        if (fromUrl) {
          return {
            contentTarget: `m=http://api.netflix.com/catalog/titles/movies/${fromUrl}&source_type=4`,
            contentId: `m=https://www.netflix.com/title/${fromUrl}`,
          }
        }
      }
      return {
        contentTarget: `m=https://www.netflix.com/search?q=${q}`,
        contentId: `https://www.netflix.com/search?q=${q}`,
      }
    }
    case 'youtube': {
      if (ctx.youtubeVideoId) {
        return { contentTarget: `v=${ctx.youtubeVideoId}` }
      }
      return {
        contentTarget: `https://www.youtube.com/results?search_query=${q}`,
      }
    }
    case 'disney': {
      if (ctx.providerUrl) {
        return { contentTarget: ctx.providerUrl, contentId: ctx.providerUrl }
      }
      // Sem URL JustWatch: abre o app limpo (busca Disney costuma ignorar params).
      return undefined
    }
    case 'hbomax': {
      const maxRef = extractMaxContentRef(ctx.providerUrl) ?? ctx.providerUrl
      if (maxRef) {
        // Formato mais próximo do que o app Max aceita no webOS.
        return {
          contentTarget: maxRef,
          contentId: maxRef,
          deepLink: maxRef,
        }
      }
      // Sem ID: abrir limpo — search URL só mostra perfil e home.
      return undefined
    }
    case 'globoplay': {
      const gp = extractGloboplayPath(ctx.providerUrl)
      if (gp) {
        return {
          contentTarget: gp,
          contentId: gp,
        }
      }
      // Busca por título derruba/ignora o Globoplay na TV — só abre o app.
      return undefined
    }
    default:
      return undefined
  }
}

export function buildDeepLinkAttempts(
  platform: Platform,
  ctx: DeepLinkContext,
): Array<Record<string, unknown> | undefined> {
  return [pickBestDeepLink(platform, ctx), undefined]
}
