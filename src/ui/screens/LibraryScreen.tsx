import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import type { LibraryCatalog, LibraryItem } from '@/domain/library'
import { loadLibraryCatalog } from '@/services/libraryCatalog'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { VideoPlayer } from '@/ui/media/VideoPlayer'
import styles from './LibraryScreen.module.css'

export function LibraryScreen() {
  const libraryBaseUrl = useSettingsStore((s) => s.libraryBaseUrl)
  const [catalog, setCatalog] = useState<LibraryCatalog | null>(null)
  const [source, setSource] = useState<'remote' | 'bundled'>('bundled')
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
        void setFocus('VIEW_library')
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar')
        }
      } finally {
        if (!cancelled) setLoading(false)
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
            selected
              ? `LIB_CARD_${selected.id}`
              : 'VIEW_library',
          )
        }}
      />
    )
  }

  return (
    <Focusable
      focusKey="VIEW_library"
      className={styles.screen}
      saveLastFocusedChild
    >
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{catalog?.title ?? 'Biblioteca'}</h1>
          <p className={styles.sub}>
            Experiência nativa · sem anúncios
            {source === 'remote' ? ' · catálogo do site' : ' · catálogo local'}
          </p>
        </div>
        <Focusable
          focusKey="LIBRARY_REFRESH"
          className={styles.btnGhost}
          onEnterPress={() => {
            setLoading(true)
            void loadLibraryCatalog(libraryBaseUrl).then((result) => {
              setCatalog(result.catalog)
              setSource(result.source)
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
        {catalog?.rows.map((row) => (
          <section key={row.id} className={styles.row}>
            <h2 className={styles.rowTitle}>{row.title}</h2>
            <div className={styles.viewport} data-scroll-x="row">
              <div className={styles.scroller}>
                {row.items.map((item) => (
                  <Focusable
                    key={item.id}
                    focusKey={`LIB_CARD_${item.id}`}
                    className={cx(
                      styles.card,
                      selected?.id === item.id && styles.cardSelected,
                    )}
                    onEnterPress={() => {
                      setSelected(item)
                      if (item.streamUrl) {
                        setPlaying(item)
                      } else {
                        void setFocus('LIB_DETAIL_HINT')
                      }
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

        {selected && !selected.streamUrl ? (
          <Focusable
            focusKey="LIB_DETAIL_HINT"
            className={styles.detail}
          >
            <h3>{selected.title}</h3>
            <p>
              Este item ainda não tem <code>streamUrl</code> no catálogo. Inclua
              a URL direta do vídeo (mp4/m3u8) em{' '}
              <code>public/library/catalog.json</code> ou em{' '}
              <code>/launcher/catalog.json</code> no seu site.
            </p>
          </Focusable>
        ) : null}

        {!loading && (catalog?.rows.length ?? 0) === 0 ? (
          <p className={styles.hint}>
            Catálogo vazio. Publique JSON em /launcher/catalog.json no seu site.
          </p>
        ) : null}
      </div>
    </Focusable>
  )
}
