import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useState } from 'react'
import type { LibraryCatalog, LibraryItem, LibraryRow } from '@/domain/library'
import {
  FALLBACK_ANIME_CATALOG,
  loadLibraryCatalog,
  type CatalogSource,
} from '@/services/libraryCatalog'
import { isUrlAllowedForLibrary } from '@/services/urlSafety'
import { launchBrowser } from '@/services/webos'
import { useAnimeHistoryStore } from '@/store/animeHistory'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { VideoPlayer } from '@/ui/media/VideoPlayer'
import styles from './LibraryScreen.module.css'

/** Player de Animes — UI nativa (sem site/ads). */
export function LibraryScreen() {
  const libraryBaseUrl = useSettingsStore((s) => s.libraryBaseUrl)
  const recordWatch = useAnimeHistoryStore((s) => s.recordWatch)
  const entries = useAnimeHistoryStore((s) => s.entries)

  const recentAnime = useMemo(
    () =>
      [...entries]
        .sort(
          (a, b) =>
            new Date(b.lastWatchedAt).getTime() -
            new Date(a.lastWatchedAt).getTime(),
        )
        .slice(0, 10),
    [entries],
  )

  const [catalog, setCatalog] = useState<LibraryCatalog>(FALLBACK_ANIME_CATALOG)
  const [source, setSource] = useState<CatalogSource | 'fallback'>('fallback')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [selected, setSelected] = useState<LibraryItem | null>(null)
  const [playing, setPlaying] = useState<LibraryItem | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const result = await loadLibraryCatalog(libraryBaseUrl)
        if (cancelled) return
        setCatalog(result.catalog)
        setSource(result.source)
        setError(undefined)
      } catch (err) {
        if (!cancelled) {
          setCatalog(FALLBACK_ANIME_CATALOG)
          setSource('fallback')
          setError(err instanceof Error ? err.message : 'Falha ao carregar')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          window.requestAnimationFrame(() => {
            void setFocus('LIBRARY_REFRESH')
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [libraryBaseUrl])

  if (playing?.streamUrl) {
    return (
      <VideoPlayer
        title={playing.title}
        subtitle={playing.subtitle}
        src={playing.streamUrl}
        poster={playing.poster || playing.backdrop}
        onClose={() => {
          setPlaying(null)
          void setFocus(
            selected ? `LIB_CARD_${selected.id}` : 'LIBRARY_REFRESH',
          )
        }}
      />
    )
  }

  const continueRow: LibraryRow | null =
    recentAnime.length > 0
      ? {
          id: 'continue-anime',
          title: 'Continuar animes',
          items: recentAnime.map((e) => ({
            id: e.id,
            title: e.title,
            subtitle: e.subtitle,
            poster: e.poster,
            streamUrl: e.streamUrl,
          })),
        }
      : null

  const rows: LibraryRow[] = continueRow
    ? [continueRow, ...catalog.rows]
    : catalog.rows

  const sourceLabel =
    source === 'remote'
      ? ' · catálogo JSON'
      : source === 'site'
        ? ' · catálogo do site'
        : source === 'bundled'
          ? ' · catálogo local'
          : ' · catálogo embutido'

  return (
    <Focusable
      focusKey="VIEW_anime"
      className={styles.screen}
      saveLastFocusedChild
    >
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{catalog.title ?? 'Animes'}</h1>
          <p className={styles.sub}>
            Player nativo · animesonlinecc.to
            {sourceLabel}
          </p>
        </div>
        <Focusable
          focusKey="LIBRARY_REFRESH"
          className={styles.btnGhost}
          onEnterPress={() => {
            setLoading(true)
            void loadLibraryCatalog(libraryBaseUrl)
              .then((result) => {
                setCatalog(result.catalog)
                setSource(result.source)
                setError(undefined)
              })
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Falha')
              })
              .finally(() => {
                setLoading(false)
              })
          }}
        >
          Atualizar
        </Focusable>
      </header>

      {loading ? <p className={styles.hint}>Carregando catálogo…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.body} data-scroll-y="catalog">
        {rows.map((row) => (
          <section key={row.id} className={styles.row}>
            <h2 className={styles.rowTitle}>{row.title}</h2>
            <div className={styles.viewport} data-scroll-x="row">
              <div className={styles.scroller}>
                {row.items.map((item) => (
                  <Focusable
                    key={`${row.id}-${item.id}`}
                    focusKey={`LIB_CARD_${row.id}_${item.id}`}
                    className={cx(
                      styles.card,
                      selected?.id === item.id &&
                        selected.title === item.title &&
                        styles.cardSelected,
                    )}
                    onEnterPress={() => {
                      setSelected(item)
                      if (item.streamUrl) {
                        recordWatch(item)
                        setPlaying(item)
                        return
                      }
                      if (
                        item.pageUrl &&
                        isUrlAllowedForLibrary(item.pageUrl, libraryBaseUrl)
                      ) {
                        void launchBrowser(item.pageUrl).catch((err: unknown) => {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Falha ao abrir no navegador',
                          )
                        })
                        return
                      }
                      void setFocus('LIB_DETAIL_HINT')
                    }}
                  >
                    {item.poster ? (
                      <img
                        className={styles.poster}
                        src={item.poster}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className={styles.posterFallback}>{item.title}</div>
                    )}
                    <span className={styles.cardTitle}>{item.title}</span>
                    {item.subtitle ? (
                      <span className={styles.cardSub}>{item.subtitle}</span>
                    ) : null}
                  </Focusable>
                ))}
              </div>
            </div>
          </section>
        ))}

        {selected && !selected.streamUrl && !selected.pageUrl ? (
          <Focusable focusKey="LIB_DETAIL_HINT" className={styles.detail}>
            <h3>{selected.title}</h3>
            <p>
              Sem mídia direta. Publique <code>streamUrl</code> (mp4/m3u8) em{' '}
              <code>https://animesonlinecc.to/launcher/catalog.json</code>.
            </p>
          </Focusable>
        ) : null}

        {!loading && rows.length === 0 ? (
          <p className={styles.hint}>
            Catálogo vazio. Verifique a URL do site em Configurações.
          </p>
        ) : null}
      </div>
    </Focusable>
  )
}
