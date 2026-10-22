import type { CatalogItem, ContentRow, WatchEntry } from '@/domain/types'
import { getRecentDistinctEntries } from '@/domain/recommend'

export interface JevCurateResult {
  featuredId: string | null
  primaryRowId: string | null
  relevanceScore: number | null
  source: 'jev' | 'local'
}

interface JevApiResponse {
  ok: boolean
  featuredId?: string | null
  primaryRowId?: string | null
  relevanceScore?: number | null
  reason?: string
}

function localCurate(
  history: WatchEntry[],
  candidates: CatalogItem[],
  rows: ContentRow[],
): JevCurateResult {
  const recent = getRecentDistinctEntries(history, 5)
  const recentGenres = new Set(recent.flatMap((e) => e.genreIds))

  const scored = candidates
    .map((item) => {
      const genreHits = item.genreIds.filter((g) => recentGenres.has(g)).length
      const popularity = item.voteAverage / 10
      return { item, score: genreHits * 0.7 + popularity * 0.3 }
    })
    .sort((a, b) => b.score - a.score)

  const preferredRow =
    rows.find((r) => r.id.startsWith('provider-'))?.id ??
    rows.find((r) => r.id === 'trending-movies')?.id ??
    rows[0]?.id ??
    null

  return {
    featuredId: scored[0]
      ? `${scored[0].item.mediaType}:${String(scored[0].item.tmdbId)}`
      : null,
    primaryRowId: preferredRow,
    relevanceScore: scored[0]?.score ?? null,
    source: 'local',
  }
}

/**
 * Tenta curadoria via Jev (proxy Vite /api/jev).
 * No Simulator/TV empacotado cai no ranking local tipado.
 */
export async function curateWithJev(
  history: WatchEntry[],
  candidates: CatalogItem[],
  rows: ContentRow[],
): Promise<JevCurateResult> {
  const fallback = localCurate(history, candidates, rows)
  const recent = getRecentDistinctEntries(history, 5)

  try {
    const res = await fetch('/api/jev/curate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recentTitles: recent.map((e) => e.title),
        candidates: candidates.slice(0, 8).map((c) => ({
          id: `${c.mediaType}:${String(c.tmdbId)}`,
          title: c.title,
          overview: c.overview,
          mediaType: c.mediaType,
        })),
        rowIds: rows.map((r) => r.id).slice(0, 8),
      }),
    })

    if (!res.ok) return fallback
    const data = (await res.json()) as JevApiResponse
    if (!data.ok) return fallback

    return {
      featuredId: data.featuredId ?? fallback.featuredId,
      primaryRowId: data.primaryRowId ?? fallback.primaryRowId,
      relevanceScore: data.relevanceScore ?? fallback.relevanceScore,
      source: 'jev',
    }
  } catch {
    return fallback
  }
}

export function applyCurateToRows(
  rows: ContentRow[],
  primaryRowId: string | null,
): ContentRow[] {
  if (!primaryRowId) return rows
  const idx = rows.findIndex((r) => r.id === primaryRowId)
  if (idx <= 0) return rows
  const next = [...rows]
  const [picked] = next.splice(idx, 1)
  if (!picked) return rows
  // Mantém "continuar" no topo se existir
  if (next[0]?.id === 'continue') {
    next.splice(1, 0, picked)
  } else {
    next.unshift(picked)
  }
  return next
}

export function pickFeaturedCandidate(
  candidates: CatalogItem[],
  featuredId: string | null,
): CatalogItem | undefined {
  if (!featuredId) return candidates[0]
  return (
    candidates.find(
      (c) => `${c.mediaType}:${String(c.tmdbId)}` === featuredId,
    ) ?? candidates[0]
  )
}
