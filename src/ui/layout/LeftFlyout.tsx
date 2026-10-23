import {
  FocusContext,
  setFocus,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState, type RefObject } from 'react'
import { APP_CONFIGS, PLATFORM_ORDER } from '@/config/apps'
import type { AppView, Platform } from '@/domain/types'
import { launchApp, listInstalledApps } from '@/services/webos'
import { useProfilesStore } from '@/store/profiles'
import { useSettingsStore } from '@/store/settings'
import { useUiSessionStore } from '@/store/uiSession'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { PlatformIcon } from '@/ui/icons/Icons'
import styles from './LeftFlyout.module.css'

const NAV: Array<{ view: AppView; label: string }> = [
  { view: 'home', label: 'Início' },
  { view: 'history', label: 'Histórico' },
  { view: 'categories', label: 'Catálogo' },
  { view: 'anime', label: 'Animes' },
  { view: 'search', label: 'Busca' },
  { view: 'surprise', label: 'Surpresa' },
  { view: 'games', label: 'Jogos' },
  { view: 'settings', label: 'Configurações' },
]

interface LeftFlyoutProps {
  onOpenProfiles?: () => void
}

/** Menu lateral oculto — abre com foco/hover (Magic Remote). */
export function LeftFlyout({ onOpenProfiles }: LeftFlyoutProps) {
  const view = useSettingsStore((s) => s.view)
  const setView = useSettingsStore((s) => s.setView)
  const openPlatformCatalog = useSettingsStore((s) => s.openPlatformCatalog)
  const profiles = useProfilesStore((s) => s.profiles)
  const activeProfileId = useProfilesStore((s) => s.activeProfileId)
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
  const playerOpen = useUiSessionStore((s) => s.playerOpen)

  const [installedPlatforms, setInstalledPlatforms] = useState<Platform[]>([])
  const [hoverOpen, setHoverOpen] = useState(false)
  /** Mantém aberto por um instante após perder foco (evita flicker no D-pad). */
  const [lingerOpen, setLingerOpen] = useState(false)

  const { ref, focused, hasFocusedChild, focusKey } = useFocusable({
    focusKey: 'LEFT_FLYOUT',
    trackChildren: true,
    saveLastFocusedChild: true,
  })

  const wantOpen = focused || hasFocusedChild || hoverOpen

  useEffect(() => {
    if (wantOpen) {
      setLingerOpen(true)
      return
    }
    const id = window.setTimeout(() => {
      setLingerOpen(false)
    }, 450)
    return () => {
      window.clearTimeout(id)
    }
  }, [wantOpen])

  const expanded = wantOpen || lingerOpen

  useEffect(() => {
    let cancelled = false
    void listInstalledApps()
      .then((list) => {
        if (cancelled) return
        const ids = new Set(list.map((a) => a.id))
        const found = PLATFORM_ORDER.filter((platform) => {
          const cfg = APP_CONFIGS[platform]
          const candidates = [
            cfg.webosAppId,
            ...(cfg.webosAppIdCandidates ?? []),
          ]
          return candidates.some((id) => ids.has(id))
        })
        setInstalledPlatforms(found.length > 0 ? found : [...PLATFORM_ORDER])
      })
      .catch(() => {
        if (!cancelled) setInstalledPlatforms([...PLATFORM_ORDER])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const contentFocusKey = (): string => {
    if (view === 'home') return 'VIEW_home'
    if (view === 'anime' || view === 'library') return 'VIEW_anime'
    if (view === 'platform') return 'VIEW_platform'
    return `VIEW_${view}`
  }

  /** Direita no menu = sai pro conteúdo e fecha o flyout na hora. */
  const exitFlyoutOnRight = (direction: string): boolean => {
    if (direction !== 'right') return true
    setHoverOpen(false)
    setLingerOpen(false)
    void setFocus(contentFocusKey())
    return false
  }

  const go = (next: AppView) => {
    setView(next === 'library' ? 'anime' : next)
    setHoverOpen(false)
    setLingerOpen(false)
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
    setHoverOpen(false)
    setLingerOpen(false)
    void setFocus('VIEW_platform')
  }

  if (playerOpen) return null

  return (
    <FocusContext.Provider value={focusKey}>
      <aside
        ref={ref as RefObject<HTMLElement>}
        className={cx(styles.flyout, expanded && styles.open)}
        data-expanded={expanded ? 'true' : 'false'}
        onMouseEnter={() => {
          setHoverOpen(true)
        }}
        onMouseLeave={() => {
          setHoverOpen(false)
        }}
      >
        <Focusable
          focusKey="FLY_PEEK"
          variant="nav"
          className={styles.peek}
          focusable={!expanded}
          onEnterPress={() => {
            void setFocus('FLY_PROFILE')
          }}
          onArrowPress={exitFlyoutOnRight}
        >
          <img
            className={styles.peekLogo}
            src="./logo.png"
            alt="PINTV"
            width={36}
            height={36}
            decoding="async"
            draggable={false}
          />
        </Focusable>

        <div className={styles.panel}>
          <Focusable
            focusKey="FLY_PROFILE"
            variant="nav"
            className={styles.profile}
            onEnterPress={() => {
              onOpenProfiles?.()
            }}
            onArrowPress={exitFlyoutOnRight}
          >
            <div
              className={styles.avatar}
              style={{ background: activeProfile?.color ?? '#444' }}
            >
              {(activeProfile?.name ?? 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className={styles.profileMeta}>
              <strong>{activeProfile?.name ?? 'Perfil'}</strong>
              <span>Trocar perfil</span>
            </div>
          </Focusable>

          <p className={styles.sectionLabel}>Navegação</p>
          <nav className={styles.navList}>
            {NAV.map((item) => (
              <Focusable
                key={item.view}
                focusKey={`FLY_NAV_${item.view}`}
                variant="nav"
                className={cx(
                  styles.navItem,
                  (view === item.view ||
                    (item.view === 'anime' && view === 'library')) &&
                    styles.navItemActive,
                )}
                onEnterPress={() => {
                  go(item.view)
                }}
                onArrowPress={exitFlyoutOnRight}
              >
                {item.label}
              </Focusable>
            ))}
          </nav>

          <p className={styles.sectionLabel}>Streamings</p>
          <div className={styles.platList}>
            {PLATFORM_ORDER.map((platform) => (
              <Focusable
                key={platform}
                focusKey={`FLY_PLAT_${platform}`}
                variant="nav"
                className={styles.platItem}
                onEnterPress={() => {
                  openPlatform(platform)
                }}
                onArrowPress={exitFlyoutOnRight}
              >
                <PlatformIcon platform={platform} size={22} />
                <span>{APP_CONFIGS[platform].label}</span>
              </Focusable>
            ))}
          </div>

          <p className={styles.sectionLabel}>Apps instalados</p>
          <div className={styles.appList}>
            {installedPlatforms.map((platform) => (
              <Focusable
                key={`app-${platform}`}
                focusKey={`FLY_APP_${platform}`}
                variant="nav"
                className={styles.appItem}
                onEnterPress={() => {
                  void launchApp(platform).catch(() => undefined)
                }}
                onArrowPress={exitFlyoutOnRight}
              >
                Abrir {APP_CONFIGS[platform].label}
              </Focusable>
            ))}
          </div>
        </div>
      </aside>
    </FocusContext.Provider>
  )
}
