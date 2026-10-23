import type { AfAnime } from '@/domain/animefire'
import type { CatalogItem } from '@/domain/types'

/** Título de anime/animação (gênero TMDB 16 ou já marcado AnimeFire). */
export function isAnimeCatalogItem(item: CatalogItem): boolean {
  if (item.platforms.includes('animefire')) return true
  return item.genreIds.includes(16)
}

/** Marca destino AnimeFire nos cards/fileiras de anime. */
export function withAnimeFirePlatform(items: CatalogItem[]): CatalogItem[] {
  return items.map((item) => ({
    ...item,
    platforms: item.platforms.includes('animefire')
      ? item.platforms
      : ['animefire'],
  }))
}

/** Id sintético negativo (evita colisão com TMDB e chaveia o Row). */
function afStableId(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  }
  return -Math.abs(h) || -1
}

/** Lançamento AnimeFire → card do catálogo home. */
export function afAnimeToCatalogItem(anime: AfAnime): CatalogItem {
  return {
    tmdbId: afStableId(anime.id || anime.name),
    mediaType: 'tv',
    title: anime.name,
    overview: anime.synopsis ?? '',
    posterPath: anime.posterUrl ?? null,
    backdropPath: anime.backdropUrl ?? null,
    genreIds: [16],
    voteAverage: typeof anime.score === 'number' ? anime.score : 0,
    releaseYear: anime.year,
    platforms: ['animefire'],
  }
}

/** Item só AnimeFire (sem TMDB) — abrir direto o módulo Animes. */
export function isAnimeFireOnlyItem(item: CatalogItem): boolean {
  return item.platforms[0] === 'animefire' && item.tmdbId <= 0
}
