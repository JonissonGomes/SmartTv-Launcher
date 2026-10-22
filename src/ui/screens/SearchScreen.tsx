import { useEffect, useState } from 'react'
import type { CatalogItem } from '@/domain/types'
import { hasTmdbKey, searchMulti } from '@/services/tmdb'
import { Focusable } from '@/ui/focus/Focusable'
import { Row } from '@/ui/Row/Row'
import styles from './SearchScreen.module.css'

interface SearchScreenProps {
  onSelect: (item: CatalogItem) => void
}

export function SearchScreen({ onSelect }: SearchScreenProps) {
  const [query, setQuery] = useState('Stranger Things')
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
          setItems(results)
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
      <Focusable
        focusKey="SEARCH_INPUT"
        onEnterPress={() => {
          const next = window.prompt('Buscar título', query)
          if (next !== null) setQuery(next)
        }}
      >
        <div className={styles.query}>{query}</div>
      </Focusable>
      <p className={styles.hint}>Enter no campo para editar a busca</p>
      {loading ? <p className="empty-state">Buscando…</p> : null}
      {error ? <p className="error-state">{error}</p> : null}
      <div className={styles.results}>
        <Row id="search" title="Resultados" items={items} onSelect={onSelect} />
      </div>
    </Focusable>
  )
}
