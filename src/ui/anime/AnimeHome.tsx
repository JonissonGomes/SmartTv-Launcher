import type { AfAnime } from '@/domain/animefire'
import type { AnimeWatchEntry } from '@/store/animeHistory'
import { AnimeRow } from '@/ui/anime/AnimeCards'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import styles from '@/ui/screens/LibraryScreen.module.css'

interface AnimeHomeProps {
  loading: boolean
  hero?: AfAnime
  highlights: AfAnime[]
  latest: AfAnime[]
  movies: AfAnime[]
  continueItems: AnimeWatchEntry[]
  onOpenAnime: (anime: AfAnime) => void
  onPlayContinue: (entry: AnimeWatchEntry) => void
}

export function AnimeHome({
  loading,
  hero,
  highlights,
  latest,
  movies,
  continueItems,
  onOpenAnime,
  onPlayContinue,
}: AnimeHomeProps) {
  return (
    <>
      {loading ? (
        <div className={styles.skeletons}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cx('skeleton', styles.skeletonCard)} />
          ))}
        </div>
      ) : null}

      {hero ? (
        <Focusable
          focusKey="ANIME_HERO"
          className={styles.hero}
          onEnterPress={() => {
            onOpenAnime(hero)
          }}
        >
          {hero.backdropUrl || hero.posterUrl ? (
            <img
              className={styles.heroImg}
              src={hero.backdropUrl || hero.posterUrl}
              alt=""
            />
          ) : null}
          <div className={styles.heroFade} />
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{hero.name}</h1>
            <p className={styles.heroMeta}>
              {[hero.year, hero.audio, hero.status].filter(Boolean).join(' · ')}
            </p>
            {hero.synopsis ? (
              <p className={styles.heroSynopsis}>{hero.synopsis}</p>
            ) : null}
            <span className={styles.heroCta}>Ver episódios</span>
          </div>
        </Focusable>
      ) : null}

      {continueItems.length > 0 ? (
        <AnimeRow
          id="continue"
          title="Continuar assistindo"
          items={continueItems.map((e) => ({
            id: e.id,
            name: e.title,
            posterUrl: e.poster,
            subtitle: e.subtitle,
            streamUrl: e.streamUrl,
          }))}
          onSelect={(item) => {
            const entry = continueItems.find((e) => e.id === item.id)
            if (entry) onPlayContinue(entry)
          }}
        />
      ) : null}

      <AnimeRow
        id="destaques"
        title="Destaques"
        items={highlights.map((a) => ({
          id: a.id,
          name: a.name,
          posterUrl: a.posterUrl,
          badge: a.mostLiked ? 'TOP' : undefined,
        }))}
        onSelect={(a) => {
          const full = highlights.find((h) => h.id === a.id)
          if (full) onOpenAnime(full)
        }}
      />
      <AnimeRow
        id="lancamentos"
        title="Últimos lançamentos"
        items={latest.map((a) => ({
          id: a.id,
          name: a.name,
          posterUrl: a.posterUrl,
        }))}
        onSelect={(a) => {
          const full = latest.find((h) => h.id === a.id)
          if (full) onOpenAnime(full)
        }}
      />
      <AnimeRow
        id="filmes"
        title="Filmes"
        items={movies.map((a) => ({
          id: a.id,
          name: a.name,
          posterUrl: a.posterUrl,
        }))}
        onSelect={(a) => {
          const full = movies.find((h) => h.id === a.id)
          if (full) onOpenAnime(full)
        }}
      />
    </>
  )
}
