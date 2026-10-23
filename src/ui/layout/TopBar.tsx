import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './TopBar.module.css'

const TABS: Array<{
  id: string
  label: string
  view: 'home' | 'search' | 'history' | 'categories' | 'anime'
}> = [
  { id: 'home', label: 'Início', view: 'home' },
  { id: 'categories', label: 'Catálogo', view: 'categories' },
  { id: 'anime', label: 'Animes', view: 'anime' },
  { id: 'history', label: 'Recentes', view: 'history' },
]

export function TopBar() {
  const view = useSettingsStore((s) => s.view)
  const setView = useSettingsStore((s) => s.setView)
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

  return (
    <header className={styles.topbar}>
      <div className={styles.brandBlock}>
        <span className={styles.brand}>Meu Launcher</span>
      </div>

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
              setView(tab.view)
              void setFocus(
                tab.view === 'home'
                  ? 'VIEW_home'
                  : tab.view === 'anime'
                    ? 'VIEW_anime'
                    : `VIEW_${tab.view}`,
              )
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
            setView('search')
            void setFocus('VIEW_search')
          }}
        >
          Buscar títulos…
        </Focusable>
        <time className={styles.clock} dateTime={now.toISOString()}>
          {time}
        </time>
      </div>
    </header>
  )
}
