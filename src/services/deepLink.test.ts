import { describe, expect, it } from 'vitest'
import { buildDeepLinkAttempts } from '@/services/deepLink'

describe('deepLink', () => {
  it('netflix prioriza URL JustWatch / ID interno', () => {
    const attempts = buildDeepLinkAttempts('netflix', {
      title: 'Interestelar',
      providerUrl: 'https://www.netflix.com/title/80057281',
      netflixId: '80057281',
    })
    expect(JSON.stringify(attempts[0])).toContain('80057281')
    expect(attempts.at(-1)).toBeUndefined()
  })

  it('youtube usa video id quando disponível', () => {
    const attempts = buildDeepLinkAttempts('youtube', {
      title: 'Trailer',
      youtubeVideoId: 'abc123',
    })
    expect(attempts[0]).toEqual({ contentTarget: 'v=abc123' })
  })

  it('disney/max incluem busca por título', () => {
    const disney = buildDeepLinkAttempts('disney', { title: 'Moana' })
    expect(JSON.stringify(disney[0])).toContain('Moana')
    const max = buildDeepLinkAttempts('hbomax', { title: 'Dune' })
    expect(JSON.stringify(max[0])).toContain('Dune')
  })
})
