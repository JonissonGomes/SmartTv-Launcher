import { create } from 'zustand'

interface UiSessionState {
  /** Player fullscreen aberto — esconde flyout etc. */
  playerOpen: boolean
  setPlayerOpen: (open: boolean) => void
  /** Partida de Jogos em andamento — esconde flyout e isola D-pad. */
  gamePlayOpen: boolean
  setGamePlayOpen: (open: boolean) => void
  /** Abre Animes já com busca (vindo do “Assistir no AnimeFire”). */
  animeDeepLinkTitle: string | null
  setAnimeDeepLinkTitle: (title: string | null) => void
}

export const useUiSessionStore = create<UiSessionState>((set) => ({
  playerOpen: false,
  setPlayerOpen: (open) => set({ playerOpen: open }),
  gamePlayOpen: false,
  setGamePlayOpen: (open) => set({ gamePlayOpen: open }),
  animeDeepLinkTitle: null,
  setAnimeDeepLinkTitle: (title) => set({ animeDeepLinkTitle: title }),
}))
