export type Platform =
  | 'netflix'
  | 'disney'
  | 'hbomax'
  | 'globoplay'
  | 'youtube'
  /** Player nativo AnimeFire (in-app, não é app webOS). */
  | 'animefire'

export type MediaType = 'movie' | 'tv'

export type AppView =
  | 'home'
  | 'search'
  | 'settings'
  | 'account'
  | 'history'
  | 'platform'
  | 'categories'
  | 'surprise'
  | 'games'
  /** Player de animes (catálogo nativo + vídeo). */
  | 'anime'
  /** @deprecated use anime */
  | 'library'

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
  /** ID principal (fallback). Preferir candidatos resolvidos na TV. */
  webosAppId: string
  /** IDs possíveis por região/versão — resolvidos via getAppLoadStatus. */
  webosAppIdCandidates?: string[]
  color: string
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
