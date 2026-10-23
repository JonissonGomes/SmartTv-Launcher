import type { MediaType, Platform } from '@/domain/types'

export type PlatformSectionKind = 'discover' | 'search' | 'open_app'

export interface PlatformSection {
  id: string
  label: string
  kind: PlatformSectionKind
  mediaType?: MediaType
  /** Gêneros TMDB (AND). */
  genreIds?: number[]
  /** Busca por texto (TMDB search). */
  query?: string
  /** Ordenação discover. */
  sortBy?: string
  /** Sem conteúdo TMDB — atalho para abrir o app (Ao vivo, Canais…). */
  appHint?: string
}

/**
 * Seções editoriais por streaming.
 * Itens `open_app` cobrem categorias nativas (ao vivo/canais) que a TMDB não lista.
 */
export const PLATFORM_SECTIONS: Record<Platform, PlatformSection[]> = {
  netflix: [
    { id: 'nf-series', label: 'Séries', kind: 'discover', mediaType: 'tv' },
    { id: 'nf-movies', label: 'Filmes', kind: 'discover', mediaType: 'movie' },
    {
      id: 'nf-top',
      label: 'Bem avaliados',
      kind: 'discover',
      mediaType: 'movie',
      sortBy: 'vote_average.desc',
    },
    {
      id: 'nf-action',
      label: 'Ação',
      kind: 'discover',
      mediaType: 'movie',
      genreIds: [28],
    },
    {
      id: 'nf-comedy',
      label: 'Comédia',
      kind: 'discover',
      mediaType: 'tv',
      genreIds: [35],
    },
    {
      id: 'nf-kids',
      label: 'Infantil',
      kind: 'discover',
      mediaType: 'tv',
      genreIds: [10762],
    },
    {
      id: 'nf-docs',
      label: 'Documentários',
      kind: 'discover',
      mediaType: 'movie',
      genreIds: [99],
    },
  ],
  disney: [
    { id: 'ds-movies', label: 'Filmes', kind: 'discover', mediaType: 'movie' },
    { id: 'ds-series', label: 'Séries', kind: 'discover', mediaType: 'tv' },
    {
      id: 'ds-family',
      label: 'Família',
      kind: 'discover',
      mediaType: 'movie',
      genreIds: [10751],
    },
    {
      id: 'ds-anim',
      label: 'Animação',
      kind: 'discover',
      mediaType: 'movie',
      genreIds: [16],
    },
    {
      id: 'ds-marvel',
      label: 'Marvel & heróis',
      kind: 'search',
      query: 'marvel',
    },
    {
      id: 'ds-star',
      label: 'Star',
      kind: 'discover',
      mediaType: 'tv',
      genreIds: [18],
    },
  ],
  hbomax: [
    { id: 'hb-series', label: 'Séries', kind: 'discover', mediaType: 'tv' },
    { id: 'hb-movies', label: 'Filmes', kind: 'discover', mediaType: 'movie' },
    {
      id: 'hb-drama',
      label: 'Drama',
      kind: 'discover',
      mediaType: 'tv',
      genreIds: [18],
    },
    {
      id: 'hb-fantasy',
      label: 'Fantasia',
      kind: 'discover',
      mediaType: 'tv',
      genreIds: [10765],
    },
    {
      id: 'hb-comedy',
      label: 'Comédia',
      kind: 'discover',
      mediaType: 'movie',
      genreIds: [35],
    },
    {
      id: 'hb-docs',
      label: 'Documentários',
      kind: 'discover',
      mediaType: 'movie',
      genreIds: [99],
    },
  ],
  globoplay: [
    {
      id: 'gp-live',
      label: 'Ao vivo',
      kind: 'open_app',
      appHint: 'Canais e transmissão ao vivo no Globoplay',
    },
    {
      id: 'gp-channels',
      label: 'Canais',
      kind: 'open_app',
      appHint: 'Grade de canais dentro do app',
    },
    {
      id: 'gp-novelas',
      label: 'Novelas',
      kind: 'search',
      query: 'novela',
      mediaType: 'tv',
    },
    {
      id: 'gp-series',
      label: 'Séries',
      kind: 'discover',
      mediaType: 'tv',
    },
    {
      id: 'gp-movies',
      label: 'Filmes',
      kind: 'discover',
      mediaType: 'movie',
    },
    {
      id: 'gp-reports',
      label: 'Reportagens',
      kind: 'search',
      query: 'jornalismo',
    },
    {
      id: 'gp-docs',
      label: 'Documentários',
      kind: 'discover',
      mediaType: 'movie',
      genreIds: [99],
    },
    {
      id: 'gp-sports',
      label: 'Esportes',
      kind: 'search',
      query: 'futebol',
    },
    {
      id: 'gp-kids',
      label: 'Infantil',
      kind: 'discover',
      mediaType: 'tv',
      genreIds: [10762],
    },
    {
      id: 'gp-variety',
      label: 'Variedades',
      kind: 'search',
      query: 'programa de auditório',
      mediaType: 'tv',
    },
  ],
  youtube: [
    {
      id: 'yt-live',
      label: 'Ao vivo',
      kind: 'open_app',
      appHint: 'Transmissões ao vivo no YouTube',
    },
    {
      id: 'yt-music',
      label: 'Música',
      kind: 'search',
      query: 'music video',
    },
    {
      id: 'yt-gaming',
      label: 'Games',
      kind: 'search',
      query: 'gameplay',
    },
    {
      id: 'yt-news',
      label: 'Notícias',
      kind: 'search',
      query: 'notícias',
    },
    {
      id: 'yt-trend',
      label: 'Em alta',
      kind: 'discover',
      mediaType: 'movie',
    },
  ],
  animefire: [
    {
      id: 'af-home',
      label: 'Catálogo AnimeFire',
      kind: 'open_app',
      appHint: 'Abra pelo menu Animes',
    },
  ],
}
