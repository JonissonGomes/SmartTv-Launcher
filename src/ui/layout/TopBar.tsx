import { useEffect, useState } from 'react'
import styles from './TopBar.module.css'

/** Barra superior: centro vazio · horário à direita (menu fica no flyout esquerdo). */
export function TopBar() {
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

  return (
    <header className={styles.topbar}>
      <div className={styles.spacer} />
      <time className={styles.clock} dateTime={now.toISOString()}>
        {time}
      </time>
    </header>
  )
}
