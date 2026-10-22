import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { APP_CONFIGS, PLATFORM_ORDER } from '@/config/apps'
import type { AppView, Platform } from '@/domain/types'
import { launchApp } from '@/services/webos'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './Sidebar.module.css'

const NAV_ITEMS: Array<{ view: AppView; label: string; short: string }> = [
  { view: 'home', label: 'Início', short: 'Home' },
  { view: 'history', label: 'Histórico', short: 'Hist' },
  { view: 'search', label: 'Busca', short: 'Busca' },
  { view: 'settings', label: 'Config', short: 'Cfg' },
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
        ML
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
          {shortLabel(platform)}
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
          {item.short}
        </Focusable>
      ))}
    </Focusable>
  )
}

function shortLabel(platform: Platform): string {
  switch (platform) {
    case 'netflix':
      return 'N'
    case 'hbomax':
      return 'HBO'
    case 'globoplay':
      return 'G+'
    case 'youtube':
      return 'YT'
  }
}
