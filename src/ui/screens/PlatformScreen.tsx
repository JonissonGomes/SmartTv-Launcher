import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { APP_CONFIGS } from '@/config/apps'
import {
  PLATFORM_SECTIONS,
  type PlatformSection,
} from '@/config/platformCatalog'
import type { CatalogItem, ContentRow, Platform } from '@/domain/types'
import {
  discoverByGenres,
  discoverPopular,
  getTrending,
  searchMulti,
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

async function loadSection(
  platform: Platform,
  section: PlatformSection,
  providerId?: number,
): Promise<CatalogItem[]> {
  if (section.kind === 'open_app') return []

  if (section.kind === 'search' && section.query) {
    const results = await searchMulti(section.query)
    return results
      .filter((item) => !section.mediaType || item.mediaType === section.mediaType)
      .slice(0, 12)
      .map((item) =>
        item.platforms.includes(platform)
          ? item
          : { ...item, platforms: [...item.platforms, platform] },
      )
  }

  if (platform === 'youtube' && section.id === 'yt-trend') {
    const trending = await getTrending('all', 'week')
    return trending.slice(0, 12).map((item) => ({
      ...item,
      platforms: ['youtube' as const],
    }))
  }

  const mediaType = section.mediaType ?? 'movie'

  if (section.genreIds?.length) {
    const items = await discoverByGenres(section.genreIds, mediaType, {
      match: 'and',
    })
    return tagProvider(items, platform, providerId)
  }

  if (!providerId && platform !== 'youtube') return []

  const items = await discoverPopular(mediaType, {
    withWatchProvider: providerId,
    sortBy: section.sortBy,
  })
  return tagProvider(items, platform, providerId)
}

function tagProvider(
  items: CatalogItem[],
  platform: Platform,
  providerId?: number,
): CatalogItem[] {
  if (!providerId) {
    return items.map((item) =>
      item.platforms.includes(platform)
        ? item
        : { ...item, platforms: [...item.platforms, platform] },
    )
  }
  return items.map((item) =>
    item.platforms.includes(platform)
      ? item
      : { ...item, platforms: [...item.platforms, platform] },
  )
}

export function PlatformScreen({ platform, onOpenItem }: PlatformScreenProps) {
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme)
  const [rows, setRows] = useState<ContentRow[]>([])
  const [shortcuts, setShortcuts] = useState<PlatformSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const config = APP_CONFIGS[platform]
  const providerId = TMDB_PROVIDER_IDS[platform]
  const sections = PLATFORM_SECTIONS[platform]

  useEffect(() => {
    void setFocus('PLATFORM_OPEN')
  }, [platform])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(undefined)
    setShortcuts(sections.filter((s) => s.kind === 'open_app'))

    void (async () => {
      try {
        const contentSections = sections.filter((s) => s.kind !== 'open_app')
        const loaded = await Promise.all(
          contentSections.map(async (section) => {
            const items = await loadSection(platform, section, providerId)
            return { section, items }
          }),
        )

        if (cancelled) return

        setRows(
          loaded
            .filter((entry) => entry.items.length > 0)
            .map((entry) => ({
              id: entry.section.id,
              title: entry.section.label,
              items: entry.items,
            })),
        )
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Falha ao carregar catálogo',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [platform, providerId, sections])

  const openStreaming = () => {
    setActiveTheme(platform)
    void launchApp(platform)
  }

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
          onEnterPress={openStreaming}
        >
          Abrir {config.label}
        </Focusable>
      </header>

      {shortcuts.length > 0 ? (
        <div className={styles.shortcuts}>
          {shortcuts.map((section) => (
            <Focusable
              key={section.id}
              focusKey={`PLATFORM_SHORT_${section.id}`}
              className={styles.shortcut}
              onEnterPress={openStreaming}
            >
              <strong>{section.label}</strong>
              <span>{section.appHint ?? `Abrir no ${config.label}`}</span>
            </Focusable>
          ))}
        </div>
      ) : null}

      <div className={styles.body} data-scroll-y="catalog">
        {loading ? <p className="empty-state">Carregando catálogo…</p> : null}
        {error ? <p className="error-state">{error}</p> : null}
        {!loading && !error && rows.length === 0 && shortcuts.length === 0 ? (
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
