import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { APP_CONFIGS, PLATFORM_ORDER } from '@/config/apps'
import type { CatalogItem, Platform } from '@/domain/types'
import {
  getTrailerYoutubeKey,
  imageUrl,
  youtubeEmbedUrl,
} from '@/services/tmdb'
import { launchApp } from '@/services/webos'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './TitleDetails.module.css'

interface TitleDetailsProps {
  item: CatalogItem
  preferredPlatform?: Platform
  onWatch: (item: CatalogItem, platform: Platform) => void
  onClose: () => void
}

export function TitleDetails({
  item,
  preferredPlatform,
  onWatch,
  onClose,
}: TitleDetailsProps) {
  const ownedPlatforms = useSettingsStore((s) => s.ownedPlatforms)
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme)
  const [trailerKey, setTrailerKey] = useState<string>()

  const platforms =
    item.platforms.length > 0
      ? item.platforms
      : ownedPlatforms.length > 0
        ? ownedPlatforms
        : PLATFORM_ORDER.slice(0, 1)

  const initialPlatform =
    preferredPlatform && platforms.includes(preferredPlatform)
      ? preferredPlatform
      : (platforms[0] ?? 'netflix')

  const [selected, setSelected] = useState<Platform>(initialPlatform)

  useEffect(() => {
    void setFocus('DETAILS_WATCH')
  }, [])

  useEffect(() => {
    setSelected(initialPlatform)
  }, [initialPlatform])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const key = await getTrailerYoutubeKey(item.mediaType, item.tmdbId)
      if (!cancelled) setTrailerKey(key)
    })()
    return () => {
      cancelled = true
    }
  }, [item.mediaType, item.tmdbId])

  const poster = imageUrl(item.backdropPath ?? item.posterPath, 'w780')

  return (
    <div className={styles.backdrop}>
      <Focusable focusKey="TITLE_DETAILS" className={styles.panel} isFocusBoundary>
        <div className={styles.media}>
          {trailerKey ? (
            <iframe
              className={styles.trailer}
              src={youtubeEmbedUrl(trailerKey, true)}
              title={`Trailer ${item.title}`}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : poster ? (
            <img className={styles.poster} src={poster} alt="" />
          ) : null}
        </div>

        <div className={styles.info}>
          <p className={styles.kicker}>Mais informações</p>
          <h2 className={styles.title}>{item.title}</h2>
          <p className={styles.meta}>
            {[
              item.mediaType === 'tv' ? 'Série' : 'Filme',
              item.releaseYear ? String(item.releaseYear) : null,
              item.voteAverage > 0 ? `★ ${item.voteAverage.toFixed(1)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className={styles.overview}>
            {item.overview || 'Sinopse indisponível para este título.'}
          </p>

          <p className={styles.platformsLabel}>Onde assistir</p>
          <div className={styles.platforms}>
            {platforms.map((platform) => (
              <Focusable
                key={platform}
                focusKey={`DETAILS_PLATFORM_${platform}`}
                className={cx(
                  styles.chip,
                  platform === selected && styles.chipActive,
                )}
                onEnterPress={() => {
                  setSelected(platform)
                  setActiveTheme(platform)
                }}
              >
                {APP_CONFIGS[platform].label}
              </Focusable>
            ))}
          </div>

          <div className={styles.actions}>
            <Focusable
              focusKey="DETAILS_WATCH"
              className={styles.btn}
              onEnterPress={() => {
                onWatch(item, selected)
              }}
            >
              Assistir
            </Focusable>
            <Focusable
              focusKey="DETAILS_OPEN_APP"
              className={cx(styles.btn, styles.btnGhost)}
              onEnterPress={() => {
                setActiveTheme(selected)
                void launchApp(selected)
              }}
            >
              Abrir {APP_CONFIGS[selected].label}
            </Focusable>
            <Focusable
              focusKey="DETAILS_TRAILER_APP"
              className={cx(styles.btn, styles.btnGhost)}
              onEnterPress={() => {
                setActiveTheme('youtube')
                void launchApp('youtube')
              }}
            >
              Trailer no YouTube
            </Focusable>
            <Focusable
              focusKey="DETAILS_CLOSE"
              className={cx(styles.btn, styles.btnGhost)}
              onEnterPress={onClose}
            >
              Fechar
            </Focusable>
          </div>
        </div>
      </Focusable>
    </div>
  )
}
