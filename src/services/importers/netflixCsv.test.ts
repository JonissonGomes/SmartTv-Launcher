import { describe, expect, it } from 'vitest'
import {
  netflixRowsToEntries,
  parseNetflixCsv,
  parseSeriesTitle,
} from '@/services/importers/netflixCsv'

describe('netflixCsv', () => {
  it('parseia CSV com cabeçalho', () => {
    const rows = parseNetflixCsv(
      'Title,Date\n"Stranger Things: Season 1: Chapter 1",1/15/2026\nInterestelar,1/16/2026',
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]?.title).toContain('Stranger Things')
  })

  it('extrai temporada e episódio', () => {
    const parsed = parseSeriesTitle('Dark: Season 2: Episode 3')
    expect(parsed.cleanTitle).toBe('Dark')
    expect(parsed.season).toBe(2)
    expect(parsed.episode).toBe(3)
  })

  it('converte linhas em WatchEntry', () => {
    const entries = netflixRowsToEntries([
      { title: 'Dark: Season 1: Episode 1', date: '01/01/2026' },
      { title: 'Interestelar', date: '01/02/2026' },
    ])
    expect(entries[0]?.mediaType).toBe('tv')
    expect(entries[1]?.mediaType).toBe('movie')
    expect(entries[0]?.platform).toBe('netflix')
  })
})
