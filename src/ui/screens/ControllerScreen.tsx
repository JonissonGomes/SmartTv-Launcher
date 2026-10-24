import { useCallback, useMemo, useRef, useState } from 'react'
import { createPlayerId, type PadInput } from '@/games/types'
import { useGameSocket } from '@/games/useGameSocket'
import { cx } from '@/ui/cx'
import styles from './ControllerScreen.module.css'

interface ControllerScreenProps {
  roomId: string
}

type PadTab = 'stick' | 'quiz'

export function ControllerScreen({ roomId }: ControllerScreenProps) {
  const playerId = useMemo(() => createPlayerId(), [])
  const [name, setName] = useState(() => `Jogador ${playerId.slice(-3)}`)
  const [tab, setTab] = useState<PadTab>('stick')
  const [stick, setStick] = useState({ x: 0, y: 0 })
  const [boost, setBoost] = useState(false)
  const padRef = useRef<HTMLDivElement>(null)
  const { connected, error, sendInput } = useGameSocket({
    roomId,
    playerId,
    name,
    role: 'pad',
  })

  const emit = useCallback(
    (partial: Partial<PadInput>) => {
      sendInput({
        x: partial.x ?? 0,
        y: partial.y ?? 0,
        action: partial.action ?? false,
        choice: partial.choice,
        at: performance.now(),
      })
    },
    [sendInput],
  )

  const updateStickFromEvent = useCallback(
    (clientX: number, clientY: number, active: boolean) => {
      const el = padRef.current
      if (!el || !active) {
        setStick({ x: 0, y: 0 })
        emit({ x: 0, y: 0, action: boost })
        return
      }
      const rect = el.getBoundingClientRect()
      const cx0 = rect.left + rect.width / 2
      const cy0 = rect.top + rect.height / 2
      const max = Math.min(rect.width, rect.height) * 0.42
      let dx = (clientX - cx0) / max
      let dy = (clientY - cy0) / max
      const len = Math.hypot(dx, dy)
      if (len > 1) {
        dx /= len
        dy /= len
      }
      setStick({ x: dx, y: dy })
      emit({ x: dx, y: dy, action: boost })
      if (typeof navigator.vibrate === 'function' && len > 0.85) {
        navigator.vibrate(8)
      }
    },
    [boost, emit],
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <p className={styles.kicker}>Sala {roomId}</p>
          <p className={styles.status}>
            {connected ? 'Online' : error ?? '…'}
          </p>
        </div>
        <input
          className={styles.name}
          value={name}
          maxLength={16}
          onChange={(e) => {
            setName(e.target.value.slice(0, 16))
          }}
          placeholder="Seu nome"
          aria-label="Nome"
        />
        <div className={styles.tabs}>
          <button
            type="button"
            className={cx(styles.tab, tab === 'stick' && styles.tabOn)}
            onClick={() => {
              setTab('stick')
            }}
          >
            Stick
          </button>
          <button
            type="button"
            className={cx(styles.tab, tab === 'quiz' && styles.tabOn)}
            onClick={() => {
              setTab('quiz')
            }}
          >
            A B C D
          </button>
        </div>
      </header>

      {tab === 'stick' ? (
        <div className={styles.stickLayout}>
          <div
            ref={padRef}
            className={styles.stickPad}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              updateStickFromEvent(e.clientX, e.clientY, true)
            }}
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
              updateStickFromEvent(e.clientX, e.clientY, true)
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId)
              updateStickFromEvent(0, 0, false)
            }}
            onPointerCancel={() => {
              updateStickFromEvent(0, 0, false)
            }}
          >
            <div
              className={styles.stickKnob}
              style={{
                transform: `translate(${String(stick.x * 42)}%, ${String(stick.y * 42)}%)`,
              }}
            />
          </div>
          <button
            type="button"
            className={cx(styles.boost, boost && styles.boostOn)}
            onPointerDown={() => {
              setBoost(true)
              emit({ x: stick.x, y: stick.y, action: true })
            }}
            onPointerUp={() => {
              setBoost(false)
              emit({ x: stick.x, y: stick.y, action: false })
            }}
            onPointerLeave={() => {
              setBoost(false)
              emit({ x: stick.x, y: stick.y, action: false })
            }}
          >
            BOOST
          </button>
        </div>
      ) : (
        <div className={styles.choices}>
          {(['A', 'B', 'C', 'D'] as const).map((letter) => (
            <button
              key={letter}
              type="button"
              className={styles.choice}
              onClick={() => {
                emit({ choice: letter, action: true, x: 0, y: 0 })
                if (typeof navigator.vibrate === 'function') navigator.vibrate(12)
              }}
            >
              {letter}
            </button>
          ))}
          <button
            type="button"
            className={styles.actionWide}
            onPointerDown={() => {
              emit({ action: true, x: 0, y: 0 })
            }}
            onPointerUp={() => {
              emit({ action: false, x: 0, y: 0 })
            }}
          >
            AÇÃO / TOQUE
          </button>
        </div>
      )}
    </div>
  )
}
