import { AF_GENRES, AF_SECTIONS } from '@/domain/animefire'
import { Focusable } from '@/ui/focus/Focusable'
import styles from '@/ui/screens/LibraryScreen.module.css'

const SECTION_COLORS = [
  'linear-gradient(135deg,#7c2d12,#1c1917)',
  'linear-gradient(135deg,#1e3a8a,#0f172a)',
  'linear-gradient(135deg,#581c87,#111827)',
  'linear-gradient(135deg,#065f46,#022c22)',
]

interface AnimeCatalogHubProps {
  onOpenSection: (path: string, title: string) => void
  onOpenGenre: (genre: string) => void
}

export function AnimeCatalogHub({
  onOpenSection,
  onOpenGenre,
}: AnimeCatalogHubProps) {
  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Categorias</h2>
        <div className={styles.catGrid}>
          {AF_SECTIONS.map((sec, i) => (
            <Focusable
              key={sec.id}
              focusKey={`ANIME_SEC_${sec.id}`}
              className={styles.catTile}
              style={{
                background: SECTION_COLORS[i % SECTION_COLORS.length],
              }}
              onEnterPress={() => {
                onOpenSection(sec.path, sec.title)
              }}
            >
              <div>
                <span className={styles.catTileLabel}>{sec.title}</span>
                <span className={styles.catTileSub}>AnimeFire</span>
              </div>
            </Focusable>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Gêneros</h2>
        <div className={styles.viewport} data-scroll-x="row">
          <div className={styles.scroller}>
            {AF_GENRES.map((g) => (
              <Focusable
                key={g}
                focusKey={`ANIME_GENRE_${g}`}
                className={styles.genreTile}
                onEnterPress={() => {
                  onOpenGenre(g)
                }}
              >
                {g}
              </Focusable>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
