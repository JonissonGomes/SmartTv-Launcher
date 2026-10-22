import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useCallback, useEffect, useState } from 'react'
import type { CatalogItem, Platform } from '@/domain/types'
import {
  getRelatedTitles,
  getTrailerYoutubeKey,
  getTrending,
} from '@/services/tmdb'
import { useSettingsStore } from '@/store/settings'
import { Row } from '@/ui/Row/Row'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { TrailerArt } from '@/ui/media/TrailerArt'
import styles from './SurpriseScreen.module.css'

interface SurpriseScreenProps {
  onOpenItem: (item: CatalogItem) => void
  onWatch: (item: CatalogItem, platform: Platform) => void
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

export function SurpriseScreen({ onOpenItem, onWatch }: SurpriseScreenProps) {
  const ownedPlatforms = useSettingsStore((s) => s.ownedPlatforms)
  const [pool, setPool] = useState<CatalogItem[]>([])
  const [pick, setPick] = useState<CatalogItem | null>(null)
  const [similar, setSimilar] = useState<CatalogItem[]>([])
  const [trailerKey, setTrailerKey] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const surprise = useCallback(
    async (fromPool?: CatalogItem[]) => {
      setLoading(true)
      setError(undefined)
      try {
        let source = fromPool
        if (!source || source.length === 0) {
          source = await getTrending('all', 'week')
          setPool(source)
        }

        const next = pickRandom(source.filter((i) => i.tmdbId !== pick?.tmdbId)) ??
          pickRandom(source)
        if (!next) {
          setError('Não foi possível surpreender agora.')
          setPick(null)
          setSimilar([])
          return
        }

        setPick(next)
        const [related, key] = await Promise.all([
          getRelatedTitles(next.mediaType, next.tmdbId),
          getTrailerYoutubeKey(next.mediaType, next.tmdbId),
        ])
        setSimilar(related.filter((r) => r.tmdbId !== next.tmdbId).slice(0, 12))
        setTrailerKey(key)
        void setFocus('SURPRISE_AGAIN')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao surpreender')
      } finally {
        setLoading(false)
      }
    },
    [pick?.tmdbId],
  )

  useEffect(() => {
    void surprise()
    // montagem inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const platform: Platform = pick?.platforms[0] ?? ownedPlatforms[0] ?? 'netflix'

  return (
    <Focusable focusKey="VIEW_surprise" className={styles.screen} saveLastFocusedChild>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Descoberta</p>
          <h1 className={styles.title}>Surpreenda</h1>
        </div>
        <Focusable
          focusKey="SURPRISE_AGAIN"
          className={styles.againBtn}
          onEnterPress={() => {
            void surprise(pool)
          }}
        >
          Surpreender novamente
        </Focusable>
      </header>

      {loading && !pick ? <p className="empty-state">Sorteando um título…</p> : null}
      {error ? <p className="error-state">{error}</p> : null}

      {pick ? (
        <div className={styles.hero}>
          <TrailerArt
            className={styles.art}
            backdropPath={pick.backdropPath}
            posterPath={pick.posterPath}
            youtubeKey={trailerKey}
          />
          <div className={styles.overlay} />
          <div className={styles.heroBody}>
            <p className={styles.badge}>Sorteio do momento</p>
            <h2 className={styles.pickTitle}>{pick.title}</h2>
            <p className={styles.overview}>
              {pick.overview || 'Sinopse indisponível.'}
            </p>
            <div className={styles.actions}>
              <Focusable
                focusKey="SURPRISE_WATCH"
                className={styles.btn}
                onEnterPress={() => {
                  onWatch(pick, platform)
                }}
              >
                Assistir
              </Focusable>
              <Focusable
                focusKey="SURPRISE_INFO"
                className={cx(styles.btn, styles.btnGhost)}
                onEnterPress={() => {
                  onOpenItem(pick)
                }}
              >
                Mais informações
              </Focusable>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.similar}>
        {similar.length > 0 ? (
          <Row
            id="surprise-similar"
            title="Títulos semelhantes"
            items={similar}
            onSelect={onOpenItem}
          />
        ) : null}
      </div>
    </Focusable>
  )
}
