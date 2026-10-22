export type Platform =
  | 'netflix'
  | 'disney'
  | 'hbomax'
  | 'globoplay'
  | 'youtube'

export type MediaType = 'movie' | 'tv'

export type AppView =
  | 'home'
  | 'search'
  | 'settings'
  | 'history'
  | 'platform'
  | 'categories'
  | 'surprise'
  | 'games'

export interface UserProfile {
  id: string
  name: string
  /** Cor do avatar (hex). */
  color: string
  /** Gêneros TMDB preferidos (personalizam o catálogo). */
  preferredGenreIds: number[]
  createdAt: string
}

export interface WatchEntry {
  id: string
  /** Perfil dono do histórico (personalização). */
  profileId?: string
  tmdbId?: number
  mediaType: MediaType
  title: string
  platform: Platform
  genreIds: number[]
  season?: number
  episode?: number
  progressPct?: number
  lastWatchedAt: string
  finished: boolean
  posterPath?: string
  backdropPath?: string
  overview?: string
  voteAverage?: number
}

export interface AppConfig {
  platform: Platform
  label: string
  /** TODO: validar com listApps na TV / Simulator */
  webosAppId: string
  color: string
  deepLink?: (e: {
    tmdbId?: number
    title: string
  }) => Record<string, unknown> | null
}

export interface CatalogItem {
  tmdbId: number
  mediaType: MediaType
  title: string
  overview: string
  posterPath: string | null
  backdropPath: string | null
  genreIds: number[]
  voteAverage: number
  releaseYear?: number
  platforms: Platform[]
}

export interface ContentRow {
  id: string
  title: string
  items: CatalogItem[]
}

export interface GenreScore {
  genreId: number
  score: number
}
