/**
 * Valida URLs da biblioteca web (site próprio do usuário).
 */

const MAX_URL_LEN = 2048

export function normalizeHttpsUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > MAX_URL_LEN) return null
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname || url.hostname === 'localhost') {
      // localhost ok só em dev
      if (url.hostname === 'localhost' && import.meta.env.DEV) return url.toString()
    }
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** Só permite navegar no host configurado (e subdomínios). */
export function isUrlAllowedForLibrary(
  candidate: string,
  libraryBaseUrl: string,
): boolean {
  const baseHost = hostOf(libraryBaseUrl)
  const candHost = hostOf(candidate)
  if (!baseHost || !candHost) return false
  return candHost === baseHost || candHost.endsWith(`.${baseHost}`)
}

export function isDirectMediaUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase()
    return /\.(mp4|webm|ogg|m3u8)(\?|$)/.test(path)
  } catch {
    return false
  }
}
