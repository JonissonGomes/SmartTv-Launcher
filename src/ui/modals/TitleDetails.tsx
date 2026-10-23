import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { APP_CONFIGS, PLATFORM_ORDER } from '@/config/apps'
import type { CatalogItem, Platform } from '@/domain/types'
import {
  extractNetflixId,
  fetchProviderDeepLinks,
} from '@/services/justwatch'
import { getTrailerYoutubeKey } from '@/services/tmdb'
import { launchApp, launchPlatformTitle } from '@/services/webos'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { TrailerArt } from '@/ui/media/TrailerArt'
import { TrailerPlayer } from '@/ui/media/TrailerPlayer'
import styles from './TitleDetails.module.css'

export interface WatchExtras {
  providerUrl?: string
  netflixId?: string
  youtubeVideoId?: string
}

interface TitleDetailsProps {
  item: CatalogItem
  preferredPlatform?: Platform
  onWatch: (item: CatalogItem, platform: Platform, extras?: WatchExtras) => void
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
  const [playingTrailer, setPlayingTrailer] = useState(false)
  const [providerLinks, setProviderLinks] = useState<
    Partial<Record<Platform, string>>
  >({})
  const [linksStatus, setLinksStatus] = useState<'loading' | 'ready' | 'empty'>(
    'loading',
  )
  const [launchError, setLaunchError] = useState<string>()

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
    void setFocus(playingTrailer ? 'TRAILER_CLOSE' : 'DETAILS_WATCH')
  }, [playingTrailer])

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

  useEffect(() => {
    let cancelled = false
    setLinksStatus('loading')
    void (async () => {
      const links = await fetchProviderDeepLinks({
        title: item.title,
        mediaType: item.mediaType,
        tmdbId: item.tmdbId || undefined,
        year: item.releaseYear,
        country: 'BR',
        language: 'pt',
      })
      if (cancelled) return
      setProviderLinks(links)
      setLinksStatus(Object.keys(links).length > 0 ? 'ready' : 'empty')
    })()
    return () => {
      cancelled = true
    }
  }, [item.mediaType, item.releaseYear, item.title, item.tmdbId])

  const extrasFor = (platform: Platform): WatchExtras => ({
    providerUrl: providerLinks[platform],
    netflixId:
      platform === 'netflix'
        ? extractNetflixId(providerLinks.netflix)
        : undefined,
    youtubeVideoId: trailerKey,
  })

  const openStreaming = (platform: Platform) => {
    setLaunchError(undefined)
    setActiveTheme(platform)
    void launchPlatformTitle(
      platform,
      item.title,
      item.tmdbId || undefined,
      extrasFor(platform),
    ).catch((err: unknown) => {
      const text = err instanceof Error ? err.message : String(err)
      setLaunchError(text)
    })
  }

  return (
    <div className={styles.backdrop}>
      <Focusable
        focusKey="TITLE_DETAILS"
        className={styles.panel}
        isFocusBoundary
      >
        <div className={styles.media}>
          {playingTrailer && trailerKey ? (
            <TrailerPlayer
              youtubeKey={trailerKey}
              title={item.title}
              onClose={() => {
                setPlayingTrailer(false)
                void setFocus('DETAILS_WATCH')
              }}
              onOpenYoutubeApp={() => {
                setActiveTheme('youtube')
                void launchApp('youtube', {
                  contentTarget: `v=${trailerKey}`,
                }).catch(() => {
                  void launchApp('youtube')
                })
              }}
            />
          ) : (
            <TrailerArt
              backdropPath={item.backdropPath}
              posterPath={item.posterPath}
              youtubeKey={trailerKey}
              alt=""
            />
          )}
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
                {providerLinks[platform] ? ' · link' : ''}
              </Focusable>
            ))}
          </div>
          <p className={styles.jwNote}>
            {linksStatus === 'loading'
              ? 'Buscando links JustWatch…'
              : linksStatus === 'ready'
                ? 'Links via JustWatch (quando disponíveis).'
                : 'Sem deep link JustWatch — abrirá o app.'}
          </p>

          <div className={styles.actions}>
            <Focusable
              focusKey="DETAILS_WATCH"
              className={styles.btn}
              onEnterPress={() => {
                onWatch(item, selected, extrasFor(selected))
              }}
            >
              Assistir
            </Focusable>
            <Focusable
              focusKey="DETAILS_OPEN_APP"
              className={cx(styles.btn, styles.btnGhost)}
              onEnterPress={() => {
                openStreaming(selected)
              }}
            >
              Abrir {APP_CONFIGS[selected].label}
            </Focusable>
            {trailerKey ? (
              <Focusable
                focusKey="DETAILS_TRAILER"
                className={cx(styles.btn, styles.btnGhost)}
                onEnterPress={() => {
                  setPlayingTrailer(true)
                }}
              >
                Ver trailer
              </Focusable>
            ) : null}
            <Focusable
              focusKey="DETAILS_CLOSE"
              className={cx(styles.btn, styles.btnGhost)}
              onEnterPress={onClose}
            >
              Fechar
            </Focusable>
          </div>
          {launchError ? (
            <p className={styles.launchError}>{launchError}</p>
          ) : null}
        </div>
      </Focusable>
    </div>
  )
}
