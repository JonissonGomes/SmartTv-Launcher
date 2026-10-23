import type { LibraryCatalog, LibraryItem, LibraryRow } from '@/domain/library'

const TITLE_NOISE =
  /\s*(todos os episodios online|todos os episódios online|online grátis|online gratis)\s*$/gi

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) =>
      String.fromCharCode(Number.parseInt(n, 10)),
    )
}

function cleanTitle(raw: string): string {
  return decodeEntities(raw)
    .replace(TITLE_NOISE, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function absolutize(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

function slugId(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '')
    const leaf = path.split('/').filter(Boolean).pop() ?? path
    return leaf || url
  } catch {
    return url
  }
}

function attr(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')
  const m = re.exec(tag)
  return m?.[1]
}

/** Extrai cards DooPlay (`<article class="item …">`) de HTML do site. */
export function parseDooPlayHtml(
  html: string,
  baseUrl: string,
): { animes: LibraryItem[]; episodes: LibraryItem[] } {
  const animes: LibraryItem[] = []
  const episodes: LibraryItem[] = []
  const seen = new Set<string>()

  const articleRe =
    /<article[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
  let match: RegExpExecArray | null

  while ((match = articleRe.exec(html)) !== null) {
    const block = match[1] ?? ''
    const linkMatch =
      /<a[^>]+href=["']([^"']+)["'][^>]*>\s*<img[^>]+>/i.exec(block) ??
      /<h3[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(
        block,
      )
    if (!linkMatch?.[1]) continue

    const pageUrl = absolutize(linkMatch[1], baseUrl)
    if (!pageUrl) continue

    const id = slugId(pageUrl)
    if (seen.has(id)) continue
    seen.add(id)

    const imgMatch = /<img[^>]+>/i.exec(block)
    const imgTag = imgMatch?.[0] ?? ''
    const posterSrc = attr(imgTag, 'src') ?? attr(imgTag, 'data-src')
    const poster = posterSrc ? absolutize(posterSrc, baseUrl) ?? undefined : undefined

    const titleFromLink =
      linkMatch[2] != null
        ? linkMatch[2].replace(/<[^>]+>/g, '')
        : undefined
    const titleFromAlt = attr(imgTag, 'alt')
    const h3Match =
      /<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i.exec(block) ??
      /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(block)
    const titleRaw =
      titleFromLink ||
      (h3Match?.[1] ? h3Match[1].replace(/<[^>]+>/g, '') : undefined) ||
      titleFromAlt ||
      id
    const title = cleanTitle(titleRaw)
    if (!title) continue

    const qualityMatch = /class=["']quality["'][^>]*>([\s\S]*?)<\//i.exec(block)
    const subtitle = qualityMatch?.[1]
      ? cleanTitle(qualityMatch[1].replace(/<[^>]+>/g, ''))
      : undefined

    const ratingMatch = /class=["']rating["'][^>]*>[\s\S]*?<\/span>\s*([\d.]+)/i.exec(
      block,
    )
    const rating = ratingMatch?.[1]
      ? Number.parseFloat(ratingMatch[1])
      : undefined

    const item: LibraryItem = {
      id,
      title,
      subtitle,
      poster,
      streamUrl: '',
      pageUrl,
      rating: Number.isFinite(rating) ? rating : undefined,
    }

    if (/\/episodio\//i.test(pageUrl) || /\bepisodes\b/i.test(match[0] ?? '')) {
      episodes.push(item)
    } else {
      animes.push(item)
    }
  }

  return { animes, episodes }
}

function row(id: string, title: string, items: LibraryItem[]): LibraryRow | null {
  if (items.length === 0) return null
  return { id, title, items }
}

/** Monta catálogo a partir de HTMLs do site (home + listas). */
export function buildCatalogFromSitePages(
  pages: { label: string; html: string }[],
  baseUrl: string,
): LibraryCatalog | null {
  const featured: LibraryItem[] = []
  const latestEps: LibraryItem[] = []
  const catalog: LibraryItem[] = []
  const seenAnime = new Set<string>()
  const seenEp = new Set<string>()

  for (const page of pages) {
    const { animes, episodes } = parseDooPlayHtml(page.html, baseUrl)

    if (page.label === 'home') {
      for (const a of animes) {
        if (seenAnime.has(a.id)) continue
        seenAnime.add(a.id)
        featured.push(a)
      }
      for (const e of episodes) {
        if (seenEp.has(e.id)) continue
        seenEp.add(e.id)
        latestEps.push(e)
      }
      continue
    }

    if (page.label === 'episodes') {
      for (const e of episodes.length > 0 ? episodes : animes) {
        if (seenEp.has(e.id)) continue
        seenEp.add(e.id)
        latestEps.push(e)
      }
      continue
    }

    // Lista completa da página /anime/ (pode repetir destaques — fileiras distintas)
    const listSeen = new Set<string>()
    for (const a of animes) {
      if (listSeen.has(a.id)) continue
      listSeen.add(a.id)
      catalog.push(a)
    }
  }

  const rows = [
    row('destaques', 'Destaques', featured.slice(0, 24)),
    row('ultimos-episodios', 'Últimos episódios', latestEps.slice(0, 30)),
    row('catalogo', 'Lista de animes', catalog.slice(0, 40)),
  ].filter((r): r is LibraryRow => r != null)

  if (rows.length === 0) return null

  return {
    version: 1,
    title: 'Animes',
    updatedAt: new Date().toISOString().slice(0, 10),
    rows,
  }
}
