import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useState } from 'react'
import { pushBackHandler } from '@/ui/input/backStack'
import { APP_CONFIGS } from '@/config/apps'
import { isAnimeCatalogItem } from '@/domain/catalogAnime'
import type { CatalogItem, Platform } from '@/domain/types'
import {
  extractNetflixId,
  fetchProviderDeepLinks,
} from '@/services/justwatch'
import { getTrailerYoutubeKey, getWatchProviders } from '@/services/tmdb'
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
  const anime = useMemo(() => isAnimeCatalogItem(item), [item])

  /** Só plataformas verificadas (TMDB BR) — nunca lista todos os apps. */
  const [platforms, setPlatforms] = useState<Platform[]>(() =>
    item.platforms.length > 0 ? item.platforms : anime ? ['animefire'] : [],
  )
  const [selected, setSelected] = useState<Platform>(
    () =>
      (preferredPlatform && platforms.includes(preferredPlatform)
        ? preferredPlatform
        : platforms[0]) ?? (anime ? 'animefire' : 'netflix'),
  )

  useEffect(() => {
    void setFocus(playingTrailer ? 'TRAILER_CLOSE' : 'DETAILS_WATCH')
  }, [playingTrailer])

  useEffect(() => {
    return pushBackHandler(() => {
      if (playingTrailer) {
        setPlayingTrailer(false)
        void setFocus('DETAILS_TRAILER')
        return true
      }
      onClose()
      return true
    })
  }, [playingTrailer, onClose])

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
      const [tmdbProviders, links] = await Promise.all([
        item.tmdbId > 0
          ? getWatchProviders(item.mediaType, item.tmdbId)
          : Promise.resolve([] as Platform[]),
        anime
          ? Promise.resolve({} as Partial<Record<Platform, string>>)
          : fetchProviderDeepLinks({
              title: item.title,
              mediaType: item.mediaType,
              tmdbId: item.tmdbId || undefined,
              year: item.releaseYear,
              country: 'BR',
              language: 'pt',
            }),
      ])
      if (cancelled) return

      const verified = tmdbProviders.filter(
        (p) => ownedPlatforms.includes(p) && p !== 'youtube' && p !== 'animefire',
      )
      const withJw = (Object.keys(links) as Platform[]).filter(
        (p) => ownedPlatforms.includes(p) && p !== 'youtube',
      )

      // Preferir interseção JustWatch ∩ TMDB; senão só TMDB BR confirmado.
      let next: Platform[] =
        withJw.length > 0
          ? withJw.filter((p) => verified.includes(p) || verified.length === 0)
          : verified

      if (withJw.length > 0 && next.length === 0) {
        next = withJw
      }

      if (anime) {
        next = ['animefire', ...next.filter((p) => p !== 'animefire')]
      }

      // Sem inventar streamings: se vazio e não é anime, fica vazio.
      if (next.length === 0 && item.platforms.includes('animefire')) {
        next = ['animefire']
      }

      setPlatforms(next)
      setProviderLinks(links)
      setLinksStatus(
        anime
          ? 'ready'
          : Object.keys(links).length > 0
            ? 'ready'
            : next.length > 0
              ? 'ready'
              : 'empty',
      )
      const prefer =
        preferredPlatform && next.includes(preferredPlatform)
          ? preferredPlatform
          : next[0]
      if (prefer) setSelected(prefer)
    })()
    return () => {
      cancelled = true
    }
  }, [
    anime,
    item.mediaType,
    item.platforms,
    item.releaseYear,
    item.title,
    item.tmdbId,
    ownedPlatforms,
    preferredPlatform,
  ])

  const extrasFor = (platform: Platform): WatchExtras => ({
    providerUrl: providerLinks[platform],
    netflixId:
      platform === 'netflix'
        ? extractNetflixId(providerLinks.netflix)
        : undefined,
    youtubeVideoId: trailerKey,
  })

  const openStreaming = (platform: Platform) => {
    if (platform === 'animefire') {
      onWatch(item, platform, extrasFor(platform))
      return
    }
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
            {platforms.length === 0 && linksStatus !== 'loading' ? (
              <p className={styles.jwNote}>
                Nenhuma plataforma confirmada no Brasil para este título.
              </p>
            ) : null}
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
                {platform === 'animefire'
                  ? ' · app'
                  : providerLinks[platform]
                    ? ' · link'
                    : ''}
              </Focusable>
            ))}
          </div>
          <p className={styles.jwNote}>
            {linksStatus === 'loading'
              ? 'Confirmando onde assistir…'
              : anime
                ? 'Animes: prioridade AnimeFire; outros só se confirmados no BR.'
                : linksStatus === 'ready'
                  ? 'Somente streamings confirmados (TMDB/JustWatch BR).'
                  : 'Sem confirmação de disponibilidade.'}
          </p>

          <div className={styles.actions}>
            <Focusable
              focusKey="DETAILS_WATCH"
              className={styles.btn}
              onEnterPress={() => {
                if (platforms.length === 0) return
                onWatch(item, selected, extrasFor(selected))
              }}
            >
              {selected === 'animefire' ? 'Assistir no AnimeFire' : 'Assistir'}
            </Focusable>
            {selected !== 'animefire' ? (
              <Focusable
                focusKey="DETAILS_OPEN_APP"
                className={cx(styles.btn, styles.btnGhost)}
                onEnterPress={() => {
                  openStreaming(selected)
                }}
              >
                Abrir {APP_CONFIGS[selected].label}
              </Focusable>
            ) : null}
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
