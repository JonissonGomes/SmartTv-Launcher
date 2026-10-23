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
export const ALLOWED_LUNA_METHODS = [
  'launch',
  'listApps',
  'getAppLoadStatus',
] as const

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
    const cleaned = value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
    return cleaned.slice(0, MAX_LAUNCH_STRING_LEN)
  }
  return null
}

function sanitizeParamsObject(
  extra?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!extra) return undefined

  const params: Record<string, unknown> = {}
  const keys = Object.keys(extra).slice(0, MAX_DEEP_LINK_KEYS)
  for (const key of keys) {
    if (key === 'id' || key === 'params') continue
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) continue
    const sanitized = sanitizePrimitive(extra[key])
    if (sanitized === null) continue
    params[key] = sanitized
  }

  return Object.keys(params).length > 0 ? params : undefined
}

/**
 * Monta parâmetros seguros para `applicationManager/launch`.
 * Formato LG: `{ id, contentId?, params?: { ... } }`.
 * `contentId` no topo é usado por Netflix/alguns apps; o resto vai em `params`.
 */
export function buildSafeLaunchParameters(
  appId: string,
  allowedIds: readonly string[],
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  assertAllowedWebOsAppId(appId, allowedIds)

  const parameters: Record<string, unknown> = { id: appId }
  if (!extra) return parameters

  const contentId = sanitizePrimitive(extra.contentId)
  if (typeof contentId === 'string' && contentId.length > 0) {
    parameters.contentId = contentId
  }

  const { contentId: _drop, ...rest } = extra
  const nested = sanitizeParamsObject(rest)
  if (nested) parameters.params = nested
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
