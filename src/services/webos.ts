import { getAppConfig } from '@/config/apps'
import type { Platform } from '@/domain/types'

export interface WebOsInstalledApp {
  id: string
  title?: string
}

interface LunaRequestOptions {
  method: string
  parameters?: Record<string, unknown>
}

interface LunaResponse {
  returnValue?: boolean
  apps?: WebOsInstalledApp[]
  errorText?: string
}

declare global {
  interface Window {
    webOS?: {
      service: {
        request: (
          uri: string,
          options: LunaRequestOptions & {
            onSuccess?: (res: LunaResponse) => void
            onFailure?: (err: LunaResponse) => void
          },
        ) => void
      }
    }
  }
}

const APP_MANAGER = 'luna://com.webos.applicationManager'

function isWebOsRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const webOS = window.webOS
  return typeof webOS?.service.request === 'function'
}

function lunaRequest(options: LunaRequestOptions): Promise<LunaResponse> {
  return new Promise((resolve, reject) => {
    if (!isWebOsRuntime() || !window.webOS) {
      reject(new Error('webOS service indisponível'))
      return
    }

    window.webOS.service.request(APP_MANAGER, {
      ...options,
      onSuccess: (res) => resolve(res),
      onFailure: (err) =>
        reject(new Error(err.errorText ?? 'Falha na chamada Luna')),
    })
  })
}

export async function listInstalledApps(): Promise<WebOsInstalledApp[]> {
  if (!isWebOsRuntime()) {
    console.info('[webOS mock] listInstalledApps()')
    return [
      { id: 'netflix', title: 'Netflix (mock)' },
      { id: 'com.hbo.hbomax', title: 'HBO Max (mock)' },
      { id: 'com.globo.globosatplay', title: 'Globoplay (mock)' },
      { id: 'youtube.leanback.v4', title: 'YouTube (mock)' },
      { id: 'br.jonis.launcher', title: 'Meu Launcher (mock)' },
    ]
  }

  const res = await lunaRequest({
    method: 'listApps',
    parameters: {},
  })

  return res.apps ?? []
}

export async function launchApp(
  platform: Platform,
  params?: Record<string, unknown>,
): Promise<void> {
  const config = getAppConfig(platform)
  const parameters: Record<string, unknown> = {
    id: config.webosAppId,
    ...(params ?? {}),
  }

  if (!isWebOsRuntime()) {
    console.info('[webOS mock] launchApp', platform, parameters)
    return
  }

  await lunaRequest({
    method: 'launch',
    parameters,
  })
}

export function launchPlatformTitle(
  platform: Platform,
  title: string,
  tmdbId?: number,
): Promise<void> {
  const config = getAppConfig(platform)
  const deep = config.deepLink?.({ title, tmdbId }) ?? undefined
  return launchApp(platform, deep)
}
