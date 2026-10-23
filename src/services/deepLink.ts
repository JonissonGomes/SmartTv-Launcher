import type { Platform } from '@/domain/types'
import { extractNetflixId } from '@/services/justwatch'

export interface DeepLinkContext {
  title: string
  tmdbId?: number
  netflixId?: string
  providerUrl?: string
  youtubeVideoId?: string
}

/**
 * Um único payload de deep link (melhor esforço).
 * Importante: NÃO encadear vários launches com sucesso — o Luna retorna OK
 * ao só abrir o app, e tentativas extras reiniciam o streaming “do zero”.
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
        // Formato mais citado em integrações webOS / SSAP.
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
        return { contentTarget: ctx.providerUrl, contentId: ctx.providerUrl }
      }
      // Sem ID: abre na busca (melhor que home vazia).
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
    case 'disney':
      if (ctx.providerUrl) {
        return { contentTarget: ctx.providerUrl, contentId: ctx.providerUrl }
      }
      return {
        contentTarget: `https://www.disneyplus.com/search/${q}`,
      }
    case 'hbomax':
      if (ctx.providerUrl) {
        return { contentTarget: ctx.providerUrl, contentId: ctx.providerUrl }
      }
      return { contentTarget: `https://play.max.com/search?q=${q}` }
    case 'globoplay':
      if (ctx.providerUrl) {
        return { contentTarget: ctx.providerUrl, contentId: ctx.providerUrl }
      }
      return {
        contentTarget: `https://globoplay.globo.com/busca/?q=${q}`,
      }
    default:
      return undefined
  }
}

/** @deprecated use pickBestDeepLink — mantido p/ testes legados */
export function buildDeepLinkAttempts(
  platform: Platform,
  ctx: DeepLinkContext,
): Array<Record<string, unknown> | undefined> {
  return [pickBestDeepLink(platform, ctx), undefined]
}
