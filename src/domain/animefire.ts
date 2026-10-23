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
  /** CDN/player marcado offline pela AnimeFire. */
  isOffline?: boolean
}

export interface AfStatusNotice {
  id: string
  body: string
  severity: 'info' | 'warning'
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
  return pickAfStreamCandidates(streams)[0] ?? ''
}

/** URLs candidatas (dublado primeiro; ignora is_offline). */
export function pickAfStreamCandidates(streams: AfStream[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (url?: string) => {
    const u = url?.trim()
    if (!u || seen.has(u)) return
    seen.add(u)
    out.push(u)
  }
  const online = streams.filter((s) => !s.isOffline)
  const pool = online.length > 0 ? online : streams
  for (const s of pool) {
    if (/dublado/i.test(s.audio)) push(s.url)
  }
  for (const s of pool) push(s.url)
  return out
}

export function streamsAllOffline(streams: AfStream[]): boolean {
  if (streams.length === 0) return false
  return streams.every((s) => s.isOffline || !s.url?.trim())
}
