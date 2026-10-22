import { useEffect, type ReactNode } from 'react'
import { applyThemeToDocument, resolveTheme } from '@/config/themes'
import { useSettingsStore } from '@/store/settings'

interface ThemeRootProps {
  children: ReactNode
}

export function ThemeRoot({ children }: ThemeRootProps) {
  const activeTheme = useSettingsStore((s) => s.activeTheme)

  useEffect(() => {
    applyThemeToDocument(resolveTheme(activeTheme))
  }, [activeTheme])

  return (
    <div className="theme-root" data-theme={activeTheme ?? 'default'}>
      {children}
    </div>
  )
}
