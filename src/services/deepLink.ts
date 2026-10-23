import type { Platform } from '@/domain/types'

export interface DeepLinkContext {
  title: string
  tmdbId?: number
  /** ID numérico Netflix (quando conhecido). */
  netflixId?: string
  /** ID de vídeo YouTube (trailer/título). */
  youtubeVideoId?: string
}

/**
 * Monta tentativas de deep link por plataforma.
 * Ordem: mais específico → fallback (busca) → só abrir o app (sem params).
 *
 * Limitação real: Disney+/Max/Globoplay não documentam deep link de título
 * na TV; Netflix exige ID interno (não o nome). Tentamos URLs conhecidas
 * da comunidade webOS e, se falharem, o launch abre só o app.
 */
export function buildDeepLinkAttempts(
  platform: Platform,
  ctx: DeepLinkContext,
): Array<Record<string, unknown> | undefined> {
  const title = ctx.title.trim()
  const q = encodeURIComponent(title)

  switch (platform) {
    case 'netflix': {
      const attempts: Array<Record<string, unknown> | undefined> = []
      if (ctx.netflixId) {
        const id = ctx.netflixId.replace(/\D/g, '')
        attempts.push({
          contentTarget: `m=http://api.netflix.com/catalog/titles/movies/${id}&source_type=4`,
        })
        attempts.push({
          contentId: `m=https://www.netflix.com/title/${id}`,
        })
        attempts.push({
          contentTarget: `m=https://www.netflix.com/watch/${id}`,
        })
      }
      // Busca por título — algumas versões do app aceitam.
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
        return [
          { contentTarget: `v=${ctx.youtubeVideoId}` },
          {
            contentTarget: `https://www.youtube.com/watch?v=${ctx.youtubeVideoId}`,
          },
          undefined,
        ]
      }
      return [
        { contentTarget: `q=${q}` },
        {
          contentTarget: `https://www.youtube.com/results?search_query=${q}`,
        },
        undefined,
      ]
    }
    case 'disney':
      return [
        { contentTarget: `https://www.disneyplus.com/search/${q}` },
        { contentId: `https://www.disneyplus.com/search?q=${q}` },
        undefined,
      ]
    case 'hbomax':
      return [
        { contentTarget: `https://play.max.com/search?q=${q}` },
        { contentId: `https://play.max.com/search?q=${q}` },
        undefined,
      ]
    case 'globoplay':
      return [
        {
          contentTarget: `https://globoplay.globo.com/busca/?q=${q}`,
        },
        undefined,
      ]
    default:
      return [undefined]
  }
}
