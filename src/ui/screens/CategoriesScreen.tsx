import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import type { CatalogItem } from '@/domain/types'
import {
  CATEGORY_GENRES,
  discoverByGenres,
  getRelatedTitles,
  getTrending,
} from '@/services/tmdb'
import { Row } from '@/ui/Row/Row'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './CategoriesScreen.module.css'

type Mode = 'isolated' | 'mixed' | 'similar'

interface CategoriesScreenProps {
  onOpenItem: (item: CatalogItem) => void
}

export function CategoriesScreen({ onOpenItem }: CategoriesScreenProps) {
  const [mode, setMode] = useState<Mode>('isolated')
  const [selected, setSelected] = useState<number[]>([])
  const [seed, setSeed] = useState<CatalogItem | null>(null)
  const [seeds, setSeeds] = useState<CatalogItem[]>([])
  const [results, setResults] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    void setFocus('CAT_MODE_isolated')
  }, [])

  useEffect(() => {
    if (mode !== 'similar') return
    let cancelled = false
    void (async () => {
      try {
        const trending = await getTrending('all', 'week')
        if (!cancelled) setSeeds(trending.slice(0, 12))
      } catch {
        if (!cancelled) setSeeds([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode])

  const toggleGenre = (id: number) => {
    if (mode === 'isolated') {
      setSelected([id])
      void runIsolated(id)
      return
    }
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id].slice(0, 4),
    )
  }

  const runIsolated = async (genreId: number) => {
    setLoading(true)
    setError(undefined)
    setSeed(null)
    try {
      const [movies, series] = await Promise.all([
        discoverByGenres([genreId], 'movie', { match: 'and' }),
        discoverByGenres([genreId], 'tv', { match: 'and' }),
      ])
      setResults([...movies, ...series].slice(0, 24))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao filtrar')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const runMixed = async () => {
    if (selected.length === 0) return
    setLoading(true)
    setError(undefined)
    setSeed(null)
    try {
      const [movies, series] = await Promise.all([
        discoverByGenres(selected, 'movie', { match: 'or' }),
        discoverByGenres(selected, 'tv', { match: 'or' }),
      ])
      setResults([...movies, ...series].slice(0, 24))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao filtrar')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const runSimilar = async (item: CatalogItem) => {
    setSeed(item)
    setLoading(true)
    setError(undefined)
    try {
      const related = await getRelatedTitles(item.mediaType, item.tmdbId)
      setResults(related.slice(0, 18))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao buscar semelhantes')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const changeMode = (next: Mode) => {
    setMode(next)
    setSelected([])
    setResults([])
    setSeed(null)
    setError(undefined)
  }

  return (
    <Focusable focusKey="VIEW_categories" className={styles.screen} saveLastFocusedChild>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Explorar</p>
          <h1 className={styles.title}>Categorias</h1>
        </div>
        <div className={styles.modes}>
          {(
            [
              ['isolated', 'Isolada'],
              ['mixed', 'Mista'],
              ['similar', 'Semelhantes'],
            ] as const
          ).map(([id, label]) => (
            <Focusable
              key={id}
              focusKey={`CAT_MODE_${id}`}
              className={cx(styles.modeBtn, mode === id && styles.modeActive)}
              onEnterPress={() => {
                changeMode(id)
              }}
            >
              {label}
            </Focusable>
          ))}
        </div>
      </header>

      <p className={styles.hint}>
        {mode === 'isolated'
          ? 'Escolha uma categoria para ver títulos só desse gênero.'
          : mode === 'mixed'
            ? 'Selecione até 4 categorias e aplique o filtro misto (qualquer gênero).'
            : 'Escolha um título base para encontrar semelhantes.'}
      </p>

      {mode !== 'similar' ? (
        <div className={styles.genreGrid}>
          {CATEGORY_GENRES.map((genre) => (
            <Focusable
              key={genre.id}
              focusKey={`CAT_GENRE_${String(genre.id)}`}
              className={cx(
                styles.genreChip,
                selected.includes(genre.id) && styles.genreActive,
              )}
              onEnterPress={() => {
                toggleGenre(genre.id)
              }}
            >
              {genre.label}
            </Focusable>
          ))}
        </div>
      ) : (
        <div className={styles.seedRow}>
          <Row
            id="cat-seeds"
            title="Escolha um título base"
            items={seeds}
            onSelect={(item) => {
              void runSimilar(item)
            }}
          />
        </div>
      )}

      {mode === 'mixed' ? (
        <Focusable
          focusKey="CAT_APPLY_MIXED"
          className={cx(styles.applyBtn, selected.length === 0 && styles.applyDisabled)}
          onEnterPress={() => {
            void runMixed()
          }}
        >
          Aplicar filtro misto
          {selected.length > 0 ? ` (${String(selected.length)})` : ''}
        </Focusable>
      ) : null}

      <div className={styles.results}>
        {loading ? <p className="empty-state">Buscando títulos…</p> : null}
        {error ? <p className="error-state">{error}</p> : null}
        {!loading && results.length > 0 ? (
          <Row
            id="cat-results"
            title={
              seed
                ? `Semelhantes a ${seed.title}`
                : mode === 'mixed'
                  ? 'Resultado misto'
                  : 'Resultado'
            }
            items={results}
            onSelect={onOpenItem}
          />
        ) : null}
      </div>
    </Focusable>
  )
}
