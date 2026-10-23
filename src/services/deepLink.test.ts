import { describe, expect, it } from 'vitest'
import { pickBestDeepLink } from '@/services/deepLink'

describe('deepLink', () => {
  it('netflix prioriza ID interno em um único payload', () => {
    const deep = pickBestDeepLink('netflix', {
      title: 'Interestelar',
      providerUrl: 'https://www.netflix.com/title/80057281',
      netflixId: '80057281',
    })
    expect(deep?.contentTarget).toContain('80057281')
    expect(deep?.contentId).toContain('80057281')
  })

  it('youtube usa video id quando disponível', () => {
    const deep = pickBestDeepLink('youtube', {
      title: 'Trailer',
      youtubeVideoId: 'abc123',
    })
    expect(deep).toEqual({ contentTarget: 'v=abc123' })
  })

  it('disney usa URL JustWatch se houver', () => {
    const deep = pickBestDeepLink('disney', {
      title: 'Moana',
      providerUrl: 'https://www.disneyplus.com/movies/moana/abc',
    })
    expect(deep?.contentTarget).toContain('disneyplus.com')
  })
})
