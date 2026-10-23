import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { LibraryItem } from '@/domain/library'
import { idbStorage } from '@/store/idbStorage'

export interface AnimeWatchEntry {
  id: string
  title: string
  subtitle?: string
  poster?: string
  streamUrl: string
  lastWatchedAt: string
}

interface AnimeHistoryState {
  entries: AnimeWatchEntry[]
  recordWatch: (item: LibraryItem) => void
  getRecent: (limit?: number) => AnimeWatchEntry[]
}

export const useAnimeHistoryStore = create<AnimeHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      recordWatch: (item) => {
        if (!item.streamUrl) return
        const entry: AnimeWatchEntry = {
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          poster: item.poster,
          streamUrl: item.streamUrl,
          lastWatchedAt: new Date().toISOString(),
        }
        set((state) => ({
          entries: [
            entry,
            ...state.entries.filter((e) => e.id !== item.id),
          ].slice(0, 40),
        }))
      },

      getRecent: (limit = 12) =>
        [...get().entries]
          .sort(
            (a, b) =>
              new Date(b.lastWatchedAt).getTime() -
              new Date(a.lastWatchedAt).getTime(),
          )
          .slice(0, limit),
    }),
    {
      name: 'launcher-anime-history',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
)
