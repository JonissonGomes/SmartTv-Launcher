import { PLATFORM_THEMES } from '@/config/themes'
import type { AppConfig, Platform } from '@/domain/types'

/**
 * IDs webOS por plataforma. Candidatos cobrem variações de região/versão.
 * Deep links de título ficam em `services/deepLink.ts` (tentativas + fallback).
 */
export const APP_CONFIGS: Record<Platform, AppConfig> = {
  netflix: {
    platform: 'netflix',
    label: 'Netflix',
    webosAppId: 'netflix',
    webosAppIdCandidates: ['netflix'],
    color: PLATFORM_THEMES.netflix.accent,
  },
  disney: {
    platform: 'disney',
    label: 'Disney+',
    webosAppId: 'com.disney.disneyplus-prod',
    webosAppIdCandidates: [
      'com.disney.disneyplus-prod',
      'com.disney.disneyplus',
      'disney',
    ],
    color: PLATFORM_THEMES.disney.accent,
  },
  hbomax: {
    platform: 'hbomax',
    label: 'Max',
    webosAppId: 'com.wbd.stream',
    webosAppIdCandidates: [
      'com.wbd.stream',
      'com.hbo.hbomax',
      'hbomax',
      'max',
    ],
    color: PLATFORM_THEMES.hbomax.accent,
  },
  globoplay: {
    platform: 'globoplay',
    label: 'Globoplay',
    // IDs variam por versão/região — resolvePlatformAppId testa na ordem.
    webosAppId: 'com.globo.globosatplay',
    webosAppIdCandidates: [
      'com.globo.globosatplay',
      'com.globo.globoplay',
      'br.com.globo.globoplay',
      'com.globoplay.app',
      'globoplay',
      'com.globo.globosatplay.tv',
    ],
    color: PLATFORM_THEMES.globoplay.accent,
  },
  youtube: {
    platform: 'youtube',
    label: 'YouTube',
    webosAppId: 'youtube.leanback.v4',
    webosAppIdCandidates: [
      'youtube.leanback.v4',
      'youtube.leanback.v3',
      'youtube',
    ],
    color: PLATFORM_THEMES.youtube.accent,
  },
  animefire: {
    platform: 'animefire',
    label: 'AnimeFire',
    // Destino in-app — não lança app webOS.
    webosAppId: 'br.jonis.launcher',
    webosAppIdCandidates: ['br.jonis.launcher'],
    color: PLATFORM_THEMES.animefire.accent,
  },
}

/** Streamings externos (flyout / settings) — sem AnimeFire. */
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

/** Todos os IDs conhecidos (allowlist de launch). */
export function getAllKnownWebOsAppIds(): string[] {
  const ids = new Set<string>()
  for (const config of Object.values(APP_CONFIGS)) {
    ids.add(config.webosAppId)
    for (const candidate of config.webosAppIdCandidates ?? []) {
      ids.add(candidate)
    }
  }
  return [...ids]
}
