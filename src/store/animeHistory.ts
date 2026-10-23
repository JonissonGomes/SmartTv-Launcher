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
  /** Posição em segundos para continuar. */
  currentTime?: number
  duration?: number
  animeId?: string
  episodeId?: string
  lastWatchedAt: string
}

interface AnimeHistoryState {
  entries: AnimeWatchEntry[]
  recordWatch: (
    item: LibraryItem & {
      currentTime?: number
      duration?: number
      animeId?: string
      episodeId?: string
    },
  ) => void
  updateProgress: (
    id: string,
    currentTime: number,
    duration?: number,
  ) => void
  getRecent: (limit?: number) => AnimeWatchEntry[]
}

export const useAnimeHistoryStore = create<AnimeHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      recordWatch: (item) => {
        if (!item.streamUrl) return
        const prev = get().entries.find((e) => e.id === item.id)
        const entry: AnimeWatchEntry = {
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          poster: item.poster,
          streamUrl: item.streamUrl,
          currentTime: item.currentTime ?? prev?.currentTime,
          duration: item.duration ?? prev?.duration,
          animeId: item.animeId ?? prev?.animeId,
          episodeId: item.episodeId ?? prev?.episodeId,
          lastWatchedAt: new Date().toISOString(),
        }
        set((state) => ({
          entries: [
            entry,
            ...state.entries.filter((e) => e.id !== item.id),
          ].slice(0, 40),
        }))
      },

      updateProgress: (id, currentTime, duration) => {
        if (currentTime < 5) return
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id
              ? {
                  ...e,
                  currentTime,
                  duration: duration ?? e.duration,
                  lastWatchedAt: new Date().toISOString(),
                }
              : e,
          ),
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
