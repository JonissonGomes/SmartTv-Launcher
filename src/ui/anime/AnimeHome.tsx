import type { AfAnime } from '@/domain/animefire'
import type { AnimeWatchEntry } from '@/store/animeHistory'
import { AnimeHeroBanner } from '@/ui/anime/AnimeHeroBanner'
import { AnimeRow } from '@/ui/anime/AnimeCards'
import { cx } from '@/ui/cx'
import styles from '@/ui/screens/LibraryScreen.module.css'

interface AnimeHomeProps {
  loading: boolean
  highlights: AfAnime[]
  latest: AfAnime[]
  movies: AfAnime[]
  upcoming: AfAnime[]
  continueItems: AnimeWatchEntry[]
  onOpenAnime: (anime: AfAnime) => void
  onPlayContinue: (entry: AnimeWatchEntry) => void
}

export function AnimeHome({
  loading,
  highlights,
  latest,
  movies,
  upcoming,
  continueItems,
  onOpenAnime,
  onPlayContinue,
}: AnimeHomeProps) {
  // Banner: destaques + lançamentos (como o carrossel do site)
  const bannerItems = [...highlights, ...latest]

  return (
    <>
      {loading ? (
        <div className={styles.skeletons}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cx('skeleton', styles.skeletonCard)} />
          ))}
        </div>
      ) : null}

      <AnimeHeroBanner items={bannerItems} onOpen={onOpenAnime} />

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
      <AnimeRow
        id="em-breve"
        title="Em breve"
        items={upcoming.map((a) => ({
          id: a.id,
          name: a.name,
          posterUrl: a.posterUrl,
        }))}
        onSelect={(a) => {
          const full = upcoming.find((h) => h.id === a.id)
          if (full) onOpenAnime(full)
        }}
      />
    </>
  )
}
