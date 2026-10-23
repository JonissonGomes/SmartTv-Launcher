import { describe, expect, it } from 'vitest'
import { pickAfStream } from '@/domain/animefire'
import { animePageUrl } from '@/services/animefire'

describe('animefire helpers', () => {
  it('prioriza stream dublado', () => {
    expect(
      pickAfStream([
        { audio: 'legendado', url: 'https://cdn/leg', qualities: [] },
        { audio: 'dublado', url: 'https://cdn/dub', qualities: ['720p'] },
      ]),
    ).toBe('https://cdn/dub')
  })

  it('monta URL da página', () => {
    expect(animePageUrl('abc123')).toBe('https://animefire.one/anime/abc123')
  })
})
