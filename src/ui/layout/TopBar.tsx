import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/store/settings'
import styles from './TopBar.module.css'

const TITLES: Record<string, string> = {
  home: 'Meu Launcher',
  history: 'Continuar assistindo',
  search: 'Buscar títulos',
  settings: 'Configurações',
}

export function TopBar() {
  const view = useSettingsStore((s) => s.view)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{TITLES[view] ?? 'Meu Launcher'}</h1>
      <div className={styles.meta}>
        <span className={styles.searchHint}>D-pad · Enter · Back</span>
        <time className={styles.clock} dateTime={now.toISOString()}>
          {time}
        </time>
      </div>
    </header>
  )
}
