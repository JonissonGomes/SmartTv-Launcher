import type { AfAnime } from '@/domain/animefire'
import type { AnimeWatchEntry } from '@/store/animeHistory'
import { AnimeHeroBanner } from '@/ui/anime/AnimeHeroBanner'
import { AnimeRow } from '@/ui/anime/AnimeCards'
import { AnimeHomeSkeleton } from '@/ui/anime/AnimeSkeletons'

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
  const bannerItems = [...highlights, ...latest]

  if (loading && highlights.length === 0 && latest.length === 0) {
    return <AnimeHomeSkeleton />
  }

  const firstBelowKey =
    continueItems[0]
      ? `ANIME_ROW_continue_${continueItems[0].id}`
      : highlights[0]
        ? `ANIME_ROW_destaques_${highlights[0].id}`
        : latest[0]
          ? `ANIME_ROW_lancamentos_${latest[0].id}`
          : undefined

  return (
    <>
      <AnimeHeroBanner
        items={bannerItems}
        onOpen={onOpenAnime}
        downFocusKey={firstBelowKey}
      />

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
