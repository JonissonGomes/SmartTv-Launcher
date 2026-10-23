import { describe, expect, it } from 'vitest'
import {
  extractMaxContentRef,
  pickBestDeepLink,
} from '@/services/deepLink'

describe('deepLink', () => {
  it('netflix prioriza ID interno', () => {
    const deep = pickBestDeepLink('netflix', {
      title: 'Interestelar',
      providerUrl: 'https://www.netflix.com/title/80057281',
      netflixId: '80057281',
    })
    expect(deep?.contentTarget).toContain('80057281')
  })

  it('max usa URL play.max.com e sem URL abre limpo', () => {
    const withUrl = pickBestDeepLink('hbomax', {
      title: 'Dune',
      providerUrl: 'https://play.max.com/movie/abc-123',
    })
    expect(String(withUrl?.contentTarget)).toContain('play.max.com/movie/abc-123')
    expect(extractMaxContentRef('https://play.max.com/movie/abc-123')).toContain(
      'abc-123',
    )
    expect(pickBestDeepLink('hbomax', { title: 'Dune' })).toBeUndefined()
  })

  it('globoplay sem JustWatch abre limpo (não manda busca)', () => {
    expect(
      pickBestDeepLink('globoplay', { title: 'Pantanal' }),
    ).toBeUndefined()
    const withUrl = pickBestDeepLink('globoplay', {
      title: 'Pantanal',
      providerUrl: 'https://globoplay.globo.com/titulo/x/',
    })
    expect(withUrl?.contentTarget).toContain('globoplay.globo.com')
  })
})
