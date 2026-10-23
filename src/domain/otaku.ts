/** Tipos do catálogo Otakulogia (API GraphQL). */

export type OtakuCategoryKind = 'GENRE' | 'CONTENT_TYPE' | string

export interface OtakuAnime {
  id: string
  upstreamCid: number
  name: string
  slug: string
  nameEn?: string
  year?: number
  status?: string
  synopsis?: string
  posterUrl?: string
  audioMix?: string
  hasNewEpisode?: boolean
}

export interface OtakuCategory {
  id: string
  kind: OtakuCategoryKind
  name: string
  slug: string
  animeCount: number
}

export interface OtakuSeason {
  id: string
  upstreamTid: number
  name: string
  slug: string
  imageUrl?: string
  audioType?: string
  year?: number
  status?: string
}

export interface OtakuEpisode {
  id: string
  upstreamId: number
  title: string
  slug: string
  episodeNumber: number
  upstreamTempId?: number
  description?: string
  videoUrl?: string
  videoUrlFhd?: string
  videoUrlSd?: string
  thumbnailLarge?: string
  thumbnailSmall?: string
  audioType?: string
  isNew?: boolean
}

export interface OtakuCatalogDetail {
  anime: OtakuAnime
  seasons: OtakuSeason[]
  episodes: OtakuEpisode[]
}

export function pickEpisodeStream(ep: OtakuEpisode): string {
  return (ep.videoUrlFhd || ep.videoUrl || ep.videoUrlSd || '').trim()
}

export function contentTypeLabel(name: string): string {
  const key = name.trim().toLowerCase()
  if (key === 'anime') return 'Animes'
  if (key === 'filme') return 'Filmes'
  if (key === 'dong') return 'Donghuas'
  if (key === 'desen') return 'Desenhos'
  return name.charAt(0).toUpperCase() + name.slice(1)
}
