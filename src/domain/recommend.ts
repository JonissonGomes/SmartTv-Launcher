import type { CatalogItem, GenreScore, WatchEntry } from '@/domain/types'

const RECENCY_WEIGHTS = [1.0, 0.8, 0.6, 0.45, 0.3] as const

export function getRecentDistinctEntries(
  history: WatchEntry[],
  limit = 5,
): WatchEntry[] {
  const seen = new Set<string>()
  const result: WatchEntry[] = []

  const sorted = [...history].sort(
    (a, b) =>
      new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
  )

  for (const entry of sorted) {
    const key = entry.tmdbId
      ? `${entry.mediaType}:${String(entry.tmdbId)}`
      : `title:${entry.title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(entry)
    if (result.length >= limit) break
  }

  return result
}

export function buildGenreScores(entries: WatchEntry[]): GenreScore[] {
  const map = new Map<number, number>()

  entries.forEach((entry, index) => {
    const weight = RECENCY_WEIGHTS[index] ?? 0.2
    for (const genreId of entry.genreIds) {
      map.set(genreId, (map.get(genreId) ?? 0) + weight)
    }
  })

  return [...map.entries()]
    .map(([genreId, score]) => ({ genreId, score }))
    .sort((a, b) => b.score - a.score)
}

export function topGenreIds(scores: GenreScore[], limit = 3): number[] {
  return scores.slice(0, limit).map((s) => s.genreId)
}

function normalizePopularity(voteAverage: number): number {
  return Math.min(1, Math.max(0, voteAverage / 10))
}

function genreAffinity(item: CatalogItem, scores: GenreScore[]): number {
  if (scores.length === 0 || item.genreIds.length === 0) return 0
  const scoreMap = new Map(scores.map((s) => [s.genreId, s.score]))
  const maxScore = scores[0]?.score ?? 1
  let total = 0
  for (const genreId of item.genreIds) {
    total += (scoreMap.get(genreId) ?? 0) / maxScore
  }
  return total / item.genreIds.length
}

export function scoreCandidate(
  item: CatalogItem,
  scores: GenreScore[],
  ownedPlatforms: Set<string>,
): number {
  const affinity = genreAffinity(item, scores)
  const popularity = normalizePopularity(item.voteAverage)
  const platformBonus = item.platforms.some((p) => ownedPlatforms.has(p))
    ? 0.25
    : 0
  return affinity * 0.6 + popularity * 0.15 + platformBonus
}

export function rankRecommendations(
  candidates: CatalogItem[],
  history: WatchEntry[],
  ownedPlatforms: string[],
  limit = 20,
): CatalogItem[] {
  const recent = getRecentDistinctEntries(history, 5)
  const scores = buildGenreScores(recent)
  const owned = new Set(ownedPlatforms)

  const watched = new Set(
    history
      .filter((e) => e.tmdbId !== undefined)
      .map((e) => `${e.mediaType}:${String(e.tmdbId)}`),
  )

  const unique = new Map<string, CatalogItem>()
  for (const item of candidates) {
    const key = `${item.mediaType}:${String(item.tmdbId)}`
    if (watched.has(key)) continue
    if (!unique.has(key)) unique.set(key, item)
  }

  const ranked = [...unique.values()]
    .map((item) => ({
      item,
      score: scoreCandidate(item, scores, owned),
    }))
    .sort((a, b) => {
      const diff = b.score - a.score
      if (Math.abs(diff) < 0.05) {
        return Math.random() - 0.5
      }
      return diff
    })
    .slice(0, limit)
    .map((r) => r.item)

  return ranked
}

export { RECENCY_WEIGHTS }
