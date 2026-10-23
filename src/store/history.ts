import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Platform, WatchEntry } from '@/domain/types'
import { clampHistoryEntries } from '@/services/launchSafety'
import { idbStorage } from '@/store/idbStorage'

function sameWatchTarget(a: WatchEntry, b: Omit<WatchEntry, 'id'>): boolean {
  if (a.platform !== b.platform) return false
  if ((a.profileId ?? '') !== (b.profileId ?? '')) return false
  if (a.tmdbId && b.tmdbId) return a.tmdbId === b.tmdbId
  return a.title.toLowerCase() === b.title.toLowerCase()
}

interface HistoryState {
  entries: WatchEntry[]
  hydrated: boolean
  setHydrated: (value: boolean) => void
  addEntry: (entry: Omit<WatchEntry, 'id'> & { id?: string }) => WatchEntry
  updateEntry: (id: string, patch: Partial<WatchEntry>) => void
  removeEntry: (id: string) => void
  markFinished: (id: string, finished?: boolean) => void
  importEntries: (entries: Omit<WatchEntry, 'id'>[]) => void
  clear: () => void
  getContinueWatching: () => WatchEntry[]
  getHeroEntry: () => WatchEntry | undefined
}

function createId(): string {
  return crypto.randomUUID()
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),

      addEntry: (entry) => {
        let saved: WatchEntry = {
          ...entry,
          id: entry.id ?? createId(),
          lastWatchedAt: entry.lastWatchedAt,
        }

        set((state) => {
          const existing = state.entries.find((e) => sameWatchTarget(e, saved))
          if (existing) {
            saved = {
              ...existing,
              ...saved,
              id: existing.id,
            }
            return {
              entries: clampHistoryEntries([
                saved,
                ...state.entries.filter((e) => e.id !== existing.id),
              ]),
            }
          }

          return {
            entries: clampHistoryEntries([saved, ...state.entries]),
          }
        })

        return saved
      },

      updateEntry: (id, patch) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        }))
      },

      removeEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }))
      },

      markFinished: (id, finished = true) => {
        get().updateEntry(id, { finished })
      },

      importEntries: (entries) => {
        const mapped = entries.map((e) => ({ ...e, id: createId() }))
        set((state) => ({ entries: [...mapped, ...state.entries] }))
      },

      clear: () => set({ entries: [] }),

      getContinueWatching: () =>
        [...get().entries]
          .filter((e) => !e.finished)
          .sort(
            (a, b) =>
              new Date(b.lastWatchedAt).getTime() -
              new Date(a.lastWatchedAt).getTime(),
          ),

      getHeroEntry: () => get().getContinueWatching()[0],
    }),
    {
      name: 'launcher-history',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ entries: state.entries }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)

export function watchEntryFromLaunch(input: {
  title: string
  platform: Platform
  mediaType: WatchEntry['mediaType']
  profileId?: string
  tmdbId?: number
  genreIds?: number[]
  season?: number
  episode?: number
  posterPath?: string
  backdropPath?: string
  overview?: string
  voteAverage?: number
}): Omit<WatchEntry, 'id'> {
  return {
    title: input.title,
    platform: input.platform,
    mediaType: input.mediaType,
    profileId: input.profileId,
    tmdbId: input.tmdbId,
    genreIds: input.genreIds ?? [],
    season: input.season,
    episode: input.episode,
    posterPath: input.posterPath,
    backdropPath: input.backdropPath,
    overview: input.overview,
    voteAverage: input.voteAverage,
    lastWatchedAt: new Date().toISOString(),
    finished: false,
  }
}
