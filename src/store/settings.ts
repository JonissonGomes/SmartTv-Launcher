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
  reducedMotion: boolean
  setView: (view: AppView) => void
  setActiveTheme: (platform: Platform | null) => void
  togglePlatform: (platform: Platform) => void
  setReducedMotion: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      view: 'home',
      ownedPlatforms: [...PLATFORM_ORDER],
      activeTheme: null,
      reducedMotion: false,

      setView: (view) => set({ view }),

      setActiveTheme: (platform) => set({ activeTheme: platform }),

      togglePlatform: (platform) => {
        const current = get().ownedPlatforms
        if (current.includes(platform)) {
          set({ ownedPlatforms: current.filter((p) => p !== platform) })
        } else {
          set({ ownedPlatforms: [...current, platform] })
        }
      },

      setReducedMotion: (value) => set({ reducedMotion: value }),
    }),
    {
      name: 'launcher-settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        ownedPlatforms: state.ownedPlatforms,
        activeTheme: state.activeTheme,
        reducedMotion: state.reducedMotion,
      }),
    },
  ),
)
