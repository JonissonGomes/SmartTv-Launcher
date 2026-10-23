import {
  init,
  setFocus,
  setKeyMap,
} from '@noriginmedia/norigin-spatial-navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAnimeFireOnlyItem } from '@/domain/catalogAnime'
import type { CatalogItem, Platform, WatchEntry } from '@/domain/types'
import { useHomeFeed } from '@/hooks/useHomeFeed'
import { resolveByTitle } from '@/services/tmdb'
import { launchPlatformTitle } from '@/services/webos'
import {
  useHistoryStore,
  watchEntryFromLaunch,
} from '@/store/history'
import { useProfilesStore } from '@/store/profiles'
import { useSettingsStore } from '@/store/settings'
import { Shell } from '@/ui/layout/Shell'
import {
  EpisodePrompt,
  type EpisodeSelection,
} from '@/ui/modals/EpisodePrompt'
import { ProfilePicker } from '@/ui/modals/ProfilePicker'
import { TitleDetails } from '@/ui/modals/TitleDetails'
import { CategoriesScreen } from '@/ui/screens/CategoriesScreen'
import { ControllerScreen } from '@/ui/screens/ControllerScreen'
import { GamesScreen } from '@/ui/screens/GamesScreen'
import { HistoryScreen } from '@/ui/screens/HistoryScreen'
import { HomeScreen } from '@/ui/screens/HomeScreen'
import { LibraryScreen } from '@/ui/screens/LibraryScreen'
import { PlatformScreen } from '@/ui/screens/PlatformScreen'
import { SearchScreen } from '@/ui/screens/SearchScreen'
import { SettingsScreen } from '@/ui/screens/SettingsScreen'
import { SurpriseScreen } from '@/ui/screens/SurpriseScreen'
import { installImageCacheLifecycle } from '@/services/imageCache'
import { useUiSessionStore } from '@/store/uiSession'
import { runBackHandlers } from '@/ui/input/backStack'
import { installMagicRemoteScroll } from '@/ui/input/magicRemoteScroll'
import { ThemeRoot } from '@/ui/theme/ThemeRoot'

function readControllerRoom(): string | null {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('controller') !== '1') return null
    const room = params.get('room')?.trim().toUpperCase()
    return room && room.length >= 3 ? room : null
  } catch {
    return null
  }
}

init({
  debug: false,
  visualDebug: false,
  // ~1 frame a 60Hz — D-pad mais responsivo sem flood
  throttle: 16,
})

setKeyMap({
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  enter: 13,
})

interface PendingLaunch {
  title: string
  platform: Platform
  mediaType: WatchEntry['mediaType']
  tmdbId?: number
  genreIds: number[]
  posterPath?: string
  backdropPath?: string
  overview?: string
  voteAverage?: number
  season?: number
  episode?: number
  providerUrl?: string
  netflixId?: string
  youtubeVideoId?: string
}

function focusHome(hasHero: boolean): void {
  void setFocus(hasHero ? 'HERO' : 'VIEW_home')
}

/** Após desmontar modal/botão focado, o spatial-nav precisa de 1–2 frames. */
function scheduleFocusHome(hasHero: boolean): void {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      focusHome(hasHero)
    })
  })
}

function entryToCatalog(entry: WatchEntry): CatalogItem {
  return {
    tmdbId: entry.tmdbId ?? 0,
    mediaType: entry.mediaType,
    title: entry.title,
    overview: entry.overview ?? '',
    posterPath: entry.posterPath ?? null,
    backdropPath: entry.backdropPath ?? null,
    genreIds: entry.genreIds,
    voteAverage: entry.voteAverage ?? 0,
    platforms: [entry.platform],
  }
}

