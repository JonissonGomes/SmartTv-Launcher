import { useEffect, useMemo, useState } from 'react'
import type { AfAnime } from '@/domain/animefire'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from '@/ui/screens/LibraryScreen.module.css'

const ROLL_MS = 5500
const MAX_SLIDES = 10

interface AnimeHeroBannerProps {
  items: AfAnime[]
  onOpen: (anime: AfAnime) => void
}

/** Banner em carrossel: auto-roll + Left/Right no D-pad (sem setas na UI). */
export function AnimeHeroBanner({ items, onOpen }: AnimeHeroBannerProps) {
  const slides = useMemo(() => {
    const seen = new Set<string>()
    const out: AfAnime[] = []
    for (const a of items) {
      if (!a.id || seen.has(a.id)) continue
      if (!a.backdropUrl && !a.posterUrl) continue
      seen.add(a.id)
      out.push(a)
      if (out.length >= MAX_SLIDES) break
    }
    return out
  }, [items])

  const [index, setIndex] = useState(0)
  const [hoverPaused, setHoverPaused] = useState(false)

  useEffect(() => {
    setIndex(0)
  }, [slides])

  useEffect(() => {
    if (slides.length < 2 || hoverPaused) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, ROLL_MS)
    return () => {
      window.clearInterval(id)
    }
  }, [slides.length, hoverPaused, index])

  if (slides.length === 0) return null

  const current = slides[Math.min(index, slides.length - 1)]!
  const go = (delta: number) => {
    const len = slides.length
    setIndex((i) => ((i + delta) % len + len) % len)
  }

  return (
    <section
      className={styles.heroBanner}
      onMouseEnter={() => {
        setHoverPaused(true)
      }}
      onMouseLeave={() => {
        setHoverPaused(false)
      }}
    >
      <Focusable
        focusKey="ANIME_HERO"
        className={styles.hero}
        onEnterPress={() => {
          onOpen(current)
        }}
        onArrowPress={(direction) => {
          if (slides.length < 2) return true
          if (direction === 'left') {
            go(-1)
            return false
          }
          if (direction === 'right') {
            go(1)
            return false
          }
          return true
        }}
      >
        {slides.map((slide, i) => {
          const src = slide.backdropUrl || slide.posterUrl
          if (!src) return null
          return (
            <img
              key={slide.id}
              className={cx(
                styles.heroImg,
                i === index && styles.heroImgActive,
              )}
              src={src}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          )
        })}
        <div className={styles.heroFade} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{current.name}</h1>
          <p className={styles.heroMeta}>
            {[current.year, current.audio, current.status]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {current.synopsis ? (
            <p className={styles.heroSynopsis}>{current.synopsis}</p>
          ) : null}
          <span className={styles.heroCta}>Ver episódios</span>
        </div>
      </Focusable>

      {slides.length > 1 ? (
        <div className={styles.heroDots} aria-hidden>
          {slides.map((s, i) => (
            <span
              key={s.id}
              className={cx(styles.heroDot, i === index && styles.heroDotActive)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
