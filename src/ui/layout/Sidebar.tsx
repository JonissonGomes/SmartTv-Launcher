import {
  FocusContext,
  setFocus,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, type RefObject } from 'react'
import { APP_CONFIGS, PLATFORM_ORDER } from '@/config/apps'
import type { AppView, Platform } from '@/domain/types'
import { useProfilesStore } from '@/store/profiles'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { NavIcon, PlatformIcon } from '@/ui/icons/Icons'
import styles from './Sidebar.module.css'

interface SidebarProps {
  onExpandedChange?: (expanded: boolean) => void
  onOpenProfiles?: () => void
}

const MENU_ITEMS: Array<{ view: AppView; label: string }> = [
  { view: 'home', label: 'Início' },
  { view: 'search', label: 'Busca' },
  { view: 'library', label: 'Biblioteca' },
  { view: 'categories', label: 'Categorias' },
  { view: 'history', label: 'Histórico' },
  { view: 'surprise', label: 'Surpreenda-me' },
  { view: 'games', label: 'Jogos' },
]

const GENERAL_ITEMS: Array<{ view: AppView; label: string }> = [
  { view: 'settings', label: 'Configurações' },
]

function focusForView(view: AppView): string {
  if (view === 'home') return 'VIEW_home'
  if (view === 'platform') return 'VIEW_platform'
  return `VIEW_${view}`
}

export function Sidebar({ onExpandedChange, onOpenProfiles }: SidebarProps) {
  const view = useSettingsStore((s) => s.view)
  const setView = useSettingsStore((s) => s.setView)
  const catalogPlatform = useSettingsStore((s) => s.catalogPlatform)
  const activeTheme = useSettingsStore((s) => s.activeTheme)
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme)
  const openPlatformCatalog = useSettingsStore((s) => s.openPlatformCatalog)
  const profiles = useProfilesStore((s) => s.profiles)
  const activeProfileId = useProfilesStore((s) => s.activeProfileId)
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0]

  const { ref, focused, hasFocusedChild, focusKey } = useFocusable({
    focusKey: 'SIDEBAR',
    trackChildren: true,
    saveLastFocusedChild: true,
  })

  const expanded = focused || hasFocusedChild

  useEffect(() => {
    onExpandedChange?.(expanded)
  }, [expanded, onExpandedChange])

  const openView = (next: AppView) => {
    setView(next)
    void setFocus(focusForView(next))
  }

  const openPlatform = (platform: Platform) => {
    openPlatformCatalog(platform)
    void setFocus('VIEW_platform')
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <aside
        ref={ref as RefObject<HTMLElement>}
        className={cx(styles.sidebar, expanded && styles.sidebarExpanded)}
        data-expanded={expanded ? 'true' : 'false'}
      >
        <Focusable
          focusKey="SIDEBAR_PROFILE"
          variant="nav"
          className={styles.brand}
          onEnterPress={() => {
            onOpenProfiles?.()
          }}
        >
          <div
            className={styles.brandMark}
            style={
              activeProfile
                ? { background: activeProfile.color, color: '#fff' }
                : undefined
            }
          >
            {activeProfile
              ? activeProfile.name.slice(0, 1).toUpperCase()
              : '?'}
          </div>
          <span className={styles.brandLabel}>
            {activeProfile?.name ?? 'Criar perfil'}
          </span>
        </Focusable>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Menu</p>
          {MENU_ITEMS.map((item) => (
            <Focusable
              key={item.view}
              focusKey={`SIDEBAR_NAV_${item.view}`}
              variant="nav"
              className={cx(styles.item, view === item.view && styles.itemActive)}
              onEnterPress={() => {
                openView(item.view)
              }}
            >
              <span className={styles.itemIcon}>
                <NavIcon view={item.view} size={28} />
              </span>
              <span className={styles.itemLabel}>{item.label}</span>
            </Focusable>
          ))}
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Apps</p>
          {PLATFORM_ORDER.map((platform) => (
            <Focusable
              key={platform}
              focusKey={`SIDEBAR_APP_${platform}`}
              variant="nav"
              className={cx(
                styles.item,
                ((view === 'platform' && catalogPlatform === platform) ||
                  activeTheme === platform) &&
                  styles.itemActive,
              )}
              onFocus={() => {
                setActiveTheme(platform)
              }}
              onEnterPress={() => {
                openPlatform(platform)
              }}
            >
              <span className={styles.itemIcon}>
                <PlatformIcon platform={platform} size={30} />
              </span>
              <span className={styles.itemLabel}>{APP_CONFIGS[platform].label}</span>
              <span
                className={styles.platformDot}
                style={{ background: APP_CONFIGS[platform].color }}
              />
            </Focusable>
          ))}
        </div>

        <div className={styles.spacer} />

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Geral</p>
          {GENERAL_ITEMS.map((item) => (
            <Focusable
              key={item.view}
              focusKey={`SIDEBAR_NAV_${item.view}`}
              variant="nav"
              className={cx(styles.item, view === item.view && styles.itemActive)}
              onEnterPress={() => {
                openView(item.view)
              }}
            >
              <span className={styles.itemIcon}>
                <NavIcon view={item.view} size={28} />
              </span>
              <span className={styles.itemLabel}>{item.label}</span>
            </Focusable>
          ))}
        </div>
      </aside>
    </FocusContext.Provider>
  )
}
