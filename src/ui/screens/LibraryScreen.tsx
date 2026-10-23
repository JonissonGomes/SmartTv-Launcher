import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useState } from 'react'
import { pushBackHandler } from '@/ui/input/backStack'
import type { AfAnime, AfAudioFilter, AfEpisode, AfSeason } from '@/domain/animefire'
import {
  AF_AUDIO_FILTERS,
  AF_GENRES,
  pickAfStream,
} from '@/domain/animefire'
import {
  fetchAfAnimeDetail,
  fetchAfAnimesCatalog,
  fetchAfEpisodeStreams,
  fetchAfHome,
  fetchAfLancamentos,
  fetchAfSection,
  searchAfAnimes,
} from '@/services/animefire'
import { useAnimeHistoryStore } from '@/store/animeHistory'
import { useUiSessionStore } from '@/store/uiSession'
import { AnimeCatalogHub } from '@/ui/anime/AnimeCatalogHub'
import { PosterGrid } from '@/ui/anime/AnimeCards'
import { AnimeDetail } from '@/ui/anime/AnimeDetail'
import { AnimeHome } from '@/ui/anime/AnimeHome'
import { AnimeGridSkeleton } from '@/ui/anime/AnimeSkeletons'
import { cx } from '@/ui/cx'
import { Focusable } from '@/ui/focus/Focusable'
import { TvTextField } from '@/ui/input/TvTextField'
import { VideoPlayer } from '@/ui/media/VideoPlayer'
import styles from './LibraryScreen.module.css'

type Tab = 'home' | 'catalog' | 'releases' | 'search'
type Phase = 'home' | 'catalog' | 'search' | 'category'

