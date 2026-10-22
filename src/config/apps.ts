import { PLATFORM_THEMES } from '@/config/themes'
import type { AppConfig, Platform } from '@/domain/types'

/**
 * IDs e deep links isolados para validação no aparelho / Simulator.
 * Use Configurações → Apps instalados para preencher os webosAppId reais.
 */
export const APP_CONFIGS: Record<Platform, AppConfig> = {
  netflix: {
    platform: 'netflix',
    label: 'Netflix',
    // TODO: validar com listApps na TV
    webosAppId: 'netflix',
    color: PLATFORM_THEMES.netflix.accent,
    deepLink: ({ title }) => ({ contentTarget: title }),
  },
  disney: {
    platform: 'disney',
    label: 'Disney+',
    // TODO: validar com listApps na TV
    webosAppId: 'com.disney.disneyplus-prod',
    color: PLATFORM_THEMES.disney.accent,
  },
  hbomax: {
    platform: 'hbomax',
    label: 'HBO Max',
    // TODO: validar com listApps na TV
    webosAppId: 'com.hbo.hbomax',
    color: PLATFORM_THEMES.hbomax.accent,
  },
  globoplay: {
    platform: 'globoplay',
    label: 'Globoplay',
    // TODO: validar com listApps na TV
    webosAppId: 'com.globo.globosatplay',
    color: PLATFORM_THEMES.globoplay.accent,
  },
  youtube: {
    platform: 'youtube',
    label: 'YouTube',
    // TODO: validar com listApps na TV
    webosAppId: 'youtube.leanback.v4',
    color: PLATFORM_THEMES.youtube.accent,
    deepLink: ({ title }) => ({
      contentTarget: `v=${encodeURIComponent(title)}`,
    }),
  },
}

export const PLATFORM_ORDER: Platform[] = [
  'netflix',
  'disney',
  'hbomax',
  'globoplay',
  'youtube',
]

export function getAppConfig(platform: Platform): AppConfig {
  return APP_CONFIGS[platform]
}
