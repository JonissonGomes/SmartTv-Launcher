import { useMemo, useState } from 'react'
import {
  createPlayerId,
  type PadInput,
} from '@/games/types'
import { useGameSocket } from '@/games/useGameSocket'
import styles from './ControllerScreen.module.css'

interface ControllerScreenProps {
  roomId: string
}

export function ControllerScreen({ roomId }: ControllerScreenProps) {
  const playerId = useMemo(() => createPlayerId(), [])
  const [name, setName] = useState(() => `Jogador ${playerId.slice(-3)}`)
  const { connected, error, sendInput } = useGameSocket({
    roomId,
    playerId,
    name,
    role: 'pad',
  })

  const emit = (partial: Partial<PadInput>) => {
    sendInput({
      x: partial.x ?? 0,
      y: partial.y ?? 0,
      action: partial.action ?? false,
      choice: partial.choice,
      at: performance.now(),
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Controle · sala {roomId}</p>
        <h1 className={styles.title}>Joystick</h1>
        <p className={styles.status}>
          {connected ? 'Conectado à TV' : error ?? 'Conectando…'}
        </p>
        <input
          className={styles.name}
          value={name}
          maxLength={16}
          onChange={(e) => {
            setName(e.target.value.slice(0, 16))
          }}
          placeholder="Seu nome"
        />
      </header>

      <div className={styles.pad}>
        <button
          type="button"
          className={styles.dir}
          onTouchStart={() => {
            emit({ y: -1 })
          }}
          onTouchEnd={() => {
            emit({ y: 0 })
          }}
          onMouseDown={() => {
            emit({ y: -1 })
          }}
          onMouseUp={() => {
            emit({ y: 0 })
          }}
        >
          ↑
        </button>
        <div className={styles.midRow}>
          <button
            type="button"
            className={styles.dir}
            onTouchStart={() => {
              emit({ x: -1 })
            }}
            onTouchEnd={() => {
              emit({ x: 0 })
            }}
            onMouseDown={() => {
              emit({ x: -1 })
            }}
            onMouseUp={() => {
              emit({ x: 0 })
            }}
          >
            ←
          </button>
          <button
            type="button"
            className={styles.action}
            onTouchStart={() => {
              emit({ action: true })
            }}
            onMouseDown={() => {
              emit({ action: true })
            }}
          >
            AÇÃO
          </button>
          <button
            type="button"
            className={styles.dir}
            onTouchStart={() => {
              emit({ x: 1 })
            }}
            onTouchEnd={() => {
              emit({ x: 0 })
            }}
            onMouseDown={() => {
              emit({ x: 1 })
            }}
            onMouseUp={() => {
              emit({ x: 0 })
            }}
          >
            →
          </button>
        </div>
        <button
          type="button"
          className={styles.dir}
          onTouchStart={() => {
            emit({ y: 1 })
          }}
          onTouchEnd={() => {
            emit({ y: 0 })
          }}
          onMouseDown={() => {
            emit({ y: 1 })
          }}
          onMouseUp={() => {
            emit({ y: 0 })
          }}
        >
          ↓
        </button>
      </div>

      <div className={styles.choices}>
        {(['A', 'B', 'C', 'D'] as const).map((letter) => (
          <button
            key={letter}
            type="button"
            className={styles.choice}
            onClick={() => {
              emit({ choice: letter, action: true })
            }}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  )
}
