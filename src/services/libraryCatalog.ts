import type { LibraryCatalog, LibraryItem, LibraryRow } from '@/domain/library'
import { buildCatalogFromSitePages } from '@/services/dooplayCatalog'
import { normalizeHttpsUrl } from '@/services/urlSafety'

export type CatalogSource = 'remote' | 'site' | 'bundled'

/** Sempre disponível — evita tela preta se o fetch falhar. */
export const FALLBACK_ANIME_CATALOG: LibraryCatalog = {
  version: 1,
  title: 'Animes',
  rows: [
    {
      id: 'destaques',
      title: 'Destaques',
      items: [
        {
          id: 'demo-player',
          title: 'Teste do player',
          subtitle: 'Valida o player nativo na TV',
          poster:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
          streamUrl:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          year: 2008,
          rating: 8,
        },
      ],
    },
  ],
}

function isItem(value: unknown): value is LibraryItem {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.title === 'string'
}

function sanitizeCatalog(raw: unknown): LibraryCatalog | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const rowsIn = Array.isArray(data.rows) ? data.rows : []
  const rows: LibraryRow[] = []

  for (const row of rowsIn) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.title !== 'string') continue
    const itemsIn = Array.isArray(r.items) ? r.items : []
    const items: LibraryItem[] = []
    for (const item of itemsIn) {
      if (!isItem(item)) continue
      const streamUrl =
        typeof item.streamUrl === 'string' ? item.streamUrl.trim() : ''
      const pageUrl =
        typeof item.pageUrl === 'string' ? item.pageUrl.trim() : undefined
      items.push({
        id: item.id,
        title: item.title,
        subtitle: typeof item.subtitle === 'string' ? item.subtitle : undefined,
        poster: typeof item.poster === 'string' ? item.poster : undefined,
        backdrop: typeof item.backdrop === 'string' ? item.backdrop : undefined,
        streamUrl,
        pageUrl: pageUrl || undefined,
        year: typeof item.year === 'number' ? item.year : undefined,
        rating: typeof item.rating === 'number' ? item.rating : undefined,
      })
    }
    if (items.length > 0) rows.push({ id: r.id, title: r.title, items })
  }

  if (rows.length === 0) return null
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    title: typeof data.title === 'string' ? data.title : 'Biblioteca',
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    rows,
  }
}

function abortAfter(ms: number): AbortSignal {
  const c = new AbortController()
  window.setTimeout(() => c.abort(), ms)
  return c.signal
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: abortAfter(10_000),
  })
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
  return res.json()
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: 'text/html' },
    signal: abortAfter(12_000),
  })
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
  return res.text()
}

/** Em DEV usa proxy Vite (CORS). Na TV usa a URL do site direto. */
function siteFetchRoot(libraryBase: string): {
  fetchRoot: string
  parseBase: string
} {
  const parseBase = libraryBase.endsWith('/') ? libraryBase : `${libraryBase}/`
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const origin = window.location.origin
    return { fetchRoot: `${origin}/api/library-site/`, parseBase }
  }
  return { fetchRoot: parseBase, parseBase }
}

async function loadFromSite(base: string): Promise<LibraryCatalog | null> {
  const { fetchRoot, parseBase } = siteFetchRoot(base)
  const targets: { label: string; path: string }[] = [
    { label: 'home', path: '' },
    { label: 'episodes', path: 'episodio/' },
    { label: 'anime', path: 'anime/' },
  ]

  const pages: { label: string; html: string }[] = []
  await Promise.all(
    targets.map(async (t) => {
      try {
        const html = await fetchHtml(new URL(t.path, fetchRoot).toString())
        pages.push({ label: t.label, html })
      } catch {
        // página individual falhou — segue com as demais
      }
    }),
  )

  if (pages.length === 0) return null
  return buildCatalogFromSitePages(pages, parseBase)
}

/**
 * 1) `{libraryBaseUrl}/launcher/catalog.json` (JSON com streamUrl)
 * 2) HTML público do site (DooPlay) — títulos/pôsteres
 * 3) catálogo empacotado em `./library/catalog.json`
 * 4) FALLBACK embutido
 */
export async function loadLibraryCatalog(
  libraryBaseUrl: string,
): Promise<{ catalog: LibraryCatalog; source: CatalogSource }> {
  const base = normalizeHttpsUrl(libraryBaseUrl)

  if (base) {
    try {
      const remoteUrl = new URL(
        'launcher/catalog.json',
        base.endsWith('/') ? base : `${base}/`,
      ).toString()
      const remote = sanitizeCatalog(await fetchJson(remoteUrl))
      if (remote) return { catalog: remote, source: 'remote' }
    } catch {
      // cai no scrape do site
    }

    try {
      const site = await loadFromSite(base)
      if (site) return { catalog: site, source: 'site' }
    } catch {
      // cai no bundled
    }
  }

  try {
    const bundledUrl = new URL(
      'library/catalog.json',
      window.location.href,
    ).toString()
    const bundled = sanitizeCatalog(await fetchJson(bundledUrl))
    if (bundled) return { catalog: bundled, source: 'bundled' }
  } catch {
    // cai no fallback
  }

  return {
    catalog: FALLBACK_ANIME_CATALOG,
    source: 'bundled',
  }
}
