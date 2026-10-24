import type {
  AuthUser,
  DevicePollResponse,
  DeviceStartResponse,
} from '@/domain/auth'

/**
 * Base da API de auth.
 * - Dev: vazio → `/api/auth` (proxy Vite → auth-server)
 * - TV/prod: `VITE_AUTH_API_URL` absoluto (Render), sem sufixo /auth
 */
export function getAuthApiBase(): string {
  const configured = (import.meta.env.VITE_AUTH_API_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, '')
  if (configured) return configured
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/auth`
  }
  return '/api/auth'
}

/** Paths relativos à base (dev: /api/auth/… ; prod Render: https://host/auth/…). */
function authUrl(path: string): string {
  const base = getAuthApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  if (base.endsWith('/api/auth')) {
    return `${base}${p}`
  }
  // Host Render: rotas vivem em /auth/*
  return `${base}/auth${p}`
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { message?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${String(res.status)}`)
  }
  return data
}

export async function startDeviceLogin(): Promise<DeviceStartResponse> {
  const res = await fetch(authUrl('/device/start'), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: '{}',
  })
  return parseJson<DeviceStartResponse>(res)
}

export async function pollDeviceLogin(
  deviceCode: string,
): Promise<DevicePollResponse> {
  const res = await fetch(authUrl('/device/poll'), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_code: deviceCode }),
  })
  return parseJson<DevicePollResponse>(res)
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(authUrl('/refresh'), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  return parseJson(res)
}

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch(authUrl('/me'), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return parseJson<AuthUser>(res)
}

export async function logoutRemote(accessToken: string | null): Promise<void> {
  try {
    await fetch(authUrl('/logout'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: '{}',
    })
  } catch {
    // offline — logout local basta
  }
}
