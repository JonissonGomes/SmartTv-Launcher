import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'react'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from './EpisodePrompt.module.css'

export interface EpisodeSelection {
  season: number
  episode: number
}

interface EpisodePromptProps {
  title: string
  initialSeason?: number
  initialEpisode?: number
  onConfirm: (selection: EpisodeSelection) => void
  onSkip: () => void
}

export function EpisodePrompt({
  title,
  initialSeason = 1,
  initialEpisode = 1,
  onConfirm,
  onSkip,
}: EpisodePromptProps) {
  const [season, setSeason] = useState(initialSeason)
  const [episode, setEpisode] = useState(initialEpisode)

  useEffect(() => {
    void setFocus('EPISODE_CONFIRM')
  }, [])

  return (
    <div className={styles.backdrop}>
      <Focusable focusKey="EPISODE_MODAL" className={styles.panel} isFocusBoundary>
        <h2 className={styles.title}>Episódio — {title}</h2>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="season">Temporada</label>
            <Focusable
              focusKey="EPISODE_SEASON"
              onEnterPress={() => {
                setSeason((s) => s + 1)
              }}
              onArrowPress={(dir) => {
                if (dir === 'up') {
                  setSeason((s) => Math.max(1, s + 1))
                  return false
                }
                if (dir === 'down') {
                  setSeason((s) => Math.max(1, s - 1))
                  return false
                }
                return true
              }}
            >
              <input
                id="season"
                readOnly
                value={season}
                aria-label="Temporada"
              />
            </Focusable>
          </div>
          <div className={styles.field}>
            <label htmlFor="episode">Episódio</label>
            <Focusable
              focusKey="EPISODE_EP"
              onEnterPress={() => {
                setEpisode((e) => e + 1)
              }}
              onArrowPress={(dir) => {
                if (dir === 'up') {
                  setEpisode((e) => Math.max(1, e + 1))
                  return false
                }
                if (dir === 'down') {
                  setEpisode((e) => Math.max(1, e - 1))
                  return false
                }
                return true
              }}
            >
              <input
                id="episode"
                readOnly
                value={episode}
                aria-label="Episódio"
              />
            </Focusable>
          </div>
        </div>
        <div className={styles.actions}>
          <Focusable
            focusKey="EPISODE_CONFIRM"
            className={styles.btn}
            onEnterPress={() => {
              onConfirm({ season, episode })
            }}
          >
            Registrar e abrir
          </Focusable>
          <Focusable
            focusKey="EPISODE_SKIP"
            className={cx(styles.btn, styles.btnGhost)}
            onEnterPress={onSkip}
          >
            Pular
          </Focusable>
        </div>
      </Focusable>
    </div>
  )
}
