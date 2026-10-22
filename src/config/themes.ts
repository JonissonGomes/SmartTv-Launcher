import type { Platform } from '@/domain/types'

export interface PlatformTheme {
  accent: string
  accentSoft: string
  tint: string
  glow: string
  focus: string
  label: string
}

/** Cores de transparência/acento por app aberto. */
export const PLATFORM_THEMES: Record<Platform, PlatformTheme> = {
  netflix: {
    label: 'Netflix',
    accent: '#E50914',
    accentSoft: 'rgba(229, 9, 20, 0.22)',
    tint: 'rgba(229, 9, 20, 0.18)',
    glow: 'rgba(229, 9, 20, 0.35)',
    focus: '#FF3B45',
  },
  disney: {
    label: 'Disney+',
    accent: '#1A6DFF',
    accentSoft: 'rgba(26, 109, 255, 0.22)',
    tint: 'rgba(17, 60, 207, 0.22)',
    glow: 'rgba(26, 109, 255, 0.4)',
    focus: '#5B9BFF',
  },
  hbomax: {
    label: 'HBO Max',
    accent: '#8B939E',
    accentSoft: 'rgba(139, 147, 158, 0.22)',
    tint: 'rgba(55, 65, 75, 0.35)',
    glow: 'rgba(139, 147, 158, 0.35)',
    focus: '#C5CCD6',
  },
  globoplay: {
    label: 'Globoplay',
    accent: '#F26522',
    accentSoft: 'rgba(242, 101, 34, 0.22)',
    tint: 'rgba(242, 101, 34, 0.2)',
    glow: 'rgba(242, 101, 34, 0.4)',
    focus: '#FF8A4C',
  },
  youtube: {
    label: 'YouTube',
    accent: '#FF0000',
    accentSoft: 'rgba(255, 0, 0, 0.2)',
    tint: 'rgba(180, 0, 0, 0.18)',
    glow: 'rgba(255, 0, 0, 0.35)',
    focus: '#FF4D4D',
  },
}

export const DEFAULT_THEME: PlatformTheme = {
  label: 'Launcher',
  accent: '#E21221',
  accentSoft: 'rgba(226, 18, 33, 0.2)',
  tint: 'rgba(226, 18, 33, 0.12)',
  glow: 'rgba(226, 18, 33, 0.28)',
  focus: '#FF4D57',
}

export function resolveTheme(platform?: Platform | null): PlatformTheme {
  if (!platform) return DEFAULT_THEME
  return PLATFORM_THEMES[platform]
}

export function applyThemeToDocument(theme: PlatformTheme): void {
  const root = document.documentElement
  root.style.setProperty('--color-accent', theme.accent)
  root.style.setProperty('--color-accent-soft', theme.accentSoft)
  root.style.setProperty('--color-tint', theme.tint)
  root.style.setProperty('--color-glow', theme.glow)
  root.style.setProperty('--color-focus', theme.focus)
}
