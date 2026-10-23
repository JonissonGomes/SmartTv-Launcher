import type { Platform } from '@/domain/types'
import { extractNetflixId } from '@/services/justwatch'

export interface DeepLinkContext {
  title: string
  tmdbId?: number
  /** ID numérico Netflix (quando conhecido via JustWatch). */
  netflixId?: string
  /** URL direta do provedor (JustWatch standardWebURL). */
  providerUrl?: string
  /** ID de vídeo YouTube (trailer/título). */
  youtubeVideoId?: string
}

function pushUrlAttempts(
  attempts: Array<Record<string, unknown> | undefined>,
  url: string,
): void {
  attempts.push({ contentTarget: url })
  attempts.push({ contentId: url })
  attempts.push({ contentTarget: `m=${url}` })
  attempts.push({ contentId: `m=${url}` })
}

/**
 * Monta tentativas de deep link por plataforma.
 * Ordem: URL JustWatch / ID Netflix → busca → abrir app limpo.
 */
export function buildDeepLinkAttempts(
  platform: Platform,
  ctx: DeepLinkContext,
): Array<Record<string, unknown> | undefined> {
  const title = ctx.title.trim()
  const q = encodeURIComponent(title)
  const attempts: Array<Record<string, unknown> | undefined> = []

  const netflixId =
    ctx.netflixId ??
    (platform === 'netflix' ? extractNetflixId(ctx.providerUrl) : undefined)

  if (ctx.providerUrl) {
    pushUrlAttempts(attempts, ctx.providerUrl)
  }

  switch (platform) {
    case 'netflix': {
      if (netflixId) {
        const id = netflixId.replace(/\D/g, '')
        attempts.push({
          contentTarget: `m=http://api.netflix.com/catalog/titles/movies/${id}&source_type=4`,
        })
        attempts.push({
          contentId: `m=https://www.netflix.com/title/${id}`,
        })
        attempts.push({
          contentTarget: `m=https://www.netflix.com/watch/${id}`,
        })
        attempts.push({
          contentTarget: `https://www.netflix.com/title/${id}`,
        })
      }
      attempts.push({
        contentTarget: `m=https://www.netflix.com/search?q=${q}`,
      })
      attempts.push({
        contentId: `https://www.netflix.com/search?q=${q}`,
      })
      attempts.push(undefined)
      return attempts
    }
    case 'youtube': {
      if (ctx.youtubeVideoId) {
        attempts.push({ contentTarget: `v=${ctx.youtubeVideoId}` })
        attempts.push({
          contentTarget: `https://www.youtube.com/watch?v=${ctx.youtubeVideoId}`,
        })
      }
      attempts.push({ contentTarget: `q=${q}` })
      attempts.push({
        contentTarget: `https://www.youtube.com/results?search_query=${q}`,
      })
      attempts.push(undefined)
      return attempts
    }
    case 'disney':
      attempts.push({
        contentTarget: `https://www.disneyplus.com/search/${q}`,
      })
      attempts.push(undefined)
      return attempts
    case 'hbomax':
      attempts.push({
        contentTarget: `https://play.max.com/search?q=${q}`,
      })
      attempts.push(undefined)
      return attempts
    case 'globoplay':
      attempts.push({
        contentTarget: `https://globoplay.globo.com/busca/?q=${q}`,
      })
      attempts.push(undefined)
      return attempts
    default:
      attempts.push(undefined)
      return attempts
  }
}
