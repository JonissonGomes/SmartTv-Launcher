import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { LibraryItem } from '@/domain/library'
import { idbStorage } from '@/store/idbStorage'

export interface AnimeWatchEntry {
  /** Sempre o id do anime (um card por título no Continuar). */
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

function sameAnime(entry: AnimeWatchEntry, animeId: string, id: string): boolean {
  if (entry.id === id) return true
  if (entry.animeId && entry.animeId === animeId) return true
  // Legado: id era `${animeId}-${episodeId}`
  if (entry.id.startsWith(`${animeId}-`)) return true
  return false
}

export const useAnimeHistoryStore = create<AnimeHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      recordWatch: (item) => {
        if (!item.streamUrl) return
        const animeId = item.animeId || item.id
        const id = animeId
        const prev = get().entries.find((e) => sameAnime(e, animeId, id))
        const entry: AnimeWatchEntry = {
          id,
          title: item.title,
          subtitle: item.subtitle,
          // Preferir capa do título (still de ep costuma ser “loading”)
          poster: item.poster || prev?.poster,
          streamUrl: item.streamUrl,
          // Troca de episódio: zera progresso herdado do ep anterior
          currentTime:
            item.episodeId && prev?.episodeId && item.episodeId !== prev.episodeId
              ? (item.currentTime ?? 0)
              : (item.currentTime ?? prev?.currentTime),
          duration:
            item.episodeId && prev?.episodeId && item.episodeId !== prev.episodeId
              ? item.duration
              : (item.duration ?? prev?.duration),
          animeId,
          episodeId: item.episodeId ?? prev?.episodeId,
          lastWatchedAt: new Date().toISOString(),
        }
        set((state) => ({
          entries: [
            entry,
            ...state.entries.filter((e) => !sameAnime(e, animeId, id)),
          ].slice(0, 40),
        }))
      },

      updateProgress: (id, currentTime, duration) => {
        if (currentTime < 5) return
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id || e.animeId === id
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

      getRecent: (limit = 12) => {
        const seen = new Set<string>()
        return [...get().entries]
          .sort(
            (a, b) =>
              new Date(b.lastWatchedAt).getTime() -
              new Date(a.lastWatchedAt).getTime(),
          )
          .filter((e) => {
            const key = e.animeId || e.id
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, limit)
      },
    }),
    {
      name: 'launcher-anime-history',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
)
