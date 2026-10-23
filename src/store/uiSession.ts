import { create } from 'zustand'

interface UiSessionState {
  /** Player fullscreen aberto — esconde flyout etc. */
  playerOpen: boolean
  setPlayerOpen: (open: boolean) => void
}

export const useUiSessionStore = create<UiSessionState>((set) => ({
  playerOpen: false,
  setPlayerOpen: (open) => set({ playerOpen: open }),
}))