/** Catálogo AnimeFire — Início / Catálogo / Lançamentos / Busca. */
export function LibraryScreen() {
  const recordWatch = useAnimeHistoryStore((s) => s.recordWatch)
  const updateProgress = useAnimeHistoryStore((s) => s.updateProgress)
  const entries = useAnimeHistoryStore((s) => s.entries)
  const animeDeepLinkTitle = useUiSessionStore((s) => s.animeDeepLinkTitle)
  const setAnimeDeepLinkTitle = useUiSessionStore((s) => s.setAnimeDeepLinkTitle)

  const [tab, setTab] = useState<Tab>('home')
  const [phase, setPhase] = useState<Phase>('home')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const [highlights, setHighlights] = useState<AfAnime[]>([])
  const [latest, setLatest] = useState<AfAnime[]>([])
  const [movies, setMovies] = useState<AfAnime[]>([])
  const [upcoming, setUpcoming] = useState<AfAnime[]>([])

  const [sectionTitle, setSectionTitle] = useState('')
  const [sectionItems, setSectionItems] = useState<AfAnime[]>([])
  const [sectionExtraTitle, setSectionExtraTitle] = useState('')
  const [sectionExtraItems, setSectionExtraItems] = useState<AfAnime[]>([])

  const [query, setQuery] = useState('')
  const [audioFilter, setAudioFilter] = useState<AfAudioFilter>('')
  const [genreFilter, setGenreFilter] = useState('')
  const [searchItems, setSearchItems] = useState<AfAnime[]>([])
  const [searching, setSearching] = useState(false)

  const [detailAnime, setDetailAnime] = useState<AfAnime | null>(null)
  const [detailEps, setDetailEps] = useState<AfEpisode[]>([])
  const [seasons, setSeasons] = useState<AfSeason[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [seasonFilter, setSeasonFilter] = useState<number | 'all'>('all')

  const [playing, setPlaying] = useState<{
    title: string
    subtitle?: string
    src: string
    poster?: string
    anime?: AfAnime
    episodeId?: string
    episodes?: AfEpisode[]
    watchId?: string
    startAt?: number
  } | null>(null)

  const continueItems = useMemo(
    () =>
      [...entries]
        .sort(
          (a, b) =>
            new Date(b.lastWatchedAt).getTime() -
            new Date(a.lastWatchedAt).getTime(),
        )
        .slice(0, 12),
    [entries],
  )

  const loadHome = async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft ?? highlights.length > 0
    if (!soft) setLoading(true)
    setError(undefined)
    try {
      const home = await fetchAfHome()
      setHighlights(home.highlights)
      setLatest(home.latest)
      setMovies(home.movies)
      setUpcoming(home.upcoming)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar')
    } finally {
      setLoading(false)
      if (!soft) {
        window.requestAnimationFrame(() => {
          void setFocus('ANIME_TAB_home')
        })
      }
    }
  }

  useEffect(() => {
    void loadHome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep link: Assistir no AnimeFire a partir da home
  useEffect(() => {
    if (!animeDeepLinkTitle) return
    const q = animeDeepLinkTitle
    setAnimeDeepLinkTitle(null)
    setTab('search')
    setPhase('search')
    setQuery(q)
    window.requestAnimationFrame(() => {
      void setFocus('ANIME_SEARCH')
    })
  }, [animeDeepLinkTitle, setAnimeDeepLinkTitle])

  // Back: player → detalhe → categoria → (deixa o App voltar de tela)
  useEffect(() => {
    return pushBackHandler(() => {
      if (playing) {
        setPlaying(null)
        void setFocus(
          detailAnime ? 'ANIME_RAIL_CLOSE' : 'ANIME_TAB_home',
        )
        return true
      }
      if (detailAnime) {
        closeDetail()
        void setFocus('VIEW_anime')
        return true
      }
      if (phase === 'category' && tab !== 'releases') {
        goTab('catalog')
        return true
      }
      if (phase === 'category' && tab === 'releases') {
        goTab('home')
        return true
      }
      return false
    })
  }, [playing, detailAnime, phase, tab])

  useEffect(() => {
    if (phase !== 'search') return
    const q = query.trim()
    const hasFilter = Boolean(audioFilter || genreFilter)
    if (q.length < 2 && !hasFilter) {
      setSearchItems([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(() => {
      void searchAfAnimes({
        q: q.length >= 2 ? q : undefined,
        audio: audioFilter || undefined,
        genre: genreFilter || undefined,
      })
        .then((items) => {
          if (!cancelled) setSearchItems(items)
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Busca falhou')
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, audioFilter, genreFilter, phase])

  const goTab = (next: Tab) => {
    setTab(next)
    setError(undefined)
    closeDetail()
    if (next === 'releases') {
      void openSection('/animes/lancamentos', 'Lançamentos', 'releases')
      return
    }
    setPhase(next)
    window.requestAnimationFrame(() => {
      void setFocus(`ANIME_TAB_${next}`)
    })
  }

  const openAnime = async (anime: AfAnime) => {
    setDetailAnime(anime)
    setDetailLoading(true)
    setDetailEps([])
    setSeasons([])
    setSeasonFilter('all')
    setError(undefined)
    try {
      const detail = await fetchAfAnimeDetail(anime.id)
      setDetailAnime(detail.anime)
      setDetailEps(detail.episodes)
      setSeasons(detail.seasons)
      window.requestAnimationFrame(() => {
        void setFocus('ANIME_RAIL_CLOSE')
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no detalhe')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailAnime(null)
    setDetailEps([])
    setSeasons([])
  }

  const openSection = async (
    path: string,
    title: string,
    originTab: Tab = 'catalog',
  ) => {
    setTab(originTab)
    setSectionTitle(title)
    setSectionExtraTitle('')
    setSectionExtraItems([])
    setPhase('category')
    setLoading(true)
    setError(undefined)
    closeDetail()
    try {
      if (path === '/animes' || path.endsWith('/animes')) {
        // Igual https://animefire.one/animes
        setSectionItems(await fetchAfAnimesCatalog())
      } else if (path.includes('lancamentos')) {
        // Igual https://animefire.one/animes/lancamentos
        const lanc = await fetchAfLancamentos()
        setSectionItems(lanc.animes)
        setSectionExtraTitle(
          `${lanc.upcomingTitle} — ${lanc.upcomingSub}`,
        )
        setSectionExtraItems(lanc.upcoming)
      } else {
        setSectionItems(await fetchAfSection(path))
      }
      window.requestAnimationFrame(() => {
        void setFocus(
          originTab === 'releases' ? 'ANIME_TAB_releases' : 'ANIME_CAT_BACK',
        )
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na categoria')
    } finally {
      setLoading(false)
    }
  }

  const openGenre = async (genre: string) => {
    setTab('catalog')
    setSectionTitle(genre)
    setSectionExtraTitle('')
    setSectionExtraItems([])
    setPhase('category')
    setLoading(true)
    setError(undefined)
    closeDetail()
    try {
      const items = await searchAfAnimes({ genre })
      setSectionItems(items)
      window.requestAnimationFrame(() => {
        void setFocus('ANIME_CAT_BACK')
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no gênero')
    } finally {
      setLoading(false)
    }
  }

  const playEpisode = async (
    ep: AfEpisode,
    anime: AfAnime,
    playlist: AfEpisode[] = detailEps,
  ) => {
    setError(undefined)
    try {
      const streams = await fetchAfEpisodeStreams(ep.id)
      const src = pickAfStream(streams)
      if (!src) {
        setError('Episódio sem stream disponível')
        return
      }
      const watchId = `${anime.id}-${ep.id}`
      recordWatch({
        id: watchId,
        title: anime.name,
        subtitle: `T${ep.season} E${ep.number} — ${ep.title}`,
        poster: ep.stillUrl || anime.posterUrl,
        streamUrl: src,
        animeId: anime.id,
        episodeId: ep.id,
      })
      setPlaying({
        title: anime.name,
        subtitle: `T${ep.season} E${ep.number} — ${ep.title}`,
        src,
        poster: ep.stillUrl || anime.posterUrl,
        anime,
        episodeId: ep.id,
        episodes: playlist.length > 0 ? playlist : [ep],
        watchId,
        startAt: 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir stream')
    }
  }

  if (playing) {
    const playlist = playing.episodes ?? []
    const epIndex = playlist.findIndex((e) => e.id === playing.episodeId)
    const hasPrev = epIndex > 0
    const hasNext = epIndex >= 0 && epIndex < playlist.length - 1

    return (
      <VideoPlayer
        title={playing.title}
        subtitle={playing.subtitle}
        src={playing.src}
        poster={playing.poster}
        startAt={playing.startAt}
        episodeId={playing.episodeId}
        episodes={playlist.map((e) => ({
          id: e.id,
          label: `T${e.season} E${e.number} — ${e.title}`,
          audio: e.audio,
          season: e.season,
        }))}
        hasPrevEpisode={hasPrev}
        hasNextEpisode={hasNext}
        onProgress={
          playing.watchId
            ? (t, d) => {
                updateProgress(playing.watchId!, t, d)
              }
            : undefined
        }
        onPrevEpisode={
          hasPrev && playing.anime
            ? () => {
                void playEpisode(
                  playlist[epIndex - 1]!,
                  playing.anime!,
                  playlist,
                )
              }
            : undefined
        }
        onNextEpisode={
          hasNext && playing.anime
            ? () => {
                void playEpisode(
                  playlist[epIndex + 1]!,
                  playing.anime!,
                  playlist,
                )
              }
            : undefined
        }
        onSelectEpisode={
          playlist.length > 0
            ? (id) => {
                const ep = playlist.find((e) => e.id === id)
                const anime = playing.anime ?? detailAnime
                if (ep && anime) void playEpisode(ep, anime, playlist)
              }
            : undefined
        }
        onClose={() => {
          const el = document.querySelector('video')
          if (playing.watchId && el instanceof HTMLVideoElement) {
            updateProgress(playing.watchId, el.currentTime, el.duration)
          }
          setPlaying(null)
          void setFocus(
            detailAnime ? 'ANIME_RAIL_CLOSE' : 'ANIME_TAB_home',
          )
        }}
      />
    )
  }

  const detailOpen = Boolean(detailAnime)

  return (
    <Focusable
      focusKey="VIEW_anime"
      className={cx(styles.screen, detailOpen && styles.screenWithRail)}
      saveLastFocusedChild
    >
      <div className={styles.mainCol}>
        <header className={styles.topNav}>
          <span className={styles.brand}>AnimeFire</span>
          <nav className={styles.tabs}>
            {(
              [
                ['home', 'Início'],
                ['catalog', 'Catálogo'],
                ['releases', 'Lançamentos'],
                ['search', 'Busca'],
              ] as const
            ).map(([id, label]) => (
              <Focusable
                key={id}
                focusKey={`ANIME_TAB_${id}`}
                className={cx(styles.tab, tab === id && styles.tabActive)}
                onEnterPress={() => {
                  goTab(id)
                }}
              >
                {label}
              </Focusable>
            ))}
          </nav>
          <Focusable
            focusKey="ANIME_REFRESH"
            className={styles.btnGhost}
            onEnterPress={() => {
              void loadHome()
            }}
          >
            Atualizar
          </Focusable>
        </header>

        <div className={styles.body} data-scroll-y="catalog">
          {error ? <p className={styles.error}>{error}</p> : null}

          {phase === 'home' ? (
            <AnimeHome
              loading={loading}
              highlights={highlights}
              latest={latest}
              movies={movies}
              upcoming={upcoming}
              continueItems={continueItems}
              onOpenAnime={(a) => {
                void openAnime(a)
              }}
              onPlayContinue={(entry) => {
                void (async () => {
                  let anime = detailAnime ?? undefined
                  let episodes = detailEps
                  if (entry.animeId) {
                    try {
                      const detail = await fetchAfAnimeDetail(entry.animeId)
                      anime = detail.anime
                      episodes = detail.episodes
                    } catch {
                      // segue só com o stream salvo
                    }
                  }
                  setPlaying({
                    title: entry.title,
                    subtitle: entry.subtitle,
                    src: entry.streamUrl,
                    poster: entry.poster,
                    watchId: entry.id,
                    episodeId: entry.episodeId,
                    startAt: entry.currentTime ?? 0,
                    anime,
                    episodes:
                      episodes.length > 0
                        ? episodes
                        : entry.episodeId
                          ? [
                              {
                                id: entry.episodeId,
                                title: entry.subtitle ?? entry.title,
                                season: 1,
                                number: 1,
                              },
                            ]
                          : [],
                  })
                })()
              }}
            />
          ) : null}

          {phase === 'catalog' ? (
            <AnimeCatalogHub
              highlights={highlights}
              latest={latest}
              movies={movies}
              upcoming={upcoming}
              onOpenSection={(path, title) => {
                void openSection(path, title)
              }}
              onOpenGenre={(genre) => {
                void openGenre(genre)
              }}
            />
          ) : null}

          {phase === 'search' ? (
            <>
              <div className={styles.searchBar}>
                <TvTextField
                  focusKey="ANIME_SEARCH"
                  label="Buscar animes"
                  value={query}
                  onChange={setQuery}
                  placeholder="Nome do anime…"
                  inputType="search"
                  maxLength={80}
                />
              </div>
              <div className={styles.chips}>
                {AF_AUDIO_FILTERS.map((f) => (
                  <Focusable
                    key={`audio-${f.id || 'all'}`}
                    focusKey={`ANIME_AUDIO_${f.id || 'all'}`}
                    className={cx(
                      styles.chip,
                      audioFilter === f.id && styles.chipActive,
                    )}
                    onEnterPress={() => {
                      setAudioFilter(f.id)
                    }}
                  >
                    {f.label}
                  </Focusable>
                ))}
              </div>
              <div className={styles.chips}>
                <Focusable
                  focusKey="ANIME_GENRE_clear"
                  className={cx(
                    styles.chip,
                    !genreFilter && styles.chipActive,
                  )}
                  onEnterPress={() => {
                    setGenreFilter('')
                  }}
                >
                  Todos gêneros
                </Focusable>
                {AF_GENRES.map((g) => (
                  <Focusable
                    key={g}
                    focusKey={`ANIME_SFILTER_${g}`}
                    className={cx(
                      styles.chip,
                      genreFilter === g && styles.chipActive,
                    )}
                    onEnterPress={() => {
                      setGenreFilter(g)
                    }}
                  >
                    {g}
                  </Focusable>
                ))}
              </div>
              {searching ? (
                <AnimeGridSkeleton count={12} />
              ) : (
                <>
                  <p className={styles.hint}>
                    {query.trim().length < 2 && !audioFilter && !genreFilter
                      ? 'Digite ao menos 2 letras ou escolha um filtro'
                      : `${String(searchItems.length)} resultado(s)`}
                  </p>
                  <PosterGrid
                    id="search"
                    items={searchItems}
                    onSelect={(a) => {
                      void openAnime(a)
                    }}
                  />
                </>
              )}
            </>
          ) : null}

          {phase === 'category' ? (
            <>
              {tab !== 'releases' ? (
                <Focusable
                  focusKey="ANIME_CAT_BACK"
                  className={styles.backBtn}
                  onEnterPress={() => {
                    goTab('catalog')
                  }}
                >
                  ← Catálogo
                </Focusable>
              ) : null}
              <h2 className={styles.sectionTitle}>
                {sectionTitle}
                {!loading ? ` · ${String(sectionItems.length)}` : ''}
              </h2>
              {loading ? (
                <AnimeGridSkeleton count={20} />
              ) : (
                <>
                  <PosterGrid
                    id="category"
                    items={sectionItems}
                    onSelect={(a) => {
                      void openAnime(a)
                    }}
                  />
                  {sectionExtraItems.length > 0 ? (
                    <>
                      <h2 className={styles.sectionTitle}>
                        {sectionExtraTitle}
                      </h2>
                      <PosterGrid
                        id="category-extra"
                        items={sectionExtraItems}
                        onSelect={(a) => {
                          void openAnime(a)
                        }}
                      />
                    </>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>
      </div>

      {detailAnime ? (
        <aside className={styles.detailRail} data-scroll-y="detail">
          <AnimeDetail
            anime={detailAnime}
            episodes={detailEps}
            seasons={seasons}
            seasonFilter={seasonFilter}
            loading={detailLoading}
            onBack={closeDetail}
            onSeasonFilter={setSeasonFilter}
            onPlayEpisode={(ep) => {
              void playEpisode(ep, detailAnime)
            }}
          />
        </aside>
      ) : null}
    </Focusable>
  )
}
