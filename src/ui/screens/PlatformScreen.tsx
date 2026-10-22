import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { APP_CONFIGS } from '@/config/apps'
import type { CatalogItem, ContentRow, Platform } from '@/domain/types'
import {
  discoverPopular,
  getTrending,
  TMDB_PROVIDER_IDS,
} from '@/services/tmdb'
import { launchApp } from '@/services/webos'
import { useSettingsStore } from '@/store/settings'
import { Row } from '@/ui/Row/Row'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './PlatformScreen.module.css'

interface PlatformScreenProps {
  platform: Platform
  onOpenItem: (item: CatalogItem) => void
}

export function PlatformScreen({ platform, onOpenItem }: PlatformScreenProps) {
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme)
  const [rows, setRows] = useState<ContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const config = APP_CONFIGS[platform]
  const providerId = TMDB_PROVIDER_IDS[platform]

  useEffect(() => {
    void setFocus('PLATFORM_OPEN')
  }, [platform])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(undefined)

    void (async () => {
      try {
        if (platform === 'youtube') {
          const trending = await getTrending('all', 'week')
          if (cancelled) return
          setRows([
            {
              id: 'yt-trend',
              title: 'Em alta (para assistir no YouTube)',
              items: trending.slice(0, 12).map((item) => ({
                ...item,
                platforms: ['youtube'],
              })),
            },
          ])
          return
        }

        if (!providerId) {
          setRows([])
          setError('Catálogo indisponível para este streaming.')
          return
        }

        const [movies, series, top] = await Promise.all([
          discoverPopular('movie', { withWatchProvider: providerId }),
          discoverPopular('tv', { withWatchProvider: providerId }),
          discoverPopular('movie', {
            withWatchProvider: providerId,
            sortBy: 'vote_average.desc',
          }),
        ])

        if (cancelled) return

        const next: ContentRow[] = []
        if (movies.length)
          next.push({ id: 'plat-movies', title: 'Filmes em destaque', items: movies })
        if (series.length)
          next.push({ id: 'plat-series', title: 'Séries em destaque', items: series })
        if (top.length)
          next.push({ id: 'plat-top', title: 'Bem avaliados', items: top })
        setRows(next)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar catálogo')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [platform, providerId])

  return (
    <Focusable focusKey="VIEW_platform" className={styles.screen} saveLastFocusedChild>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Catálogo</p>
          <h1 className={styles.title}>{config.label}</h1>
        </div>
        <Focusable
          focusKey="PLATFORM_OPEN"
          className={styles.openBtn}
          onEnterPress={() => {
            setActiveTheme(platform)
            void launchApp(platform)
          }}
        >
          Abrir {config.label}
        </Focusable>
      </header>

      <div className={styles.body}>
        {loading ? <p className="empty-state">Carregando catálogo…</p> : null}
        {error ? <p className="error-state">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="empty-state">Nenhum título encontrado neste streaming.</p>
        ) : null}
        {rows.map((row) => (
          <Row
            key={row.id}
            id={row.id}
            title={row.title}
            items={row.items}
            onSelect={onOpenItem}
          />
        ))}
      </div>
    </Focusable>
  )
}
