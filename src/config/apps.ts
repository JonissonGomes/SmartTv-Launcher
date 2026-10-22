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
    color: '#E50914',
    deepLink: ({ title }) => ({ contentTarget: title }),
  },
  hbomax: {
    platform: 'hbomax',
    label: 'HBO Max',
    // TODO: validar com listApps na TV (ex.: com.hbo.hbomax)
    webosAppId: 'com.hbo.hbomax',
    color: '#9B59FF',
  },
  globoplay: {
    platform: 'globoplay',
    label: 'Globoplay',
    // TODO: validar com listApps na TV
    webosAppId: 'com.globo.globosatplay',
    color: '#F26522',
  },
  youtube: {
    platform: 'youtube',
    label: 'YouTube',
    // TODO: validar com listApps na TV
    webosAppId: 'youtube.leanback.v4',
    color: '#FF0000',
    deepLink: ({ title }) => ({
      contentTarget: `v=${encodeURIComponent(title)}`,
    }),
  },
}

export const PLATFORM_ORDER: Platform[] = [
  'netflix',
  'hbomax',
  'globoplay',
  'youtube',
]

export function getAppConfig(platform: Platform): AppConfig {
  return APP_CONFIGS[platform]
}
