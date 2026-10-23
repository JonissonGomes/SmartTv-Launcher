import { describe, expect, it } from 'vitest'
import { contentTypeLabel, pickEpisodeStream } from '@/domain/otaku'
import { animePageUrl } from '@/services/otakulogia'

describe('otakulogia helpers', () => {
  it('rotula content types', () => {
    expect(contentTypeLabel('anime')).toBe('Animes')
    expect(contentTypeLabel('dong')).toBe('Donghuas')
    expect(contentTypeLabel('filme')).toBe('Filmes')
  })

  it('escolhe melhor stream do episódio', () => {
    expect(
      pickEpisodeStream({
        id: '1',
        upstreamId: 1,
        title: 'EP',
        slug: 'ep',
        episodeNumber: 1,
        videoUrl: 'https://cdn.example/a.mp4',
        videoUrlFhd: 'https://cdn.example/a-fhd.mp4',
      }),
    ).toContain('fhd')
  })

  it('monta URL da página do anime', () => {
    expect(animePageUrl('naruto')).toBe('https://otakulogia.com/anime/naruto')
  })
})
