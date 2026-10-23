import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AppView, Platform } from '@/domain/types'
import { PLATFORM_ORDER } from '@/config/apps'
import { idbStorage } from '@/store/idbStorage'

interface SettingsState {
  view: AppView
  ownedPlatforms: Platform[]
  /** Tema visual ativo (acento/transparência). */
  activeTheme: Platform | null
  /** Streaming cujo catálogo está aberto em `view === 'platform'`. */
  catalogPlatform: Platform | null
  /** Site próprio (biblioteca web) — https obrigatório em prod. */
  libraryBaseUrl: string
  reducedMotion: boolean
  setView: (view: AppView) => void
  setActiveTheme: (platform: Platform | null) => void
  openPlatformCatalog: (platform: Platform) => void
  togglePlatform: (platform: Platform) => void
  setLibraryBaseUrl: (url: string) => void
  setReducedMotion: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      view: 'home',
      ownedPlatforms: [...PLATFORM_ORDER],
      activeTheme: null,
      catalogPlatform: null,
      libraryBaseUrl: 'https://assistiranimesonline.net',
      reducedMotion: false,

      setView: (view) => set({ view }),

      setActiveTheme: (platform) => set({ activeTheme: platform }),

      openPlatformCatalog: (platform) =>
        set({
          catalogPlatform: platform,
          activeTheme: platform,
          view: 'platform',
        }),

      togglePlatform: (platform) => {
        const current = get().ownedPlatforms
        if (current.includes(platform)) {
          set({ ownedPlatforms: current.filter((p) => p !== platform) })
        } else {
          set({ ownedPlatforms: [...current, platform] })
        }
      },

      setLibraryBaseUrl: (url) => set({ libraryBaseUrl: url }),

      setReducedMotion: (value) => set({ reducedMotion: value }),
    }),
    {
      name: 'launcher-settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        ownedPlatforms: state.ownedPlatforms,
        activeTheme: state.activeTheme,
        libraryBaseUrl: state.libraryBaseUrl,
        reducedMotion: state.reducedMotion,
      }),
    },
  ),
)
