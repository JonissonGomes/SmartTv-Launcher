/**
 * Cache JSON em memória (sessão do app).
 * Persiste enquanto o launcher estiver aberto; some ao descarregar a página.
 */

interface Entry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, Entry<unknown>>()

const DEFAULT_TTL_MS = 12 * 60 * 1000

export function sessionGet<T>(key: string): T | undefined {
  const hit = store.get(key) as Entry<T> | undefined
  if (!hit) return undefined
  if (hit.expiresAt < Date.now()) {
    store.delete(key)
    return undefined
  }
  return hit.data
}

export function sessionSet<T>(
  key: string,
  data: T,
  ttlMs = DEFAULT_TTL_MS,
): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function sessionClear(prefix?: string): void {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
