import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { UserProfile } from '@/domain/types'
import { idbStorage } from '@/store/idbStorage'

export const PROFILE_COLORS = [
  '#e21221',
  '#5b9bff',
  '#c5ccd6',
  '#f26522',
  '#ff0000',
  '#22c55e',
  '#a855f7',
  '#eab308',
] as const

interface ProfilesState {
  profiles: UserProfile[]
  activeProfileId: string | null
  hydrated: boolean
  setHydrated: (value: boolean) => void
  createProfile: (name: string, color?: string) => UserProfile
  renameProfile: (id: string, name: string) => void
  removeProfile: (id: string) => void
  setActiveProfile: (id: string) => void
  getActiveProfile: () => UserProfile | undefined
}

function createId(): string {
  return crypto.randomUUID()
}

export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),

      createProfile: (name, color) => {
        const trimmed = name.trim().slice(0, 24)
        const used = new Set(get().profiles.map((p) => p.color))
        const fallback =
          PROFILE_COLORS[get().profiles.length % PROFILE_COLORS.length] ??
          PROFILE_COLORS[0]
        const nextColor =
          color ?? PROFILE_COLORS.find((c) => !used.has(c)) ?? fallback

        const profile: UserProfile = {
          id: createId(),
          name: trimmed || 'Perfil',
          color: nextColor,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          profiles: [...state.profiles, profile],
          activeProfileId: profile.id,
        }))
        return profile
      },

      renameProfile: (id, name) => {
        const trimmed = name.trim().slice(0, 24)
        if (!trimmed) return
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, name: trimmed } : p,
          ),
        }))
      },

      removeProfile: (id) => {
        set((state) => {
          const profiles = state.profiles.filter((p) => p.id !== id)
          const activeProfileId =
            state.activeProfileId === id
              ? (profiles[0]?.id ?? null)
              : state.activeProfileId
          return { profiles, activeProfileId }
        })
      },

      setActiveProfile: (id) => {
        if (!get().profiles.some((p) => p.id === id)) return
        set({ activeProfileId: id })
      },

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get()
        return profiles.find((p) => p.id === activeProfileId)
      },
    }),
    {
      name: 'launcher-profiles',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)
