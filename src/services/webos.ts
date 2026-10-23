import { APP_CONFIGS, getAllKnownWebOsAppIds, getAppConfig } from '@/config/apps'
import type { Platform } from '@/domain/types'
import { pickBestDeepLink } from '@/services/deepLink'
import {
  buildSafeLaunchParameters,
  isAllowedLunaMethod,
  isSafeWebOsAppId,
} from '@/services/launchSafety'
import { normalizeHttpsUrl } from '@/services/urlSafety'

const BROWSER_APP_IDS = [
  'com.webos.app.browser',
  'com.webos.app.bridgebrowser',
] as const

export interface WebOsInstalledApp {
  id: string
  title?: string
}

interface LunaResponse {
  returnValue?: boolean
  exist?: boolean
  apps?: WebOsInstalledApp[]
  errorText?: string
  errorCode?: number | string
}

const APP_MANAGER = 'luna://com.webos.applicationManager'

const resolvedAppIds = new Map<Platform, string>()

function allowedAppIds(): readonly string[] {
  return getAllKnownWebOsAppIds()
}

export function isWebOsRuntime(): boolean {
  if (typeof window === 'undefined') return false
  return typeof window.webOS?.service?.request === 'function'
}

function lunaRequest(options: {
  method: string
  parameters?: Record<string, unknown>
}): Promise<LunaResponse> {
  return new Promise((resolve, reject) => {
    if (!isAllowedLunaMethod(options.method)) {
      reject(new Error(`Método Luna não permitido: ${options.method}`))
      return
    }

    if (!isWebOsRuntime()) {
      reject(new Error('webOS service indisponível'))
      return
    }

    window.webOS.service.request(APP_MANAGER, {
      method: options.method,
      parameters: options.parameters,
      onSuccess: (res) => resolve(res as LunaResponse),
      onFailure: (err) => {
        const failure = err as LunaResponse
        reject(
          new Error(
            failure.errorText ??
              `Falha Luna ${String(failure.errorCode ?? '')}`.trim(),
          ),
        )
      },
    })
  })
}

async function isAppInstalled(appId: string): Promise<boolean> {
  try {
    const res = await lunaRequest({
      method: 'getAppLoadStatus',
      parameters: { appId },
    })
    return Boolean(res.exist ?? res.returnValue)
  } catch {
    return false
  }
}

/** Descobre o ID real instalado entre os candidatos da plataforma. */
export async function resolvePlatformAppId(
  platform: Platform,
): Promise<string> {
  const cached = resolvedAppIds.get(platform)
  if (cached) return cached

  const config = getAppConfig(platform)
  const candidates = [
    ...(config.webosAppIdCandidates ?? []),
    config.webosAppId,
  ]
  const unique = [...new Set(candidates)]

  if (!isWebOsRuntime()) {
    resolvedAppIds.set(platform, config.webosAppId)
    return config.webosAppId
  }

  for (const id of unique) {
    if (await isAppInstalled(id)) {
      resolvedAppIds.set(platform, id)
      return id
    }
  }

  resolvedAppIds.set(platform, config.webosAppId)
  return config.webosAppId
}

export async function listInstalledApps(): Promise<WebOsInstalledApp[]> {
  if (!isWebOsRuntime()) {
    console.info('[webOS mock] listInstalledApps()')
    return Object.values(APP_CONFIGS).map((c) => ({
      id: c.webosAppId,
      title: `${c.label} (mock)`,
    }))
  }

  try {
    const res = await lunaRequest({
      method: 'listApps',
      parameters: {},
    })
    if (res.apps?.length) return res.apps
  } catch {
    // listApps não é público em todas as versões
  }

  const found: WebOsInstalledApp[] = []
  for (const platform of Object.keys(APP_CONFIGS) as Platform[]) {
    const id = await resolvePlatformAppId(platform)
    const installed = await isAppInstalled(id)
    found.push({
      id,
      title: installed
        ? `${APP_CONFIGS[platform].label} (ok)`
        : `${APP_CONFIGS[platform].label} (não encontrado)`,
    })
  }
  return found
}

