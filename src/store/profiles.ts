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
  createProfile: (
    name: string,
    options?: { color?: string; preferredGenreIds?: number[] },
  ) => UserProfile
  updateProfile: (
    id: string,
    patch: Partial<Pick<UserProfile, 'name' | 'color' | 'preferredGenreIds'>>,
  ) => void
  removeProfile: (id: string) => void
  setActiveProfile: (id: string) => void
  getActiveProfile: () => UserProfile | undefined
}

function createId(): string {
  return crypto.randomUUID()
}

function normalizeProfile(raw: UserProfile): UserProfile {
  return {
    ...raw,
    preferredGenreIds: raw.preferredGenreIds ?? [],
  }
}

export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),

      createProfile: (name, options = {}) => {
        const trimmed = name.trim().slice(0, 24)
        const used = new Set(get().profiles.map((p) => p.color))
        const fallback =
          PROFILE_COLORS[get().profiles.length % PROFILE_COLORS.length] ??
          PROFILE_COLORS[0]
        const nextColor =
          options.color ??
          PROFILE_COLORS.find((c) => !used.has(c)) ??
          fallback

        const profile: UserProfile = {
          id: createId(),
          name: trimmed || 'Perfil',
          color: nextColor,
          preferredGenreIds: (options.preferredGenreIds ?? []).slice(0, 6),
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          profiles: [...state.profiles, profile],
          activeProfileId: profile.id,
        }))
        return profile
      },

      updateProfile: (id, patch) => {
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== id) return p
            return {
              ...p,
              ...patch,
              name: patch.name !== undefined ? patch.name.trim().slice(0, 24) || p.name : p.name,
              preferredGenreIds:
                patch.preferredGenreIds !== undefined
                  ? patch.preferredGenreIds.slice(0, 6)
                  : p.preferredGenreIds,
            }
          }),
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
        const found = profiles.find((p) => p.id === activeProfileId)
        return found ? normalizeProfile(found) : undefined
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
        if (state) {
          state.profiles = state.profiles.map(normalizeProfile)
          state.setHydrated(true)
        }
      },
    },
  ),
)
