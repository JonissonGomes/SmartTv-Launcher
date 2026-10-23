/** Catálogo nativo da Biblioteca (sem HTML/ads do site). */

export interface LibraryItem {
  id: string
  title: string
  subtitle?: string
  poster?: string
  backdrop?: string
  /** URL direta de mídia (mp4 / m3u8) — reproduz no player do launcher. */
  streamUrl: string
  /** Página do título no site (fallback quando não há streamUrl). */
  pageUrl?: string
  year?: number
  rating?: number
}

export interface LibraryRow {
  id: string
  title: string
  items: LibraryItem[]
}

export interface LibraryCatalog {
  version: number
  title?: string
  updatedAt?: string
  rows: LibraryRow[]
}
