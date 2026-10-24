import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import {
  RECOMP_GAMES,
  resolveRecompUrl,
  type RecompGameId,
} from '@/config/recompGames'
import { launchBrowser } from '@/services/webos'
import { normalizeHttpsUrl } from '@/services/urlSafety'
import {
  probeGraphicsApis,
  type GraphicsProbeResult,
} from '@/services/webGpuProbe'
import { useSettingsStore } from '@/store/settings'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { TvTextField } from '@/ui/input/TvTextField'
import styles from './RecompGamesScreen.module.css'

export function RecompGamesScreen() {
  const recompUrls = useSettingsStore((s) => s.recompUrls)
  const setRecompUrl = useSettingsStore((s) => s.setRecompUrl)
  const [drafts, setDrafts] = useState(recompUrls)
  const [message, setMessage] = useState<string>()
  const [gfx, setGfx] = useState<GraphicsProbeResult | null>(null)
  const [busyId, setBusyId] = useState<RecompGameId | null>(null)

  useEffect(() => {
    void setFocus('VIEW_recomp')
  }, [])

  useEffect(() => {
    setDrafts(recompUrls)
  }, [recompUrls])

  useEffect(() => {
    void probeGraphicsApis().then(setGfx)
  }, [])

  const openGame = (id: RecompGameId) => {
    const raw = resolveRecompUrl(id, drafts)
    const safe = normalizeHttpsUrl(raw)
    if (!safe) {
      setMessage('URL inválida. Use http(s)://IP:porta/')
      return
    }
    const game = RECOMP_GAMES.find((g) => g.id === id)
    if (game?.needs === 'webgpu' && gfx && !gfx.webgpu) {
      setMessage(
        `${game.title}: este runtime não tem WebGPU. Teste no PC Chrome ou ajuste o build.`,
      )
    }
    if (game?.needs === 'webgl2' && gfx && !gfx.webgl2) {
      setMessage(`${game.title}: sem WebGL2 neste aparelho.`)
      return
    }
    setBusyId(id)
    void launchBrowser(safe)
      .then(() => {
        setMessage(`Abrindo ${game?.title ?? id} no browser…`)
      })
      .catch((err: unknown) => {
        setMessage(
          err instanceof Error
            ? err.message
            : 'Falha ao abrir o browser da TV',
        )
      })
      .finally(() => {
        setBusyId(null)
      })
  }

  const saveUrl = (id: RecompGameId) => {
    const next = normalizeHttpsUrl(drafts[id] ?? '')
    if (!next) {
      setMessage('URL inválida.')
      return
    }
    setRecompUrl(id, next.replace(/\/$/, ''))
    setDrafts((d) => ({ ...d, [id]: next.replace(/\/$/, '') }))
    setMessage('URL salva.')
  }

  return (
    <Focusable
      focusKey="VIEW_recomp"
      className={styles.screen}
      saveLastFocusedChild
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Web-recomp</p>
          <h1 className={styles.title}>Clássicos no browser</h1>
        </div>
        <p className={styles.side}>
          {gfx
            ? `WebGL2 ${gfx.webgl2 ? 'ok' : 'não'} · WebGPU ${gfx.webgpu ? 'ok' : 'não'}`
            : 'Detectando GPU…'}
        </p>
      </header>

      <p className={styles.legal}>
        Incluímos os títulos do porte comunitário (PSP/PS2 web-recomp). O launcher
        só abre a URL do <strong>build que você gerou</strong> a partir da ISO que
        você já possui — nenhum jogo/ROM é distribuído aqui. Sirva com{' '}
        <code>scripts/serve</code> do projeto e aponte o IP:porta da rede.
      </p>

      <div className={styles.grid}>
        {RECOMP_GAMES.map((game) => {
          const url = drafts[game.id] ?? ''
          const blocked =
            (game.needs === 'webgl2' && gfx && !gfx.webgl2) ||
            (game.needs === 'webgpu' && gfx && !gfx.webgpu)
          return (
            <article key={game.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.badge}>
                  {game.family.toUpperCase()}
                </span>
                <span className={styles.need}>
                  {game.needs === 'webgpu' ? 'WebGPU' : 'WebGL2'}
                </span>
              </div>
              <h2>{game.title}</h2>
              <p className={styles.sub}>{game.subtitle}</p>
              <TvTextField
                focusKey={`RECOMP_URL_${game.id}`}
                label="URL do build local"
                value={url}
                onChange={(v) => {
                  setDrafts((d) => ({ ...d, [game.id]: v }))
                }}
                placeholder={`http://192.168.x.x:${String(game.defaultPort)}`}
                inputType="url"
                maxLength={180}
              />
              <div className={styles.actions}>
                <Focusable
                  focusKey={`RECOMP_SAVE_${game.id}`}
                  className={styles.btnGhost}
                  onEnterPress={() => {
                    saveUrl(game.id)
                  }}
                >
                  Salvar URL
                </Focusable>
                <Focusable
                  focusKey={`RECOMP_OPEN_${game.id}`}
                  className={cx(
                    styles.btn,
                    (blocked || busyId === game.id) && styles.btnDisabled,
                  )}
                  onEnterPress={() => {
                    if (blocked) return
                    openGame(game.id)
                  }}
                >
                  {busyId === game.id ? 'Abrindo…' : 'Abrir no browser'}
                </Focusable>
              </div>
            </article>
          )
        })}
      </div>

      {message ? <p className={styles.msg}>{message}</p> : null}
    </Focusable>
  )
}
