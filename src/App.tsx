import {
  init,
  setFocus,
  setKeyMap,
} from '@noriginmedia/norigin-spatial-navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { HistoryScreen } from '@/ui/screens/HistoryScreen'
import { HomeScreen } from '@/ui/screens/HomeScreen'
import { PlatformScreen } from '@/ui/screens/PlatformScreen'
import { SearchScreen } from '@/ui/screens/SearchScreen'
import { SettingsScreen } from '@/ui/screens/SettingsScreen'
import { SurpriseScreen } from '@/ui/screens/SurpriseScreen'
import { ThemeRoot } from '@/ui/theme/ThemeRoot'

init({
  debug: false,
  visualDebug: false,
  throttle: 120,
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
}

function focusHome(hasHero: boolean): void {
  void setFocus(hasHero ? 'HERO' : 'VIEW_home')
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
  const view = useSettingsStore((s) => s.view)
  const setView = useSettingsStore((s) => s.setView)
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme)
  const catalogPlatform = useSettingsStore((s) => s.catalogPlatform)
  const ownedPlatforms = useSettingsStore((s) => s.ownedPlatforms)
  const addEntry = useHistoryStore((s) => s.addEntry)
  const entries = useHistoryStore((s) => s.entries)
  const profiles = useProfilesStore((s) => s.profiles)
  const profilesHydrated = useProfilesStore((s) => s.hydrated)
  const activeProfileId = useProfilesStore((s) => s.activeProfileId)
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

  const feed = useHomeFeed(profileEntries, ownedPlatforms)

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

  useEffect(() => {
    if (needsProfileSetup || showProfiles) return
    focusHome(hasHero)
  }, [hasHero, needsProfileSetup, showProfiles])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.keyCode !== 461 && event.key !== 'Escape') return

      if (showProfiles && !needsProfileSetup) {
        setShowProfiles(false)
        event.preventDefault()
        return
      }

      if (details) {
        setDetails(null)
        focusHome(hasHero)
        event.preventDefault()
        return
      }

      if (pending) {
        setPending(null)
        event.preventDefault()
        return
      }

      if (view !== 'home') {
        setView('home')
        focusHome(hasHero)
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [details, hasHero, needsProfileSetup, pending, setView, showProfiles, view])

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

      await launchPlatformTitle(data.platform, data.title, data.tmdbId)
      setPending(null)
      setDetails(null)
    },
    [addEntry],
  )

  const openDetails = useCallback(
    (item: CatalogItem) => {
      const platform: Platform =
        item.platforms[0] ??
        useSettingsStore.getState().ownedPlatforms[0] ??
        'netflix'
      setActiveTheme(platform)
      setDetails(item)
    },
    [setActiveTheme],
  )

  const watchFromDetails = useCallback(
    (item: CatalogItem, platform: Platform) => {
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
      }

      setDetails(null)

      if (item.mediaType === 'tv') {
        setPending(payload)
        return
      }

      void commitLaunch(payload)
    },
    [commitLaunch, setActiveTheme],
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

  return (
    <ThemeRoot>
      <Shell
        continuing={continuing}
        rail={feed.rail}
        onOpenItem={openDetails}
        onOpenProfiles={() => {
          setShowProfiles(true)
        }}
        showRail={view === 'home' || view === 'history'}
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
        {view === 'history' ? (
          <HistoryScreen onContinueId={continueById} />
        ) : null}
        {view === 'search' ? <SearchScreen onSelect={openDetails} /> : null}
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
