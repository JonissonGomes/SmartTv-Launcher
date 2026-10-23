import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AppView, Platform } from '@/domain/types'
import { PLATFORM_ORDER } from '@/config/apps'
import { idbStorage } from '@/store/idbStorage'

interface SettingsState {
  view: AppView
  /** Pilha de telas anteriores (Back do controle). */
  viewStack: AppView[]
  ownedPlatforms: Platform[]
  /** Tema visual ativo (acento/transparência). */
  activeTheme: Platform | null
  /** Streaming cujo catálogo está aberto em `view === 'platform'`. */
  catalogPlatform: Platform | null
  /** Site próprio (biblioteca web) — https obrigatório em prod. */
  libraryBaseUrl: string
  reducedMotion: boolean
  setView: (view: AppView) => void
  /** Volta à tela anterior; false se já estava no início. */
  goBackView: () => boolean
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
      viewStack: [],
      ownedPlatforms: [...PLATFORM_ORDER],
      activeTheme: null,
      catalogPlatform: null,
      libraryBaseUrl: 'https://animefire.one',
      reducedMotion: false,

      setView: (view) => {
        const next = view === 'library' ? 'anime' : view
        set((state) => {
          if (state.view === next) return state
          return {
            view: next,
            viewStack: [...state.viewStack.slice(-10), state.view],
          }
        })
      },

      goBackView: () => {
        const { viewStack } = get()
        if (viewStack.length === 0) {
          if (get().view !== 'home') {
            set({ view: 'home', viewStack: [] })
            return true
          }
          return false
        }
        const prev = viewStack[viewStack.length - 1]!
        set({
          view: prev,
          viewStack: viewStack.slice(0, -1),
        })
        return true
      },

      setActiveTheme: (platform) => set({ activeTheme: platform }),

      openPlatformCatalog: (platform) =>
        set((state) => ({
          catalogPlatform: platform,
          activeTheme: platform,
          view: 'platform',
          viewStack:
            state.view === 'platform'
              ? state.viewStack
              : [...state.viewStack.slice(-10), state.view],
        })),

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
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>
        let libraryBaseUrl =
          p.libraryBaseUrl ?? current.libraryBaseUrl
        // Migra sites antigos → animefire.one
        if (
          !libraryBaseUrl ||
          libraryBaseUrl.includes('assistiranimesonline.net') ||
          libraryBaseUrl.includes('animesonlinecc.to') ||
          libraryBaseUrl.includes('otakulogia.com')
        ) {
          libraryBaseUrl = 'https://animefire.one'
        }
        return {
          ...current,
          ...p,
          libraryBaseUrl,
          view:
            p.view === 'library' || current.view === 'library'
              ? 'anime'
              : (p.view ?? current.view),
        }
      },
    },
  ),
)
