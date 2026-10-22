import type { WatchEntry } from '@/domain/types'

export interface NetflixCsvRow {
  title: string
  date?: string
}

/**
 * Parser simples do CSV "Atividade de visualização" da Netflix.
 * Formato típico: Title,Date
 */
export function parseNetflixCsv(raw: string): NetflixCsvRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const startIndex = /title/i.test(lines[0] ?? '') ? 1 : 0
  const rows: NetflixCsvRow[] = []

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line) continue
    const parts = splitCsvLine(line)
    const title = parts[0]?.trim()
    if (!title) continue
    rows.push({ title, date: parts[1]?.trim() })
  }

  return rows
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += ch ?? ''
  }
  result.push(current)
  return result
}

export function parseSeriesTitle(title: string): {
  cleanTitle: string
  season?: number
  episode?: number
} {
  const seasonMatch = /:\s*Season\s+(\d+)/i.exec(title)
  const episodeMatch = /:\s*(?:Chapter|Episode|Ep\.?)\s+(\d+)/i.exec(title)

  let cleanTitle = title
  if (seasonMatch?.index !== undefined) {
    cleanTitle = title.slice(0, seasonMatch.index).trim()
  }

  return {
    cleanTitle,
    season: seasonMatch ? Number(seasonMatch[1]) : undefined,
    episode: episodeMatch ? Number(episodeMatch[1]) : undefined,
  }
}

export function netflixRowsToEntries(rows: NetflixCsvRow[]): Omit<WatchEntry, 'id'>[] {
  return rows.map((row) => {
    const parsed = parseSeriesTitle(row.title)
    const isSeries = parsed.season !== undefined || parsed.episode !== undefined
    const parsedDate = row.date ? Date.parse(row.date) : NaN

    return {
      mediaType: isSeries ? 'tv' : 'movie',
      title: parsed.cleanTitle,
      platform: 'netflix' as const,
      genreIds: [],
      season: parsed.season,
      episode: parsed.episode,
      lastWatchedAt: Number.isNaN(parsedDate)
        ? new Date().toISOString()
        : new Date(parsedDate).toISOString(),
      finished: false,
    }
  })
}
