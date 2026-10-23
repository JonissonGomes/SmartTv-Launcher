import { useEffect, useMemo, useState } from 'react'
import type { AfAnime } from '@/domain/animefire'
import { AF_GENRES, AF_SECTIONS } from '@/domain/animefire'
import { searchAfAnimes } from '@/services/animefire'
import { GenreIcon, SectionIcon } from '@/ui/anime/catalogIcons'
import { Focusable } from '@/ui/focus/Focusable'
import styles from '@/ui/screens/LibraryScreen.module.css'

const SECTION_COLORS = [
  'linear-gradient(135deg,#7c2d12,#1c1917)',
  'linear-gradient(135deg,#1e3a8a,#0f172a)',
  'linear-gradient(135deg,#581c87,#111827)',
  'linear-gradient(135deg,#065f46,#022c22)',
]

const GENRE_COLORS = [
  'linear-gradient(145deg,#7f1d1d,#1c1917)',
  'linear-gradient(145deg,#1e3a8a,#0f172a)',
  'linear-gradient(145deg,#854d0e,#1c1917)',
  'linear-gradient(145deg,#4c1d95,#111827)',
  'linear-gradient(145deg,#065f46,#022c22)',
  'linear-gradient(145deg,#9f1239,#1c1917)',
  'linear-gradient(145deg,#1e293b,#020617)',
  'linear-gradient(145deg,#0e7490,#0f172a)',
  'linear-gradient(145deg,#b45309,#1c1917)',
  'linear-gradient(145deg,#334155,#0f172a)',
]

interface AnimeCatalogHubProps {
  highlights: AfAnime[]
  latest: AfAnime[]
  movies: AfAnime[]
  upcoming: AfAnime[]
  onOpenSection: (path: string, title: string) => void
  onOpenGenre: (genre: string) => void
}

function pickCover(...lists: AfAnime[][]): string | undefined {
  for (const list of lists) {
    for (const a of list) {
      const url = a.backdropUrl || a.posterUrl
      if (url) return url
    }
  }
  return undefined
}

function matchGenreCover(genre: string, pool: AfAnime[]): string | undefined {
  const needle = genre.toLowerCase()
  for (const a of pool) {
    const hit = a.genres?.some((g) => g.toLowerCase().includes(needle))
    if (hit && (a.backdropUrl || a.posterUrl)) {
      return a.backdropUrl || a.posterUrl
    }
  }
  return undefined
}

export function AnimeCatalogHub({
  highlights,
  latest,
  movies,
  upcoming,
  onOpenSection,
  onOpenGenre,
}: AnimeCatalogHubProps) {
  const pool = useMemo(
    () => [...highlights, ...latest, ...movies, ...upcoming],
    [highlights, latest, movies, upcoming],
  )

  const sectionCovers = useMemo(() => {
    const map: Record<string, string | undefined> = {
      destaques: pickCover(highlights, latest),
      filmes: pickCover(movies, highlights),
      'em-breve': pickCover(upcoming, latest),
    }
    return map
  }, [highlights, latest, movies, upcoming])

  const [genreCovers, setGenreCovers] = useState<Record<string, string>>({})

  useEffect(() => {
    if (pool.length === 0) return
    setGenreCovers((prev) => {
      const next = { ...prev }
      let changed = false
      for (const g of AF_GENRES) {
        if (next[g]) continue
        const cover = matchGenreCover(g, pool)
        if (cover) {
          next[g] = cover
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [pool])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      // Busca capas em paralelo limitado (2 por vez) para não saturar a API.
      const next: Record<string, string> = {}
      for (let i = 0; i < AF_GENRES.length; i += 2) {
        if (cancelled) return
        const batch = AF_GENRES.slice(i, i + 2)
        const results = await Promise.all(
          batch.map(async (genre) => {
            try {
              const items = await searchAfAnimes({ genre })
              const url =
                items.find((a) => a.backdropUrl || a.posterUrl)?.backdropUrl ||
                items.find((a) => a.posterUrl)?.posterUrl
              return url ? ([genre, url] as const) : null
            } catch {
              return null
            }
          }),
        )
        for (const r of results) {
          if (r) next[r[0]] = r[1]
        }
      }
      if (!cancelled && Object.keys(next).length > 0) {
        setGenreCovers((prev) => ({ ...next, ...prev }))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Categorias</h2>
        <div className={styles.catGrid}>
          {AF_SECTIONS.map((sec, i) => {
            const cover = sectionCovers[sec.id]
            return (
              <Focusable
                key={sec.id}
                focusKey={`ANIME_SEC_${sec.id}`}
                className={styles.catTile}
                style={{
                  background: SECTION_COLORS[i % SECTION_COLORS.length],
                }}
                onEnterPress={() => {
                  onOpenSection(sec.path, sec.title)
                }}
              >
                {cover ? (
                  <img
                    className={styles.tileCover}
                    src={cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <div className={styles.tileShade} />
                <div className={styles.tileIcon}>
                  <SectionIcon id={sec.id} />
                </div>
                <div className={styles.tileCaption}>
                  <span className={styles.catTileLabel}>{sec.title}</span>
                  <span className={styles.catTileSub}>AnimeFire</span>
                </div>
              </Focusable>
            )
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Gêneros</h2>
        <div className={styles.viewport} data-scroll-x="row">
          <div className={styles.scroller}>
            {AF_GENRES.map((g, i) => {
              const cover = genreCovers[g]
              return (
                <Focusable
                  key={g}
                  focusKey={`ANIME_GENRE_${g}`}
                  className={styles.genreTile}
                  style={{
                    background: GENRE_COLORS[i % GENRE_COLORS.length],
                  }}
                  onEnterPress={() => {
                    onOpenGenre(g)
                  }}
                >
                  {cover ? (
                    <img
                      className={styles.tileCover}
                      src={cover}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <div className={styles.tileShade} />
                  <div className={styles.tileIcon}>
                    <GenreIcon genre={g} />
                  </div>
                  <span className={styles.genreTileLabel}>{g}</span>
                </Focusable>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
