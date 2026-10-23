import type { LibraryCatalog, LibraryItem, LibraryRow } from '@/domain/library'
import { normalizeHttpsUrl } from '@/services/urlSafety'

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
      items.push({
        id: item.id,
        title: item.title,
        subtitle: typeof item.subtitle === 'string' ? item.subtitle : undefined,
        poster: typeof item.poster === 'string' ? item.poster : undefined,
        backdrop: typeof item.backdrop === 'string' ? item.backdrop : undefined,
        streamUrl,
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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: (() => {
      const c = new AbortController()
      window.setTimeout(() => c.abort(), 10_000)
      return c.signal
    })(),
  })
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
  return res.json()
}

/**
 * 1) `{libraryBaseUrl}/launcher/catalog.json` (site do usuário)
 * 2) catálogo empacotado em `./library/catalog.json`
 */
export async function loadLibraryCatalog(
  libraryBaseUrl: string,
): Promise<{ catalog: LibraryCatalog; source: 'remote' | 'bundled' }> {
  const base = normalizeHttpsUrl(libraryBaseUrl)

  if (base) {
    try {
      const remoteUrl = new URL('/launcher/catalog.json', base).toString()
      const remote = sanitizeCatalog(await fetchJson(remoteUrl))
      if (remote) return { catalog: remote, source: 'remote' }
    } catch {
      // cai no bundled
    }
  }

  const bundled = sanitizeCatalog(
    await fetchJson(new URL('library/catalog.json', window.location.href).toString()),
  )
  if (bundled) return { catalog: bundled, source: 'bundled' }

  return {
    catalog: {
      version: 1,
      title: 'Biblioteca',
      rows: [],
    },
    source: 'bundled',
  }
}
