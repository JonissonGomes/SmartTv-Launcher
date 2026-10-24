/** Origem acessível pelo celular na LAN (não localhost). */

export function isLoopbackHost(hostname = window.location.hostname): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

function trimOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '')
}

/**
 * Resolve URL base para QR (controle / cast).
 * Ordem: VITE_DEV_LAN_ORIGIN → origin atual se não for loopback → GET /__lan.
 */
export async function resolvePublicOrigin(): Promise<string> {
  const env = (import.meta.env.VITE_DEV_LAN_ORIGIN as string | undefined)?.trim()
  if (env) return trimOrigin(env)

  if (!isLoopbackHost()) return window.location.origin

  try {
    const res = await fetch('/__lan', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as {
        preferred?: string | null
        origins?: string[]
      }
      const preferred = data.preferred ?? data.origins?.[0]
      if (preferred) return trimOrigin(preferred)
    }
  } catch {
    // relay/dev offline
  }

  return window.location.origin
}

export function buildAppQueryUrl(
  origin: string,
  query: Record<string, string>,
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
): string {
  const basePath = pathname.replace(/\/[^/]*$/, '/') || '/'
  const url = new URL(basePath, `${trimOrigin(origin)}/`)
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}