export default function App() {
  const controllerRoom = readControllerRoom()
  const view = useSettingsStore((s) => s.view)
  const goBackView = useSettingsStore((s) => s.goBackView)
  const setView = useSettingsStore((s) => s.setView)
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme)
  const setAnimeDeepLinkTitle = useUiSessionStore((s) => s.setAnimeDeepLinkTitle)
  const catalogPlatform = useSettingsStore((s) => s.catalogPlatform)
  const ownedPlatforms = useSettingsStore((s) => s.ownedPlatforms)
  const addEntry = useHistoryStore((s) => s.addEntry)
  const entries = useHistoryStore((s) => s.entries)
  const profiles = useProfilesStore((s) => s.profiles)
  const profilesHydrated = useProfilesStore((s) => s.hydrated)
  const activeProfileId = useProfilesStore((s) => s.activeProfileId)
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
  const preferredGenreIds = activeProfile?.preferredGenreIds ?? []
  const [pending, setPending] = useState<PendingLaunch | null>(null)
  const [details, setDetails] = useState<CatalogItem | null>(null)
  const [showProfiles, setShowProfiles] = useState(false)

  const needsProfileSetup = profilesHydrated && profiles.length === 0

  const profileEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          !activeProfileId ||
          !e.profileId ||
          e.profileId === activeProfileId,
      ),
    [activeProfileId, entries],
  )

  const feed = useHomeFeed(profileEntries, ownedPlatforms, preferredGenreIds)

  const continuing = useMemo(
    () =>
      [...profileEntries]
        .filter((e) => !e.finished)
        .sort(
          (a, b) =>
            new Date(b.lastWatchedAt).getTime() -
            new Date(a.lastWatchedAt).getTime(),
        )
        .slice(0, 5),
    [profileEntries],
  )

  const hasHero = continuing.length > 0

  useEffect(() => {
    if (needsProfileSetup) setShowProfiles(true)
  }, [needsProfileSetup])

  useEffect(() => installMagicRemoteScroll(), [])
  useEffect(() => installImageCacheLifecycle(), [])

  useEffect(() => {
    if (needsProfileSetup || showProfiles) return
    focusHome(hasHero)
  }, [hasHero, needsProfileSetup, showProfiles])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.keyCode !== 461 && event.key !== 'Escape') return

      // Handlers locais (player, rail anime, teclado…)
      if (runBackHandlers()) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (showProfiles && !needsProfileSetup) {
        setShowProfiles(false)
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (details) {
        setDetails(null)
        // Volta o foco para o conteúdo atual — não para o início
        window.requestAnimationFrame(() => {
          void setFocus('MAIN')
        })
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (pending) {
        setPending(null)
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (goBackView()) {
        const next = useSettingsStore.getState().view
        window.requestAnimationFrame(() => {
          void setFocus(
            next === 'home'
              ? hasHero
                ? 'HERO'
                : 'VIEW_home'
              : next === 'anime' || next === 'library'
                ? 'VIEW_anime'
                : `VIEW_${next}`,
          )
        })
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [
    details,
    goBackView,
    hasHero,
    needsProfileSetup,
    pending,
    showProfiles,
  ])

  const commitLaunch = useCallback(
    async (data: PendingLaunch, episode?: EpisodeSelection) => {
      addEntry(
        watchEntryFromLaunch({
          ...data,
          profileId: useProfilesStore.getState().activeProfileId ?? undefined,
          season: episode?.season ?? data.season,
          episode: episode?.episode ?? data.episode,
        }),
      )

      try {
        await launchPlatformTitle(data.platform, data.title, data.tmdbId, {
          netflixId: data.netflixId,
          providerUrl: data.providerUrl,
          youtubeVideoId: data.youtubeVideoId,
        })
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err)
        console.warn('[launch]', text)
        window.alert(
          `Não foi possível abrir ${data.platform}.\n${text}\n\nConfira Configurações → Testar ${data.platform}.`,
        )
      } finally {
        setPending(null)
        setDetails(null)
        // Assistir desmonta o botão focado (HERO_CONTINUE / DETAILS_WATCH).
        scheduleFocusHome(true)
      }
    },
    [addEntry],
  )

  const openDetails = useCallback(
    (item: CatalogItem) => {
      // Lançamentos AnimeFire do home → módulo Animes (sem modal TMDB)
      if (isAnimeFireOnlyItem(item)) {
        setActiveTheme('animefire')
        setAnimeDeepLinkTitle(item.title)
        setView('anime')
        window.requestAnimationFrame(() => {
          void setFocus('VIEW_anime')
        })
        return
      }
      const platform: Platform =
        item.platforms[0] ??
        useSettingsStore.getState().ownedPlatforms[0] ??
        'netflix'
      setActiveTheme(platform)
      setDetails(item)
    },
    [setActiveTheme, setAnimeDeepLinkTitle, setView],
  )

  const watchFromDetails = useCallback(
    (
      item: CatalogItem,
      platform: Platform,
      extras?: {
        providerUrl?: string
        netflixId?: string
        youtubeVideoId?: string
      },
    ) => {
      setDetails(null)

      if (platform === 'animefire') {
        setActiveTheme('animefire')
        setAnimeDeepLinkTitle(item.title)
        setView('anime')
        window.requestAnimationFrame(() => {
          void setFocus('VIEW_anime')
        })
        return
      }

      setActiveTheme(platform)
      const payload: PendingLaunch = {
        title: item.title,
        platform,
        mediaType: item.mediaType,
        tmdbId: item.tmdbId || undefined,
        genreIds: item.genreIds,
        posterPath: item.posterPath ?? undefined,
        backdropPath: item.backdropPath ?? undefined,
        overview: item.overview,
        voteAverage: item.voteAverage,
        providerUrl: extras?.providerUrl,
        netflixId: extras?.netflixId,
        youtubeVideoId: extras?.youtubeVideoId,
      }

      if (item.mediaType === 'tv') {
        setPending(payload)
        return
      }

      void commitLaunch(payload)
    },
    [commitLaunch, setActiveTheme, setAnimeDeepLinkTitle, setView],
  )

  const continueEntry = useCallback(
    (entry: WatchEntry) => {
      setActiveTheme(entry.platform)
      const payload: PendingLaunch = {
        title: entry.title,
        platform: entry.platform,
        mediaType: entry.mediaType,
        tmdbId: entry.tmdbId,
        genreIds: entry.genreIds,
        posterPath: entry.posterPath,
        backdropPath: entry.backdropPath,
        overview: entry.overview,
        voteAverage: entry.voteAverage,
        season: entry.season,
        episode: entry.episode,
      }

      if (entry.mediaType === 'tv' && !entry.episode) {
        setPending(payload)
        return
      }

      void commitLaunch(payload)
    },
    [commitLaunch, setActiveTheme],
  )

  const moreInfoEntry = useCallback(
    (entry: WatchEntry) => {
      openDetails(entryToCatalog(entry))
    },
    [openDetails],
  )

  const continueById = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id)
      if (entry) continueEntry(entry)
    },
    [continueEntry, entries],
  )

  useEffect(() => {
    const orphans = profileEntries.filter((e) => !e.tmdbId).slice(0, 3)
    if (orphans.length === 0) return

    let cancelled = false
    void (async () => {
      for (const orphan of orphans) {
        try {
          const found = await resolveByTitle(orphan.title, undefined, orphan.mediaType)
          if (cancelled || !found) continue
          useHistoryStore.getState().updateEntry(orphan.id, {
            tmdbId: found.tmdbId,
            genreIds: found.genreIds,
            posterPath: found.posterPath ?? undefined,
            backdropPath: found.backdropPath ?? undefined,
            overview: found.overview,
            voteAverage: found.voteAverage,
          })
        } catch {
          // silencioso
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [profileEntries])

  if (controllerRoom) {
    return (
      <ThemeRoot>
        <ControllerScreen roomId={controllerRoom} />
      </ThemeRoot>
    )
  }

  return (
    <ThemeRoot>
      <Shell
        continuing={continuing}
        rail={feed.rail}
        onOpenItem={openDetails}
        onOpenProfiles={() => {
          setShowProfiles(true)
        }}
      >
        {view === 'home' ? (
          <HomeScreen
            rows={feed.rows}
            loading={feed.loading}
            error={feed.error}
            onOpenItem={openDetails}
            onContinueEntry={continueEntry}
            onMoreInfoEntry={moreInfoEntry}
          />
        ) : null}
        {view === 'platform' && catalogPlatform ? (
          <PlatformScreen
            platform={catalogPlatform}
            onOpenItem={openDetails}
          />
        ) : null}
        {view === 'categories' ? (
          <CategoriesScreen onOpenItem={openDetails} />
        ) : null}
        {view === 'surprise' ? (
          <SurpriseScreen onOpenItem={openDetails} onWatch={watchFromDetails} />
        ) : null}
        {view === 'games' ? <GamesScreen /> : null}
        {view === 'history' ? (
          <HistoryScreen onContinueId={continueById} />
        ) : null}
        {view === 'search' ? <SearchScreen onSelect={openDetails} /> : null}
        {view === 'anime' || view === 'library' ? <LibraryScreen /> : null}
        {view === 'settings' ? <SettingsScreen /> : null}
      </Shell>

      {/* Fora do Shell/Focusable MAIN para position:fixed não ser clipado */}
      {details ? (
        <TitleDetails
          item={details}
          onWatch={watchFromDetails}
          onClose={() => {
            setDetails(null)
            focusHome(hasHero)
          }}
        />
      ) : null}

      {pending ? (
        <EpisodePrompt
          title={pending.title}
          initialSeason={pending.season ?? 1}
          initialEpisode={pending.episode ?? 1}
          onConfirm={(selection) => {
            void commitLaunch(pending, selection)
          }}
          onSkip={() => {
            void commitLaunch(pending)
          }}
        />
      ) : null}

      {showProfiles || needsProfileSetup ? (
        <ProfilePicker
          mode={needsProfileSetup ? 'setup' : 'switch'}
          onDone={() => {
            setShowProfiles(false)
            focusHome(hasHero)
          }}
        />
      ) : null}
    </ThemeRoot>
  )
}
