import {
  FocusContext,
  setFocus,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation'
import type { RefObject } from 'react'
import { APP_CONFIGS, PLATFORM_ORDER } from '@/config/apps'
import type { AppView, Platform } from '@/domain/types'
import { launchApp } from '@/services/webos'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { BrandIcon, NavIcon, PlatformIcon } from '@/ui/icons/Icons'
import styles from './Sidebar.module.css'

const MENU_ITEMS: Array<{ view: AppView; label: string }> = [
  { view: 'home', label: 'Início' },
  { view: 'search', label: 'Busca' },
  { view: 'history', label: 'Recentes' },
]

const GENERAL_ITEMS: Array<{ view: AppView; label: string }> = [
  { view: 'settings', label: 'Configurações' },
]

export function Sidebar() {
  const view = useSettingsStore((s) => s.view)
  const setView = useSettingsStore((s) => s.setView)
  const activeTheme = useSettingsStore((s) => s.activeTheme)
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme)

  const { ref, focused, hasFocusedChild, focusKey } = useFocusable({
    focusKey: 'SIDEBAR',
    trackChildren: true,
    saveLastFocusedChild: true,
  })

  const expanded = focused || hasFocusedChild

  const openView = (next: AppView) => {
    setView(next)
    void setFocus(`VIEW_${next === 'home' ? 'home' : next}`)
  }

  const openPlatform = (platform: Platform) => {
    setActiveTheme(platform)
    void launchApp(platform)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <aside
        ref={ref as RefObject<HTMLElement>}
        className={cx(styles.sidebar, expanded && styles.sidebarExpanded)}
        data-expanded={expanded ? 'true' : 'false'}
      >
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <BrandIcon size={30} />
          </div>
          <span className={styles.brandLabel}>Meu Launcher</span>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Menu</p>
          {MENU_ITEMS.map((item) => (
            <Focusable
              key={item.view}
              focusKey={`SIDEBAR_NAV_${item.view}`}
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
              className={cx(
                styles.item,
                activeTheme === platform && styles.itemActive,
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
