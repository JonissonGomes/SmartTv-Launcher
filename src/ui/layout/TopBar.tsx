import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './TopBar.module.css'

const TABS: Array<{ id: string; label: string; view?: 'home' | 'search' | 'history' }> = [
  { id: 'home', label: 'Início', view: 'home' },
  { id: 'movies', label: 'Filmes', view: 'home' },
  { id: 'series', label: 'Séries', view: 'home' },
  { id: 'history', label: 'Recentes', view: 'history' },
]

export function TopBar() {
  const view = useSettingsStore((s) => s.view)
  const setView = useSettingsStore((s) => s.setView)
  const [now, setNow] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState('home')

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

  return (
    <header className={styles.topbar}>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <Focusable
            key={tab.id}
            focusKey={`TOP_TAB_${tab.id}`}
            variant="plain"
            className={cx(
              styles.tab,
              (activeTab === tab.id ||
                (tab.view === view && tab.id !== 'movies' && tab.id !== 'series')) &&
                styles.tabActive,
            )}
            onEnterPress={() => {
              setActiveTab(tab.id)
              if (tab.view) {
                setView(tab.view)
                void setFocus(
                  tab.view === 'home' ? 'VIEW_home' : `VIEW_${tab.view}`,
                )
              }
            }}
          >
            {tab.label}
          </Focusable>
        ))}
      </div>

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
