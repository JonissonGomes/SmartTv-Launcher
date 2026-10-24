import { useMemo } from 'react'
import { createPlayerId } from '@/cast/types'
import { useCastPhoneSession } from '@/cast/useCastSession'
import styles from './CastPhoneScreen.module.css'

interface CastPhoneScreenProps {
  roomId: string
}

export function CastPhoneScreen({ roomId }: CastPhoneScreenProps) {
  const playerId = useMemo(() => createPlayerId(), [])
  const {
    connected,
    error,
    status,
    statusText,
    tvPresent,
    startShare,
    stopShare,
  } = useCastPhoneSession({
    roomId,
    playerId,
    name: 'Celular',
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Espelhar · sala {roomId}</p>
        <h1 className={styles.title}>Tela do celular</h1>
        <p className={styles.status}>
          {connected
            ? tvPresent
              ? 'TV na sala'
              : 'Conectado — aguardando TV abrir Espelhar'
            : error ?? 'Conectando…'}
        </p>
        <p className={styles.hint}>{statusText}</p>
      </header>

      <div className={styles.actions}>
        {status === 'sharing' ? (
          <button type="button" className={styles.stop} onClick={stopShare}>
            Parar compartilhamento
          </button>
        ) : (
          <button
            type="button"
            className={styles.share}
            onClick={() => {
              void startShare()
            }}
            disabled={!connected}
          >
            Compartilhar tela
          </button>
        )}
      </div>

      <p className={styles.note}>
        Funciona com <code>npm run dev</code> na mesma Wi‑Fi. Em alguns
        Androids só o Chrome permite captura de tela.
      </p>
    </div>
  )
}
