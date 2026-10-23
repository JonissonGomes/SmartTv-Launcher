import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import type { CatalogItem } from '@/domain/types'
import {
  CATEGORY_GENRES,
  discoverByGenres,
  discoverByOriginCountry,
  getPopularMovies,
  getPopularTv,
  getTrending,
  NATIONAL_MOVIES_CATEGORY_ID,
} from '@/services/tmdb'
import { CatalogGrid } from '@/ui/CatalogGrid/CatalogGrid'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './CategoriesScreen.module.css'

type Phase = 'browse' | 'results'

interface CategoriesScreenProps {
  onOpenItem: (item: CatalogItem) => void
}

const HUB_TILES: Array<{
  id: string
  label: string
  tone: number
  run: () => Promise<CatalogItem[]>
}> = [
  {
    id: 'filmes',
    label: 'Filmes',
    tone: 0,
    run: async () => getPopularMovies(),
  },
  {
    id: 'series',
    label: 'Séries',
    tone: 1,
    run: async () => getPopularTv(),
  },
  {
    id: 'trending',
    label: 'Em alta',
    tone: 2,
    run: async () => getTrending('all', 'week'),
  },
  {
    id: 'nacionais',
    label: 'Nacionais',
    tone: 3,
    run: async () =>
      discoverByOriginCountry('BR', 'movie', { pages: 3 }),
  },
]

const TILE_BG = [
  'linear-gradient(135deg,#7c2d12 0%,#1c1917 100%)',
  'linear-gradient(135deg,#1e3a8a 0%,#0f172a 100%)',
  'linear-gradient(135deg,#581c87 0%,#111827 100%)',
  'linear-gradient(135deg,#065f46 0%,#022c22 100%)',
]

function uniqueItems(items: CatalogItem[]): CatalogItem[] {
  const map = new Map<string, CatalogItem>()
  for (const item of items) {
    const key = `${item.mediaType}:${String(item.tmdbId)}`
    if (!map.has(key) && item.posterPath) map.set(key, item)
  }
  return [...map.values()]
}

/** Catálogo estilo Globoplay: tiles de categoria + fileira de gêneros. */
export function CategoriesScreen({ onOpenItem }: CategoriesScreenProps) {
  const [phase, setPhase] = useState<Phase>('browse')
  const [title, setTitle] = useState('Catálogo')
  const [results, setResults] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    void setFocus(phase === 'browse' ? 'CAT_TILE_filmes' : 'CAT_BACK')
  }, [phase])

  const openResults = async (label: string, loader: () => Promise<CatalogItem[]>) => {
    setLoading(true)
    setError(undefined)
    setTitle(label)
    setPhase('results')
    try {
      const items = uniqueItems(await loader()).slice(0, 72)
      setResults(items)
      void setFocus('CAT_BACK')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const openGenre = async (genreId: number, label: string) => {
    await openResults(label, async () => {
      if (genreId === NATIONAL_MOVIES_CATEGORY_ID) {
        return discoverByOriginCountry('BR', 'movie', { pages: 3 })
      }
      const [movies, series] = await Promise.all([
        discoverByGenres([genreId], 'movie', { match: 'and', pages: 2 }),
        discoverByGenres([genreId], 'tv', { match: 'and', pages: 2 }),
      ])
      return [...movies, ...series]
    })
  }

  return (
    <Focusable
      focusKey="VIEW_categories"
      className={styles.screen}
      saveLastFocusedChild
    >
      {phase === 'browse' ? (
        <>
          <header className={styles.header}>
            <p className={styles.kicker}>Explorar</p>
            <h1 className={styles.title}>Catálogo</h1>
          </header>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Categorias</h2>
            <div className={styles.hubGrid}>
              {HUB_TILES.map((tile) => (
                <Focusable
                  key={tile.id}
                  focusKey={`CAT_TILE_${tile.id}`}
                  className={styles.hubTile}
                  style={{ background: TILE_BG[tile.tone % TILE_BG.length] }}
                  onEnterPress={() => {
                    void openResults(tile.label, tile.run)
                  }}
                >
                  <span className={styles.hubLabel}>{tile.label}</span>
                </Focusable>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Gêneros</h2>
            <div className={styles.genreRow} data-scroll-x="row">
              <div className={styles.genreScroller}>
                {CATEGORY_GENRES.map((g) => (
                  <Focusable
                    key={g.id}
                    focusKey={`CAT_GENRE_${String(g.id)}`}
                    className={styles.genreTile}
                    onEnterPress={() => {
                      void openGenre(g.id, g.label)
                    }}
                  >
                    {g.label}
                  </Focusable>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <header className={cx(styles.header, styles.headerCompact)}>
            <Focusable
              focusKey="CAT_BACK"
              className={styles.backBtn}
              onEnterPress={() => {
                setPhase('browse')
                setResults([])
                void setFocus('CAT_TILE_filmes')
              }}
            >
              ← Catálogo
            </Focusable>
            <h1 className={styles.title}>{title}</h1>
          </header>
          {loading ? <p className={styles.hint}>Carregando…</p> : null}
          {error ? <p className="error-state">{error}</p> : null}
          {!loading && results.length === 0 ? (
            <p className={styles.hint}>Nenhum título encontrado.</p>
          ) : null}
          <CatalogGrid id="cat-results" items={results} onSelect={onOpenItem} />
        </>
      )}
    </Focusable>
  )
}
