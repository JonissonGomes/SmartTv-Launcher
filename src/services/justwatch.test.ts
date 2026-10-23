import { describe, expect, it } from 'vitest'
import { extractNetflixId } from '@/services/justwatch'

describe('justwatch helpers', () => {
  it('extrai ID Netflix de URLs comuns', () => {
    expect(
      extractNetflixId('https://www.netflix.com/title/80057281'),
    ).toBe('80057281')
    expect(
      extractNetflixId('https://www.netflix.com/br/title/80057281'),
    ).toBe('80057281')
    expect(
      extractNetflixId('https://www.netflix.com/watch/80100172?trackId=1'),
    ).toBe('80100172')
    expect(extractNetflixId('https://www.disneyplus.com/x')).toBeUndefined()
  })
})
