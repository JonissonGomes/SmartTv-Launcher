import { describe, expect, it } from 'vitest'
import {
  buildCatalogFromSitePages,
  parseDooPlayHtml,
} from '@/services/dooplayCatalog'

const SAMPLE_HOME = `
<article class="item se tvshows" id="post-1">
  <div class="poster">
    <a href="anime/darling-in-the-franxx/">
      <img src="wp-content/uploads/poster.jpg" alt="Darling in the Franxx Todos os Episodios Online">
    </a>
    <div class="rating"><span class="icon-star2"></span> 7.1</div>
  </div>
  <div class="data"><h3>
    <a href="anime/darling-in-the-franxx/">Darling in the Franxx Todos os Episodios Online</a>
  </h3></div>
</article>
<article class="item se episodes" id="post-2">
  <div class="poster">
    <a href="https://animesonlinecc.to/episodio/black-clover-episodio-170/">
      <img src="https://animesonlinecc.to/wp-content/uploads/ep.jpg" alt="Black Clover Episodio 170">
    </a>
    <span class="quality">Legendado</span>
  </div>
  <div class="eptitle"><h3>
    <a href="https://animesonlinecc.to/episodio/black-clover-episodio-170/">Black Clover Episodio 170</a>
  </h3></div>
</article>
`

describe('parseDooPlayHtml', () => {
  it('extrai animes e episódios com pageUrl e poster absoluto', () => {
    const { animes, episodes } = parseDooPlayHtml(
      SAMPLE_HOME,
      'https://animesonlinecc.to/',
    )

    expect(animes).toHaveLength(1)
    expect(animes[0]?.id).toBe('darling-in-the-franxx')
    expect(animes[0]?.title).toBe('Darling in the Franxx')
    expect(animes[0]?.pageUrl).toBe(
      'https://animesonlinecc.to/anime/darling-in-the-franxx/',
    )
    expect(animes[0]?.poster).toContain('wp-content/uploads/poster.jpg')
    expect(animes[0]?.rating).toBe(7.1)
    expect(animes[0]?.streamUrl).toBe('')

    expect(episodes).toHaveLength(1)
    expect(episodes[0]?.id).toBe('black-clover-episodio-170')
    expect(episodes[0]?.subtitle).toBe('Legendado')
  })

  it('monta fileiras do catálogo a partir das páginas', () => {
    const catalog = buildCatalogFromSitePages(
      [
        { label: 'home', html: SAMPLE_HOME },
        {
          label: 'anime',
          html: `<article class="item tvshows"><div class="poster"><a href="anime/naruto/"><img src="n.jpg" alt="Naruto"></a></div><div class="data"><h3><a href="anime/naruto/">Naruto</a></h3></div></article>`,
        },
      ],
      'https://animesonlinecc.to/',
    )

    expect(catalog).not.toBeNull()
    expect(catalog?.rows.map((r) => r.id)).toEqual([
      'destaques',
      'ultimos-episodios',
      'catalogo',
    ])
    expect(catalog?.rows[0]?.items[0]?.title).toBe('Darling in the Franxx')
  })
})
