import {
  BookOpen,
  Clapperboard,
  Compass,
  Ghost,
  Heart,
  Laugh,
  Library,
  Orbit,
  Sparkles,
  Swords,
  Theater,
  Timer,
  Zap,
} from 'lucide-react'

const SIZE = 44
const GENRE_SIZE = 34

/** Ícones Lucide para tiles de catálogo/gênero (mesma família do player). */
export function SectionIcon({ id }: { id: string }) {
  const props = {
    size: SIZE,
    strokeWidth: 2.1,
    absoluteStrokeWidth: true,
    'aria-hidden': true as const,
  }
  switch (id) {
    case 'filmes':
      return <Clapperboard {...props} />
    case 'em-breve':
      return <Timer {...props} />
    default:
      return <Library {...props} />
  }
}

export function GenreIcon({ genre }: { genre: string }) {
  const props = {
    size: GENRE_SIZE,
    strokeWidth: 2.15,
    absoluteStrokeWidth: true,
    'aria-hidden': true as const,
  }
  const g = genre.toLowerCase()
  if (g.includes('ação') || g.includes('acao')) return <Swords {...props} />
  if (g.includes('aventura')) return <Compass {...props} />
  if (g.includes('comédia') || g.includes('comedia')) return <Laugh {...props} />
  if (g.includes('drama')) return <Theater {...props} />
  if (g.includes('fantasia')) return <Sparkles {...props} />
  if (g.includes('romance')) return <Heart {...props} />
  if (g.includes('terror')) return <Ghost {...props} />
  if (g.includes('sci')) return <Orbit {...props} />
  if (g.includes('shounen')) return <Zap {...props} />
  return <BookOpen {...props} />
}
