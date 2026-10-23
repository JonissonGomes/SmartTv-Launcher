import { APP_CONFIGS, getAllKnownWebOsAppIds, getAppConfig } from '@/config/apps'
import type { Platform } from '@/domain/types'
import { buildDeepLinkAttempts } from '@/services/deepLink'
import {
  buildSafeLaunchParameters,
  isAllowedLunaMethod,
} from '@/services/launchSafety'

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

  const nested =
    (parameters.params as Record<string, unknown> | undefined) ?? undefined

  if (typeof window.webOSDev?.launch === 'function') {
    await new Promise<void>((resolve, reject) => {
      window.webOSDev.launch({
        id: String(parameters.id),
        params: nested ?? {},
        onSuccess: () => resolve(),
        onFailure: (err) =>
          reject(new Error(err.errorText ?? 'webOSDev.launch falhou')),
      })
    })
    return
  }

  await lunaRequest({
    method: 'launch',
    parameters,
  })
}

export async function launchApp(
  platform: Platform,
  params?: Record<string, unknown>,
): Promise<void> {
  const appId = await resolvePlatformAppId(platform)
  try {
    await lunaLaunch(appId, params)
  } catch (err) {
    if (params && Object.keys(params).length > 0) {
      console.warn('[webOS] deep link falhou, abrindo app limpo', err)
      await lunaLaunch(appId)
      return
    }
    throw err
  }
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
  const appId = await resolvePlatformAppId(platform)
  const attempts = buildDeepLinkAttempts(platform, {
    title,
    tmdbId,
    netflixId: extras?.netflixId,
    youtubeVideoId: extras?.youtubeVideoId,
    providerUrl: extras?.providerUrl,
  })

  let lastError: unknown
  for (const attempt of attempts) {
    try {
      await lunaLaunch(appId, attempt)
      return
    } catch (err) {
      lastError = err
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Falha ao abrir ${getAppConfig(platform).label}`)
}

export function getAllowedWebOsAppIds(): readonly string[] {
  return allowedAppIds()
}
