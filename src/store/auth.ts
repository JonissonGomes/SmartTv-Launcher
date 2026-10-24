import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthUser } from '@/domain/auth'
import {
  fetchMe,
  logoutRemote,
  pollDeviceLogin,
  refreshAccessToken,
  startDeviceLogin,
} from '@/services/authApi'
import { idbStorage } from '@/store/idbStorage'

export type AuthPhase =
  | 'idle'
  | 'starting'
  | 'waiting'
  | 'authenticated'
  | 'error'

interface AuthState {
  phase: AuthPhase
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  /** Device flow em andamento */
  deviceCode: string | null
  userCode: string | null
  verificationUrl: string | null
  pollIntervalSec: number
  expiresAt: number | null
  error: string | null
  hydrated: boolean
  setHydrated: (value: boolean) => void
  clearError: () => void
  startLogin: () => Promise<void>
  pollOnce: () => Promise<'pending' | 'ready' | 'stop'>
  refreshSession: () => Promise<boolean>
  restoreSession: () => Promise<void>
  logout: () => Promise<void>
  cancelLogin: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceCode: null,
      userCode: null,
      verificationUrl: null,
      pollIntervalSec: 5,
      expiresAt: null,
      error: null,
      hydrated: false,

      setHydrated: (value) => set({ hydrated: value }),

      clearError: () => set({ error: null }),

      startLogin: async () => {
        set({
          phase: 'starting',
          error: null,
          deviceCode: null,
          userCode: null,
          verificationUrl: null,
        })
        try {
          const started = await startDeviceLogin()
          set({
            phase: 'waiting',
            deviceCode: started.device_code,
            userCode: started.user_code,
            verificationUrl:
              started.verification_url_complete || started.verification_url,
            pollIntervalSec: Math.max(2, started.interval || 5),
            expiresAt: Date.now() + started.expires_in * 1000,
          })
        } catch (err) {
          set({
            phase: 'error',
            error:
              err instanceof Error ? err.message : 'Falha ao iniciar login',
          })
        }
      },

      pollOnce: async () => {
        const { deviceCode, expiresAt } = get()
        if (!deviceCode) return 'stop'
        if (expiresAt && Date.now() > expiresAt) {
          set({
            phase: 'error',
            error: 'Código expirado. Inicie o login novamente.',
            deviceCode: null,
          })
          return 'stop'
        }

        try {
          const result = await pollDeviceLogin(deviceCode)
          if (result.status === 'ready') {
            set({
              phase: 'authenticated',
              user: result.user,
              accessToken: result.access_token,
              refreshToken: result.refresh_token,
              deviceCode: null,
              userCode: null,
              verificationUrl: null,
              expiresAt: null,
              error: null,
            })
            return 'ready'
          }
          if (result.status === 'expired' || result.status === 'denied') {
            set({
              phase: 'error',
              error:
                result.status === 'denied'
                  ? 'Login negado no Google.'
                  : 'Código expirado. Tente de novo.',
              deviceCode: null,
            })
            return 'stop'
          }
          if (result.status === 'slow_down') {
            set((s) => ({
              pollIntervalSec: Math.min(30, s.pollIntervalSec + 2),
            }))
          }
          return 'pending'
        } catch (err) {
          set({
            phase: 'error',
            error: err instanceof Error ? err.message : 'Falha no poll',
          })
          return 'stop'
        }
      },

      refreshSession: async () => {
        const refresh = get().refreshToken
        if (!refresh) return false
        try {
          const next = await refreshAccessToken(refresh)
          set({ accessToken: next.access_token, phase: 'authenticated' })
          const user = await fetchMe(next.access_token)
          set({ user })
          return true
        } catch {
          set({
            phase: 'idle',
            user: null,
            accessToken: null,
            refreshToken: null,
          })
          return false
        }
      },

      restoreSession: async () => {
        const { accessToken, refreshToken } = get()
        if (!accessToken && !refreshToken) {
          set({ phase: 'idle', hydrated: true })
          return
        }
        if (accessToken) {
          try {
            const user = await fetchMe(accessToken)
            set({ user, phase: 'authenticated', hydrated: true })
            return
          } catch {
            // tenta refresh
          }
        }
        const ok = await get().refreshSession()
        set({
          hydrated: true,
          phase: ok ? 'authenticated' : 'idle',
          ...(ok
            ? {}
            : { user: null, accessToken: null, refreshToken: null }),
        })
      },

      logout: async () => {
        const token = get().accessToken
        await logoutRemote(token)
        set({
          phase: 'idle',
          user: null,
          accessToken: null,
          refreshToken: null,
          deviceCode: null,
          userCode: null,
          verificationUrl: null,
          expiresAt: null,
          error: null,
        })
      },

      cancelLogin: () => {
        set({
          phase: get().user ? 'authenticated' : 'idle',
          deviceCode: null,
          userCode: null,
          verificationUrl: null,
          expiresAt: null,
          error: null,
        })
      },
    }),
    {
      name: 'launcher-auth',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)
