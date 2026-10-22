import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import type { CatalogItem } from '@/domain/types'
import {
  CATEGORY_GENRES,
  discoverByGenres,
  getRelatedTitles,
  getTrending,
} from '@/services/tmdb'
import { CatalogGrid } from '@/ui/CatalogGrid/CatalogGrid'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './CategoriesScreen.module.css'

type Mode = 'isolated' | 'mixed' | 'similar'
type Phase = 'browse' | 'results'

interface CategoriesScreenProps {
  onOpenItem: (item: CatalogItem) => void
}

function uniqueItems(items: CatalogItem[]): CatalogItem[] {
  const map = new Map<string, CatalogItem>()
  for (const item of items) {
    const key = `${item.mediaType}:${String(item.tmdbId)}`
    if (!map.has(key) && item.posterPath) map.set(key, item)
  }
  return [...map.values()]
}

export function CategoriesScreen({ onOpenItem }: CategoriesScreenProps) {
  const [mode, setMode] = useState<Mode>('isolated')
  const [phase, setPhase] = useState<Phase>('browse')
  const [selected, setSelected] = useState<number[]>([])
  const [seed, setSeed] = useState<CatalogItem | null>(null)
  const [seeds, setSeeds] = useState<CatalogItem[]>([])
  const [results, setResults] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    void setFocus(phase === 'browse' ? 'CAT_MODE_isolated' : 'CAT_BACK')
  }, [phase])

  useEffect(() => {
    if (mode !== 'similar' || phase !== 'browse') return
    let cancelled = false
    void (async () => {
      try {
        const trending = await getTrending('all', 'week')
        if (!cancelled) setSeeds(uniqueItems(trending).slice(0, 36))
      } catch {
        if (!cancelled) setSeeds([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, phase])

  const runIsolated = async (genreId: number) => {
    setLoading(true)
    setError(undefined)
    setSeed(null)
    setPhase('results')
    try {
      const [movies, series] = await Promise.all([
        discoverByGenres([genreId], 'movie', { match: 'and', pages: 3 }),
        discoverByGenres([genreId], 'tv', { match: 'and', pages: 3 }),
      ])
      setResults(uniqueItems([...movies, ...series]).slice(0, 72))
      void setFocus('CAT_BACK')
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
    setPhase('results')
    try {
      const [movies, series] = await Promise.all([
        discoverByGenres(selected, 'movie', { match: 'or', pages: 3 }),
        discoverByGenres(selected, 'tv', { match: 'or', pages: 3 }),
      ])
      setResults(uniqueItems([...movies, ...series]).slice(0, 72))
      void setFocus('CAT_BACK')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao filtrar')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const runSimilar = async (item: CatalogItem) => {
    setSeed(item)
    setSelected([])
    setLoading(true)
    setError(undefined)
    setPhase('results')
    try {
      const related = await getRelatedTitles(item.mediaType, item.tmdbId)
      setResults(uniqueItems(related).slice(0, 48))
      void setFocus('CAT_BACK')
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
    setPhase('browse')
  }

  const backToBrowse = () => {
    setPhase('browse')
    setResults([])
    setSeed(null)
    setError(undefined)
    if (mode === 'isolated') setSelected([])
  }

  const selectedLabels = CATEGORY_GENRES.filter((g) =>
    selected.includes(g.id),
  )
    .map((g) => g.label)
    .join(' · ')

  const resultsTitle = seed
    ? `Semelhantes a ${seed.title}`
    : mode === 'mixed'
      ? `Misto · ${selectedLabels || 'categorias'}`
      : selectedLabels || 'Resultado'

  return (
    <Focusable focusKey="VIEW_categories" className={styles.screen} saveLastFocusedChild>
      <header className={cx(styles.header, phase === 'results' && styles.headerCompact)}>
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

      {phase === 'browse' ? (
        <>
          <p className={styles.hint}>
            {mode === 'isolated'
              ? 'Toque em uma categoria do mosaico para abrir o catálogo.'
              : mode === 'mixed'
                ? 'Selecione até 4 categorias e aplique o filtro misto.'
                : 'Escolha um título base no mosaico para achar semelhantes.'}
          </p>

          {mode === 'similar' ? (
            <div className={styles.browsePane}>
              <CatalogGrid
                id="cat-seeds"
                items={seeds}
                onSelect={(item) => {
                  void runSimilar(item)
                }}
              />
            </div>
          ) : (
            <div className={styles.mosaic}>
              {CATEGORY_GENRES.map((genre, index) => {
                const accents = [
                  styles.accent0,
                  styles.accent1,
                  styles.accent2,
                  styles.accent3,
                  styles.accent4,
                  styles.accent5,
                ]
                return (
                  <Focusable
                    key={genre.id}
                    focusKey={`CAT_GENRE_${String(genre.id)}`}
                    className={cx(
                      styles.tile,
                      accents[index % accents.length],
                      selected.includes(genre.id) && styles.tileActive,
                    )}
                    onEnterPress={() => {
                      if (mode === 'isolated') {
                        setSelected([genre.id])
                        void runIsolated(genre.id)
                        return
                      }
                      setSelected((prev) =>
                        prev.includes(genre.id)
                          ? prev.filter((g) => g !== genre.id)
                          : [...prev, genre.id].slice(0, 4),
                      )
                    }}
                  >
                    <span className={styles.tileLabel}>{genre.label}</span>
                  </Focusable>
                )
              })}
            </div>
          )}

          {mode === 'mixed' ? (
            <Focusable
              focusKey="CAT_APPLY_MIXED"
              className={cx(
                styles.applyBtn,
                selected.length === 0 && styles.applyDisabled,
              )}
              onEnterPress={() => {
                void runMixed()
              }}
            >
              Ver catálogo misto
              {selected.length > 0 ? ` (${String(selected.length)})` : ''}
            </Focusable>
          ) : null}
        </>
      ) : (
        <>
          <div className={styles.resultsBar}>
            <Focusable
              focusKey="CAT_BACK"
              className={styles.backBtn}
              onEnterPress={backToBrowse}
            >
              ← Categorias
            </Focusable>
            <p className={styles.resultsLabel}>{resultsTitle}</p>
            {mode === 'mixed' && selected.length > 0 ? (
              <Focusable
                focusKey="CAT_APPLY_AGAIN"
                className={styles.applyBtn}
                onEnterPress={() => {
                  void runMixed()
                }}
              >
                Atualizar
              </Focusable>
            ) : null}
          </div>

          {mode === 'mixed' ? (
            <div className={styles.miniMosaic}>
              {CATEGORY_GENRES.map((genre) => (
                <Focusable
                  key={genre.id}
                  focusKey={`CAT_MINI_${String(genre.id)}`}
                  className={cx(
                    styles.miniChip,
                    selected.includes(genre.id) && styles.miniChipActive,
                  )}
                  onEnterPress={() => {
                    setSelected((prev) =>
                      prev.includes(genre.id)
                        ? prev.filter((g) => g !== genre.id)
                        : [...prev, genre.id].slice(0, 4),
                    )
                  }}
                >
                  {genre.label}
                </Focusable>
              ))}
            </div>
          ) : null}

          <div className={styles.resultsPane}>
            {loading ? <p className="empty-state">Carregando catálogo…</p> : null}
            {error ? <p className="error-state">{error}</p> : null}
            {!loading && results.length > 0 ? (
              <CatalogGrid
                id="cat-results"
                title="Catálogo"
                items={results}
                onSelect={onOpenItem}
              />
            ) : null}
            {!loading && !error && results.length === 0 ? (
              <p className="empty-state">Nenhum título encontrado.</p>
            ) : null}
          </div>
        </>
      )}
    </Focusable>
  )
}