async function lunaLaunch(
  appId: string,
  params?: Record<string, unknown>,
): Promise<void> {
  const parameters = buildSafeLaunchParameters(
    appId,
    allowedAppIds(),
    params,
  )

  if (!isWebOsRuntime()) {
    console.info('[webOS mock] launchApp', parameters)
    return
  }

  const nested = {
    ...((parameters.params as Record<string, unknown> | undefined) ?? {}),
  }
  // contentId no topo (LG) também vai dentro de params p/ webOSDev.
  if (typeof parameters.contentId === 'string') {
    nested.contentId = parameters.contentId
  }

  // Preferir applicationManager/launch: aceita contentId no payload raiz
  // (melhor p/ Netflix). webOSDev.launch como fallback.
  try {
    await lunaRequest({
      method: 'launch',
      parameters,
    })
    return
  } catch (primaryError) {
    if (typeof window.webOSDev?.launch !== 'function') throw primaryError

    await new Promise<void>((resolve, reject) => {
      window.webOSDev.launch({
        id: String(parameters.id),
        params: nested,
        onSuccess: () => resolve(),
        onFailure: (err) =>
          reject(
            new Error(
              err.errorText ??
                (primaryError instanceof Error
                  ? primaryError.message
                  : 'webOSDev.launch falhou'),
            ),
          ),
      })
    })
  }
}

async function launchWithCandidateFallback(
  platform: Platform,
  params?: Record<string, unknown>,
): Promise<void> {
  const config = getAppConfig(platform)
  const preferred = await resolvePlatformAppId(platform)
  const candidates = [
    preferred,
    ...(config.webosAppIdCandidates ?? []),
    config.webosAppId,
  ]
  const unique = [...new Set(candidates)]

  let lastError: unknown
  for (const appId of unique) {
    try {
      await lunaLaunch(appId, params)
      resolvedAppIds.set(platform, appId)
      return
    } catch (err) {
      lastError = err
    }
  }

  // Última chance: app limpo sem deep link.
  if (params && Object.keys(params).length > 0) {
    for (const appId of unique) {
      try {
        await lunaLaunch(appId)
        resolvedAppIds.set(platform, appId)
        return
      } catch (err) {
        lastError = err
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Falha ao abrir ${config.label}`)
}

export async function launchApp(
  platform: Platform,
  params?: Record<string, unknown>,
): Promise<void> {
  await launchWithCandidateFallback(platform, params)
}

export async function launchPlatformTitle(
  platform: Platform,
  title: string,
  tmdbId?: number,
  extras?: {
    netflixId?: string
    youtubeVideoId?: string
    providerUrl?: string
  },
): Promise<void> {
  const deep = pickBestDeepLink(platform, {
    title,
    tmdbId,
    netflixId: extras?.netflixId,
    youtubeVideoId: extras?.youtubeVideoId,
    providerUrl: extras?.providerUrl,
  })

  await launchWithCandidateFallback(platform, deep)
}

export function getAllowedWebOsAppIds(): readonly string[] {
  return allowedAppIds()
}

/** Abre URL no navegador nativo da TV (site próprio / fallback de iframe). */
export async function launchBrowser(url: string): Promise<void> {
  const safe = normalizeHttpsUrl(url)
  if (!safe) throw new Error('URL inválida')

  if (!isWebOsRuntime()) {
    console.info('[webOS mock] launchBrowser', safe)
    window.open(safe, '_blank', 'noopener,noreferrer')
    return
  }

  let lastError: unknown
  for (const appId of BROWSER_APP_IDS) {
    if (!isSafeWebOsAppId(appId)) continue
    try {
      await lunaRequest({
        method: 'launch',
        parameters: {
          id: appId,
          params: {
            target: safe,
            url: safe,
          },
        },
      })
      return
    } catch (err) {
      lastError = err
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Não foi possível abrir o navegador da TV')
}
