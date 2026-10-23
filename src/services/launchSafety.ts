/**
 * Limites e sanitização para proteger a TV de parâmetros ruins
 * em Luna launch / deep links / histórico.
 */

export const MAX_LAUNCH_STRING_LEN = 180
export const MAX_HISTORY_ENTRIES = 150
export const MAX_DEEP_LINK_KEYS = 8

const ROOM_ID_RE = /^[A-Z0-9]{3,12}$/
const SAFE_APP_ID_RE = /^[a-z0-9][a-z0-9._-]{1,127}$/i

/** Métodos Luna permitidos pelo launcher. */
export const ALLOWED_LUNA_METHODS = ['launch', 'listApps'] as const

export type AllowedLunaMethod = (typeof ALLOWED_LUNA_METHODS)[number]

export function isAllowedLunaMethod(method: string): method is AllowedLunaMethod {
  return (ALLOWED_LUNA_METHODS as readonly string[]).includes(method)
}

export function isSafeWebOsAppId(appId: string): boolean {
  return SAFE_APP_ID_RE.test(appId)
}

export function assertAllowedWebOsAppId(
  appId: string,
  allowedIds: readonly string[],
): void {
  if (!isSafeWebOsAppId(appId)) {
    throw new Error('webOS app id inválido')
  }
  if (!allowedIds.includes(appId)) {
    throw new Error('webOS app id fora da allowlist')
  }
}

function sanitizePrimitive(value: unknown): string | number | boolean | null {
  if (value === null) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return value
  }
  if (typeof value === 'string') {
    // Remove controles / null bytes; limita tamanho (protege Luna/TV).
    const cleaned = value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
    return cleaned.slice(0, MAX_LAUNCH_STRING_LEN)
  }
  return null
}

/**
 * Monta parâmetros seguros para `applicationManager/launch`.
 * Só strings/números/booleanos; trunca textos; exige app id allowlisted.
 */
export function buildSafeLaunchParameters(
  appId: string,
  allowedIds: readonly string[],
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  assertAllowedWebOsAppId(appId, allowedIds)

  const parameters: Record<string, unknown> = { id: appId }
  if (!extra) return parameters

  const keys = Object.keys(extra).slice(0, MAX_DEEP_LINK_KEYS)
  for (const key of keys) {
    if (key === 'id') continue
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) continue
    const sanitized = sanitizePrimitive(extra[key])
    if (sanitized === null && extra[key] !== null) continue
    if (sanitized === null) continue
    parameters[key] = sanitized
  }

  return parameters
}

export function isSafeGameRoomId(roomId: string): boolean {
  return ROOM_ID_RE.test(roomId.trim().toUpperCase())
}

export function clampHistoryEntries<T>(entries: T[]): T[] {
  return entries.length <= MAX_HISTORY_ENTRIES
    ? entries
    : entries.slice(0, MAX_HISTORY_ENTRIES)
}
