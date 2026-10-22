import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { APP_CONFIGS, PLATFORM_ORDER } from '@/config/apps'
import type { AppView } from '@/domain/types'
import { launchApp } from '@/services/webos'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { BrandIcon, NavIcon, PlatformIcon } from '@/ui/icons/Icons'
import styles from './Sidebar.module.css'

const NAV_ITEMS: Array<{ view: AppView; label: string }> = [
  { view: 'home', label: 'Início' },
  { view: 'history', label: 'Histórico' },
  { view: 'search', label: 'Busca' },
  { view: 'settings', label: 'Config' },
]

export function Sidebar() {
  const view = useSettingsStore((s) => s.view)
  const setView = useSettingsStore((s) => s.setView)

  return (
    <Focusable
      focusKey="SIDEBAR"
      className={styles.sidebar}
      saveLastFocusedChild
    >
      <div className={styles.brand} aria-hidden>
        <BrandIcon />
      </div>

      {PLATFORM_ORDER.map((platform) => (
        <Focusable
          key={platform}
          focusKey={`SIDEBAR_APP_${platform}`}
          className={styles.item}
          style={{ borderTop: `3px solid ${APP_CONFIGS[platform].color}` }}
          onEnterPress={() => {
            void launchApp(platform)
          }}
        >
          <PlatformIcon platform={platform} />
          <span className={styles.srOnly}>{APP_CONFIGS[platform].label}</span>
        </Focusable>
      ))}

      <div className={styles.spacer} />

      {NAV_ITEMS.map((item) => (
        <Focusable
          key={item.view}
          focusKey={`SIDEBAR_NAV_${item.view}`}
          className={cx(styles.item, view === item.view && styles.itemActive)}
          onEnterPress={() => {
            setView(item.view)
            void setFocus(item.view === 'home' ? 'HERO' : `VIEW_${item.view}`)
          }}
        >
          <NavIcon view={item.view} />
          <span className={styles.srOnly}>{item.label}</span>
        </Focusable>
      ))}
    </Focusable>
  )
}
