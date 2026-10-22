import { useEffect, useState } from 'react'
import type { CatalogItem } from '@/domain/types'
import { hasTmdbKey, searchMulti } from '@/services/tmdb'
import { CatalogGrid } from '@/ui/CatalogGrid/CatalogGrid'
import { Focusable } from '@/ui/focus/Focusable'
import { TvTextField } from '@/ui/input/TvTextField'
import styles from './SearchScreen.module.css'

interface SearchScreenProps {
  onSelect: (item: CatalogItem) => void
}

export function SearchScreen({ onSelect }: SearchScreenProps) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasTmdbKey()) {
      setError('Configure VITE_TMDB_TOKEN ou VITE_TMDB_API_KEY no .env')
      return
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        if (query.trim().length < 2) {
          setItems([])
          return
        }
        setLoading(true)
        setError(undefined)
        try {
          const results = await searchMulti(query.trim())
          setItems(results.filter((item) => item.posterPath).slice(0, 48))
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Falha na busca')
        } finally {
          setLoading(false)
        }
      })()
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [query])

  return (
    <Focusable focusKey="VIEW_search" className={styles.screen} saveLastFocusedChild>
      <TvTextField
        focusKey="SEARCH_INPUT"
        label="Buscar títulos"
        value={query}
        onChange={setQuery}
        placeholder="Digite com o teclado da TV…"
        inputType="search"
        maxLength={64}
      />
      <p className={styles.hint}>
        Enter no campo abre o teclado virtual da TV. Digite e aguarde os resultados.
      </p>
      {loading ? <p className="empty-state">Buscando…</p> : null}
      {error ? <p className="error-state">{error}</p> : null}
      <div className={styles.results}>
        <CatalogGrid
          id="search"
          title={items.length > 0 ? 'Resultados' : undefined}
          items={items}
          onSelect={onSelect}
        />
      </div>
    </Focusable>
  )
}
