import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { APP_CONFIGS, PLATFORM_ORDER } from '@/config/apps'
import type { AppView, Platform } from '@/domain/types'
import { useProfilesStore } from '@/store/profiles'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { PlatformIcon } from '@/ui/icons/Icons'
import styles from './TopBar.module.css'

const TABS: Array<{ id: string; label: string; view: AppView }> = [
  { id: 'home', label: 'Início', view: 'home' },
  { id: 'categories', label: 'Catálogo', view: 'categories' },
  { id: 'anime', label: 'Animes', view: 'anime' },
  { id: 'history', label: 'Recentes', view: 'history' },
  { id: 'surprise', label: 'Surpresa', view: 'surprise' },
  { id: 'games', label: 'Jogos', view: 'games' },
]

interface TopBarProps {
  onOpenProfiles?: () => void
}

export function TopBar({ onOpenProfiles }: TopBarProps) {
  const view = useSettingsStore((s) => s.view)
  const setView = useSettingsStore((s) => s.setView)
  const openPlatformCatalog = useSettingsStore((s) => s.openPlatformCatalog)
  const catalogPlatform = useSettingsStore((s) => s.catalogPlatform)
  const profiles = useProfilesStore((s) => s.profiles)
  const activeProfileId = useProfilesStore((s) => s.activeProfileId)
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0]

  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date())
    }, 30_000)
    return () => {
      window.clearInterval(id)
    }
  }, [])

  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const activeView = view === 'library' ? 'anime' : view

  const go = (next: AppView) => {
    setView(next)
    const focus =
      next === 'home'
        ? 'VIEW_home'
        : next === 'anime' || next === 'library'
          ? 'VIEW_anime'
          : `VIEW_${next}`
    void setFocus(focus)
  }

  const openPlatform = (platform: Platform) => {
    openPlatformCatalog(platform)
    void setFocus('VIEW_platform')
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.rowPrimary}>
        <span className={styles.brand}>Meu Launcher</span>

        <nav className={styles.tabs}>
          {TABS.map((tab) => (
            <Focusable
              key={tab.id}
              focusKey={`TOP_TAB_${tab.id}`}
              variant="plain"
              className={cx(
                styles.tab,
                activeView === tab.view && styles.tabActive,
              )}
              onEnterPress={() => {
                go(tab.view)
              }}
            >
              {tab.label}
            </Focusable>
          ))}
        </nav>

        <div className={styles.meta}>
          <Focusable
            focusKey="TOP_SEARCH"
            className={styles.search}
            onEnterPress={() => {
              go('search')
            }}
          >
            Buscar…
          </Focusable>
          <Focusable
            focusKey="TOP_SETTINGS"
            className={styles.iconBtn}
            onEnterPress={() => {
              go('settings')
            }}
          >
            ⚙
          </Focusable>
          <Focusable
            focusKey="TOP_PROFILE"
            className={styles.avatar}
            style={{ background: activeProfile?.color ?? '#444' }}
            onEnterPress={() => {
              onOpenProfiles?.()
            }}
          >
            {(activeProfile?.name ?? 'U').slice(0, 1).toUpperCase()}
          </Focusable>
          <time className={styles.clock} dateTime={now.toISOString()}>
            {time}
          </time>
        </div>
      </div>

      <div className={styles.rowPlatforms} data-scroll-x="row">
        {PLATFORM_ORDER.map((platform) => {
          const cfg = APP_CONFIGS[platform]
          return (
            <Focusable
              key={platform}
              focusKey={`TOP_PLAT_${platform}`}
              className={cx(
                styles.platTile,
                view === 'platform' &&
                  catalogPlatform === platform &&
                  styles.platTileActive,
              )}
              onEnterPress={() => {
                openPlatform(platform)
              }}
            >
              <PlatformIcon platform={platform} />
              <span>{cfg.label}</span>
            </Focusable>
          )
        })}
      </div>
    </header>
  )
}
