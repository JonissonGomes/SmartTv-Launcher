import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AppView, Platform } from '@/domain/types'
import { PLATFORM_ORDER } from '@/config/apps'
import {
  defaultRecompUrls,
  type RecompGameId,
  type RecompUrlMap,
} from '@/config/recompGames'
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
  /** URLs dos builds web-recomp locais (sem ISO no launcher). */
  recompUrls: Record<RecompGameId, string>
  reducedMotion: boolean
  setView: (view: AppView) => void
  /** Volta à tela anterior; false se já estava no início. */
  goBackView: () => boolean
  setActiveTheme: (platform: Platform | null) => void
  openPlatformCatalog: (platform: Platform) => void
  togglePlatform: (platform: Platform) => void
  setLibraryBaseUrl: (url: string) => void
  setRecompUrl: (id: RecompGameId, url: string) => void
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
      recompUrls: defaultRecompUrls(),
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

      setRecompUrl: (id, url) =>
        set((state) => ({
          recompUrls: { ...state.recompUrls, [id]: url },
        })),

      setReducedMotion: (value) => set({ reducedMotion: value }),
    }),
    {
      name: 'launcher-settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => {
        const known = new Set<string>([...PLATFORM_ORDER, 'animefire'])
        return {
          ownedPlatforms: state.ownedPlatforms.filter((p) => known.has(p)),
          activeTheme:
            state.activeTheme && known.has(state.activeTheme)
              ? state.activeTheme
              : null,
          libraryBaseUrl: state.libraryBaseUrl,
          recompUrls: state.recompUrls,
          reducedMotion: state.reducedMotion,
        }
      },
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
        const known = new Set<string>([
          ...PLATFORM_ORDER,
          'animefire',
        ])
        const ownedPlatforms = (p.ownedPlatforms ?? current.ownedPlatforms).filter(
          (plat) => known.has(plat),
        )
        const activeTheme =
          p.activeTheme && known.has(p.activeTheme) ? p.activeTheme : null
        const defaults = defaultRecompUrls()
        const recompUrls: Record<RecompGameId, string> = {
          ...defaults,
          ...(p.recompUrls as RecompUrlMap | undefined),
        }
        return {
          ...current,
          ...p,
          libraryBaseUrl,
          recompUrls,
          ownedPlatforms:
            ownedPlatforms.length > 0 ? ownedPlatforms : [...PLATFORM_ORDER],
          activeTheme,
          view:
            p.view === 'library' || current.view === 'library'
              ? 'anime'
              : (p.view ?? current.view),
        }
      },
    },
  ),
)
