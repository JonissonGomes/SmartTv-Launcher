import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AirHockeyGame } from '@/games/AirHockeyGame'
import { AIR_HOCKEY_ARENAS, type ArenaId } from '@/games/airHockeyArenas'
import {
  DIFFICULTY_OPTIONS,
  difficultyLabel,
  type Difficulty,
} from '@/games/difficulty'
import { PongGame } from '@/games/PongGame'
import { QuizGame } from '@/games/QuizGame'
import { ReactionGame } from '@/games/ReactionGame'
import {
  controllerUrl,
  createPlayerId,
  createRoomCode,
  GAME_CATALOG,
  playerColor,
  qrImageUrl,
  type GameId,
  type GamePlayer,
  type PadInput,
  type RelayInbound,
} from '@/games/types'
import { useGameSocket } from '@/games/useGameSocket'
import { isLoopbackHost, resolvePublicOrigin } from '@/services/publicOrigin'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './GamesScreen.module.css'

type Phase = 'lobby' | 'play'

export function GamesScreen() {
  const hostId = useMemo(() => createPlayerId(), [])
  const [phase, setPhase] = useState<Phase>('lobby')
  const [gameId, setGameId] = useState<GameId>('airhockey')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [arenaId, setArenaId] = useState<ArenaId>('classic')
  const [roomId] = useState(() => createRoomCode())
  const [players, setPlayers] = useState<GamePlayer[]>([
    {
      playerId: hostId,
      name: 'TV (P1)',
      role: 'host',
      color: playerColor(0),
    },
  ])
  const [inputs, setInputs] = useState<Record<string, PadInput>>({})
  const [running, setRunning] = useState(false)
  const [scoreLabel, setScoreLabel] = useState('')

  const [publicOrigin, setPublicOrigin] = useState(window.location.origin)
  const inviteUrl = controllerUrl(roomId, publicOrigin)
  const qrSrc = qrImageUrl(inviteUrl)
  const loopbackWarn = isLoopbackHost(new URL(publicOrigin).hostname)

  useEffect(() => {
    let cancelled = false
    void resolvePublicOrigin().then((origin) => {
      if (!cancelled) setPublicOrigin(origin)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const onMessage = useCallback((msg: RelayInbound) => {
    if (msg.type === 'presence') {
      setPlayers((prev) => {
        const host = prev.find((p) => p.role === 'host') ?? prev[0]
        const pads: GamePlayer[] = msg.players
          .filter((p) => p.role === 'pad')
          .map((p, index) => ({
            playerId: p.playerId,
            name: p.name,
            role: 'pad',
            color: playerColor(index + 1),
          }))
        return host ? [host, ...pads] : pads
      })
    }
    if (msg.type === 'input') {
      setInputs((prev) => ({
        ...prev,
        [msg.playerId]: msg.payload,
      }))
    }
  }, [])

  const { connected, error } = useGameSocket({
    roomId,
    playerId: hostId,
    name: 'TV',
    role: 'host',
    onMessage,
  })

  useEffect(() => {
    void setFocus('VIEW_games')
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase !== 'play') return
      const code = event.key
      const at = performance.now()
      const p1: PadInput = { x: 0, y: 0, action: false, at }
      const p2: PadInput = { x: 0, y: 0, action: false, at }

      if (code === 'ArrowUp') p1.y = -1
      if (code === 'ArrowDown') p1.y = 1
      if (code === 'ArrowLeft') p1.x = -1
      if (code === 'ArrowRight') p1.x = 1
      if (code === 'Enter' || code === ' ') {
        p1.action = true
        p1.choice = 'A'
      }
      if (code === '1') p1.choice = 'A'
      if (code === '2') p1.choice = 'B'
      if (code === '3') p1.choice = 'C'
      if (code === '4') p1.choice = 'D'

      if (code === 'w' || code === 'W') p2.y = -1
      if (code === 's' || code === 'S') p2.y = 1
      if (code === 'a' || code === 'A') p2.x = -1
      if (code === 'd' || code === 'D') p2.x = 1
      if (code === 'f' || code === 'F') {
        p2.action = true
        p2.choice = 'A'
      }
      if (code === 'g' || code === 'G') p2.choice = 'B'
      if (code === 'h' || code === 'H') p2.choice = 'C'
      if (code === 'j' || code === 'J') p2.choice = 'D'

      setInputs((prev) => {
        const next = { ...prev }
        if (p1.x || p1.y || p1.action || p1.choice) next[hostId] = p1
        if (p2.x || p2.y || p2.action || p2.choice) next.local_p2 = p2
        return next
      })
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [hostId, phase])

  const pads = players.filter((p) => p.role === 'pad')
  const catalog = GAME_CATALOG.find((g) => g.id === gameId)
  const arena = AIR_HOCKEY_ARENAS.find((a) => a.id === arenaId)
  const canStart = pads.length >= (catalog?.minPlayers ?? 2) - 1

  const start = () => {
    if (!canStart) return
    setPhase('play')
    setRunning(true)
    setScoreLabel('')
    void setFocus('GAME_BACK')
  }

  const startLocalDuo = () => {
    const localId = 'local_p2'
    setPlayers([
      {
        playerId: hostId,
        name: 'P1 · setas',
        role: 'host',
        color: playerColor(0),
      },
      {
        playerId: localId,
        name: 'P2 · WASD',
        role: 'pad',
        color: playerColor(1),
      },
    ])
    setPhase('play')
    setRunning(true)
    setScoreLabel('')
    void setFocus('GAME_BACK')
  }

  const backLobby = () => {
    setPhase('lobby')
    setRunning(false)
    void setFocus('GAME_START')
  }

  const playMeta = [
    difficultyLabel(difficulty),
    gameId === 'airhockey' ? arena?.name : null,
    scoreLabel || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Focusable focusKey="VIEW_games" className={styles.screen} saveLastFocusedChild>
      {phase === 'lobby' ? (
        <>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>Multiplayer</p>
              <h1 className={styles.title}>Jogos</h1>
            </div>
            <p className={styles.room}>
              Sala <strong>{roomId}</strong>
              {' · '}
              {connected ? 'relay online' : error ?? 'aguardando relay…'}
            </p>
          </header>

          <div className={styles.lobby}>
            <div className={styles.lobbyMain}>
              <section className={styles.gamesList}>
                {GAME_CATALOG.map((game) => (
                  <Focusable
                    key={game.id}
                    focusKey={`GAME_PICK_${game.id}`}
                    className={cx(
                      styles.gameCard,
                      gameId === game.id && styles.gameCardActive,
                    )}
                    onEnterPress={() => {
                      setGameId(game.id)
                    }}
                  >
                    <div className={styles.gameCardTop}>
                      <h2>{game.title}</h2>
                      <span className={styles.meta}>{game.meta}</span>
                    </div>
                    <p>{game.blurb}</p>
                  </Focusable>
                ))}
              </section>

              <section className={styles.options}>
                <h3 className={styles.optionsTitle}>Dificuldade</h3>
                <div className={styles.chipRow}>
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <Focusable
                      key={d.id}
                      focusKey={`GAME_DIFF_${d.id}`}
                      className={cx(
                        styles.chip,
                        difficulty === d.id && styles.chipOn,
                      )}
                      onEnterPress={() => {
                        setDifficulty(d.id)
                      }}
                    >
                      {d.label}
                    </Focusable>
                  ))}
                </div>

                {gameId === 'airhockey' ? (
                  <>
                    <h3 className={styles.optionsTitle}>Arena</h3>
                    <div className={styles.arenaRow}>
                      {AIR_HOCKEY_ARENAS.map((a) => (
                        <Focusable
                          key={a.id}
                          focusKey={`GAME_ARENA_${a.id}`}
                          className={cx(
                            styles.arenaCard,
                            arenaId === a.id && styles.arenaCardOn,
                          )}
                          onEnterPress={() => {
                            setArenaId(a.id)
                          }}
                        >
                          <strong>{a.name}</strong>
                          <span>{a.blurb}</span>
                        </Focusable>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            </div>

            <section className={styles.invite}>
              <img className={styles.qr} src={qrSrc} alt="QR do controle" />
              <div className={styles.inviteBody}>
                <h2>Controle no celular</h2>
                <p>
                  Escaneie o QR na mesma Wi‑Fi. Stick no celular para Air Hockey /
                  Pong; aba A–D para Quiz e Reação.
                </p>
                {loopbackWarn ? (
                  <p className={styles.warn}>
                    Abra pelo IP da rede (URL Network do Vite), não por localhost.
                  </p>
                ) : null}
                <p className={styles.url}>{inviteUrl}</p>
                <p className={styles.players}>
                  Pads: {String(pads.length)} /{' '}
                  {String((catalog?.maxPlayers ?? 4) - 1)}
                </p>
                <ul className={styles.playerList}>
                  {players.map((p) => (
                    <li key={p.playerId}>
                      <span
                        className={styles.playerDot}
                        style={{ background: p.color }}
                      />
                      {p.name}
                      {p.role === 'host' ? ' (TV)' : ''}
                    </li>
                  ))}
                </ul>
                <div className={styles.ctaRow}>
                  <Focusable
                    focusKey="GAME_START"
                    className={cx(
                      styles.startBtn,
                      !canStart && styles.startDisabled,
                    )}
                    onEnterPress={start}
                  >
                    Iniciar
                  </Focusable>
                  <Focusable
                    focusKey="GAME_LOCAL"
                    className={styles.localBtn}
                    onEnterPress={startLocalDuo}
                  >
                    Demo 2P teclado
                  </Focusable>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className={styles.play}>
          <div className={styles.playBar}>
            <Focusable
              focusKey="GAME_BACK"
              className={styles.backBtn}
              onEnterPress={backLobby}
            >
              ← Lobby
            </Focusable>
            <h2>{catalog?.title}</h2>
            <span className={styles.playMeta}>{playMeta}</span>
          </div>
          <div className={styles.stage}>
            {gameId === 'airhockey' && pads[0] ? (
              <AirHockeyGame
                running={running}
                difficulty={difficulty}
                arenaId={arenaId}
                playerIds={[hostId, pads[0].playerId]}
                colors={[playerColor(0), pads[0].color]}
                inputs={inputs}
                onScore={(s) => {
                  setScoreLabel(`${String(s[0])} × ${String(s[1])}`)
                }}
              />
            ) : null}
            {gameId === 'pong' && pads[0] ? (
              <PongGame
                running={running}
                difficulty={difficulty}
                playerIds={[hostId, pads[0].playerId]}
                colors={[playerColor(0), pads[0].color]}
                inputs={inputs}
                onScore={(s) => {
                  setScoreLabel(`${String(s[0])} × ${String(s[1])}`)
                }}
              />
            ) : null}
            {gameId === 'reaction' ? (
              <ReactionGame
                running={running}
                difficulty={difficulty}
                playerIds={players.map((p) => p.playerId)}
                colors={players.map((p) => p.color)}
                names={players.map((p) => p.name)}
                inputs={inputs}
                onScore={(s) => {
                  setScoreLabel(s.map(String).join(' · '))
                }}
              />
            ) : null}
            {gameId === 'quiz' ? (
              <QuizGame
                running={running}
                difficulty={difficulty}
                playerIds={players.map((p) => p.playerId)}
                colors={players.map((p) => p.color)}
                names={players.map((p) => p.name)}
                inputs={inputs}
                onScore={(s) => {
                  setScoreLabel(s.map(String).join(' · '))
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </Focusable>
  )
}
