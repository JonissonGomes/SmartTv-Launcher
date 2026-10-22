import { describe, expect, it } from 'vitest'
import {
  buildGenreScores,
  getRecentDistinctEntries,
  rankRecommendations,
} from '@/domain/recommend'
import type { CatalogItem, WatchEntry } from '@/domain/types'

function entry(partial: Partial<WatchEntry> & Pick<WatchEntry, 'id' | 'title'>): WatchEntry {
  return {
    mediaType: 'movie',
    platform: 'netflix',
    genreIds: [28],
    lastWatchedAt: new Date().toISOString(),
    finished: false,
    ...partial,
  }
}

describe('recommend', () => {
  it('pega os 5 últimos títulos distintos', () => {
    const history: WatchEntry[] = [
      entry({ id: '1', title: 'A', tmdbId: 1, lastWatchedAt: '2026-01-05T00:00:00Z' }),
      entry({ id: '2', title: 'A', tmdbId: 1, lastWatchedAt: '2026-01-06T00:00:00Z' }),
      entry({ id: '3', title: 'B', tmdbId: 2, lastWatchedAt: '2026-01-04T00:00:00Z', genreIds: [35] }),
      entry({ id: '4', title: 'C', tmdbId: 3, lastWatchedAt: '2026-01-03T00:00:00Z' }),
      entry({ id: '5', title: 'D', tmdbId: 4, lastWatchedAt: '2026-01-02T00:00:00Z' }),
      entry({ id: '6', title: 'E', tmdbId: 5, lastWatchedAt: '2026-01-01T00:00:00Z' }),
      entry({ id: '7', title: 'F', tmdbId: 6, lastWatchedAt: '2025-12-31T00:00:00Z' }),
    ]

    const recent = getRecentDistinctEntries(history, 5)
    expect(recent).toHaveLength(5)
    expect(recent.map((e) => e.title)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('agrega gêneros com peso por recência', () => {
    const scores = buildGenreScores([
      entry({ id: '1', title: 'A', genreIds: [28, 12] }),
      entry({ id: '2', title: 'B', genreIds: [28] }),
    ])
    expect(scores[0]?.genreId).toBe(28)
    expect(scores[0]?.score).toBeCloseTo(1.8)
  })

  it('remove já assistidos e prioriza afinidade + plataformas', () => {
    const history = [
      entry({
        id: '1',
        title: 'Action Hit',
        tmdbId: 10,
        genreIds: [28],
        lastWatchedAt: '2026-01-05T00:00:00Z',
      }),
    ]

    const candidates: CatalogItem[] = [
      {
        tmdbId: 10,
        mediaType: 'movie',
        title: 'Action Hit',
        overview: '',
        posterPath: null,
        backdropPath: null,
        genreIds: [28],
        voteAverage: 8,
        platforms: ['netflix'],
      },
      {
        tmdbId: 20,
        mediaType: 'movie',
        title: 'Another Action',
        overview: '',
        posterPath: null,
        backdropPath: null,
        genreIds: [28],
        voteAverage: 7,
        platforms: ['netflix'],
      },
      {
        tmdbId: 30,
        mediaType: 'movie',
        title: 'Comedy',
        overview: '',
        posterPath: null,
        backdropPath: null,
        genreIds: [35],
        voteAverage: 9,
        platforms: ['youtube'],
      },
    ]

    const ranked = rankRecommendations(candidates, history, ['netflix'], 10)
    expect(ranked.map((i) => i.tmdbId)).not.toContain(10)
    expect(ranked[0]?.tmdbId).toBe(20)
  })
})
