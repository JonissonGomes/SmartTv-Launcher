/**
 * Cache de imagens em memória + Cache Storage (sessão).
 * Limpa ao fechar o app / pagehide (TV desligada ou app encerrado).
 */

const CACHE_NAME = 'launcher-images-v1'
const mem = new Map<string, string>()

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

async function cacheApi(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  try {
    return await caches.open(CACHE_NAME)
  } catch {
    return null
  }
}

/** Resolve URL (possivelmente blob:) pronta para <img src>. */
export async function cachedImageSrc(url: string): Promise<string> {
  if (!url || !isHttpUrl(url)) return url

  const hit = mem.get(url)
  if (hit) return hit

  const cache = await cacheApi()
  if (cache) {
    try {
      const match = await cache.match(url)
      if (match) {
        const blob = await match.blob()
        const objectUrl = URL.createObjectURL(blob)
        mem.set(url, objectUrl)
        return objectUrl
      }
    } catch {
      // segue para rede
    }
  }

  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) return url
    const blob = await res.blob()
    if (cache) {
      try {
        await cache.put(url, new Response(blob.slice()))
      } catch {
        // ignore quota
      }
    }
    const objectUrl = URL.createObjectURL(blob)
    mem.set(url, objectUrl)
    return objectUrl
  } catch {
    // CORS / offline — usa URL original (browser HTTP cache)
    return url
  }
}

export async function clearImageCache(): Promise<void> {
  for (const objectUrl of mem.values()) {
    try {
      URL.revokeObjectURL(objectUrl)
    } catch {
      // ignore
    }
  }
  mem.clear()
  if (typeof caches === 'undefined') return
  try {
    await caches.delete(CACHE_NAME)
  } catch {
    // ignore
  }
}

/** Limpa cache de imagens ao sair / TV desligar / app fechar. */
export function installImageCacheLifecycle(): () => void {
  const wipe = () => {
    void clearImageCache()
  }
  window.addEventListener('pagehide', wipe)
  window.addEventListener('beforeunload', wipe)
  document.addEventListener('visibilitychange', () => {
    // webOS às vezes só marca hidden ao suspender o app
    if (document.visibilityState === 'hidden') wipe()
  })
  return () => {
    window.removeEventListener('pagehide', wipe)
    window.removeEventListener('beforeunload', wipe)
  }
}
