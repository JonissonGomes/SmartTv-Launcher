/** Tipos do catálogo AnimeFire (api.animefire.one). */

export interface AfAnime {
  id: string
  name: string
  posterUrl?: string
  backdropUrl?: string
  audio?: string
  status?: string
  synopsis?: string
  score?: number
  genres?: string[]
  year?: number
  mostLiked?: boolean
}

export interface AfEpisode {
  id: string
  title: string
  season: number
  number: number
  audio?: string
  stillUrl?: string
  synopsis?: string
}

export interface AfSeason {
  number: number
  title?: string
  firstEpisodeNumber: number
}

export interface AfStream {
  audio: string
  url: string
  qualities: string[]
}

export interface AfCatalogSection {
  id: string
  title: string
  path: string
}

export const AF_SECTIONS: AfCatalogSection[] = [
  { id: 'destaques', title: 'Animes', path: '/animes' },
  { id: 'filmes', title: 'Filmes', path: '/animes/filmes' },
  { id: 'em-breve', title: 'Em breve', path: '/animes/em-breve' },
]

export type AfAudioFilter = '' | 'dublado' | 'legendado'

export const AF_AUDIO_FILTERS: Array<{ id: AfAudioFilter; label: string }> = [
  { id: '', label: 'Todos' },
  { id: 'dublado', label: 'Dublado' },
  { id: 'legendado', label: 'Legendado' },
]

export const AF_GENRES = [
  'Ação',
  'Aventura',
  'Comédia',
  'Drama',
  'Fantasia',
  'Romance',
  'Terror',
  'Sci-Fi',
  'Shounen',
  'Slice of Life',
] as const

export function pickAfStream(streams: AfStream[]): string {
  const dub = streams.find((s) => /dublado/i.test(s.audio) && s.url)
  const any = streams.find((s) => s.url)
  return (dub ?? any)?.url?.trim() ?? ''
}
