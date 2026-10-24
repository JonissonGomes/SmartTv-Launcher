/** Origem HTTP pública para QR + WebSocket (cloud / LAN). */

export function isLoopbackHost(hostname = window.location.hostname): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

export function trimOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '')
}

/** HTTP(S) com host — rejeita file://, about:, hostname vazio. */
export function isUsablePublicOrigin(origin: string): boolean {
  try {
    const u = new URL(origin)
    return (
      (u.protocol === 'http:' || u.protocol === 'https:') && Boolean(u.hostname)
    )
  } catch {
    return false
  }
}

/** Normaliza origem do relay / SPA pública. */
export function normalizeRelayOrigin(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(
      trimmed.includes('://') ? trimmed : `http://${trimmed}`,
    )
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname) return null
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

/**
 * Servidor cloud (Render) — mesmo host de auth + relay + SPA do celular.
 * Vem de `VITE_AUTH_API_URL` no build da TV.
 */
export function getCloudRelayOrigin(): string | null {
  return normalizeRelayOrigin(
    (import.meta.env.VITE_AUTH_API_URL as string | undefined) ?? '',
  )
}

/**
 * Resolve URL base para QR + WebSocket.
 * Ordem: override settings → cloud (VITE_AUTH_API_URL) → VITE_DEV_LAN_ORIGIN
 * → origin HTTP atual → GET /__lan.
 */
export async function resolvePublicOrigin(opts?: {
  preferred?: string
}): Promise<string> {
  const preferred = normalizeRelayOrigin(opts?.preferred ?? '')
  if (preferred) return preferred

  const cloud = getCloudRelayOrigin()
  if (cloud) return cloud

  const envLan = normalizeRelayOrigin(
    (import.meta.env.VITE_DEV_LAN_ORIGIN as string | undefined) ?? '',
  )
  if (envLan) return envLan

  const current = window.location.origin
  if (isUsablePublicOrigin(current) && !isLoopbackHost()) {
    return trimOrigin(current)
  }

  try {
    const res = await fetch('/__lan', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as {
        preferred?: string | null
        origins?: string[]
      }
      const fromLan = normalizeRelayOrigin(
        data.preferred ?? data.origins?.[0] ?? '',
      )
      if (fromLan) return fromLan
    }
  } catch {
    // IPK / file://
  }

  if (isUsablePublicOrigin(current)) return trimOrigin(current)

  // Último recurso: cloud mesmo se preferred falhou
  return cloud ?? current
}

/** WebSocket no mesmo host do relay HTTP. */
export function wsUrlFromOrigin(origin: string, path: string): string | null {
  const base = normalizeRelayOrigin(origin)
  if (!base) return null
  try {
    const u = new URL(base)
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
    const p = path.startsWith('/') ? path : `/${path}`
    return `${proto}//${u.host}${p}`
  } catch {
    return null
  }
}

/**
 * Monta URL do app com query (QR). Sempre usa `/` no host HTTP —
 * no IPK o pathname file:// quebraria o link do celular.
 */
export function buildAppQueryUrl(
  origin: string,
  query: Record<string, string>,
  pathname = '/',
): string {
  const base = normalizeRelayOrigin(origin) ?? trimOrigin(origin)
  let basePath = pathname
  try {
    const o = new URL(base.includes('://') ? base : `http://${base}`)
    if (o.protocol === 'http:' || o.protocol === 'https:') {
      basePath = '/'
    } else {
      basePath = pathname.replace(/\/[^/]*$/, '/') || '/'
    }
  } catch {
    basePath = '/'
  }
  const url = new URL(basePath, `${trimOrigin(base)}/`)
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}
