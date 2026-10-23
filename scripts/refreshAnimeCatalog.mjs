/**
 * Atualiza public/library/catalog.json a partir do HTML do site.
 * Uso: node scripts/refreshAnimeCatalog.mjs [baseUrl]
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const base = (process.argv[2] || 'https://animesonlinecc.to').replace(/\/?$/, '/')

const TITLE_NOISE =
  /\s*(todos os episodios online|todos os episódios online|online grátis|online gratis)\s*$/gi

function cleanTitle(raw) {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(TITLE_NOISE, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function absolutize(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

function slugId(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '')
    return path.split('/').filter(Boolean).pop() || url
  } catch {
    return url
  }
}

function parse(html, baseUrl) {
  const animes = []
  const episodes = []
  const seen = new Set()
  const articleRe =
    /<article[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
  let match
  while ((match = articleRe.exec(html))) {
    const block = match[1]
    const linkMatch =
      /<a[^>]+href=["']([^"']+)["'][^>]*>\s*<img[^>]+>/i.exec(block) ||
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
    const imgTag = imgMatch?.[0] || ''
    const src =
      /src\s*=\s*["']([^"']*)["']/i.exec(imgTag)?.[1] ||
      /data-src\s*=\s*["']([^"']*)["']/i.exec(imgTag)?.[1]
    const poster = src ? absolutize(src, baseUrl) : undefined
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(imgTag)?.[1]
    const h3 =
      /<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i.exec(block)?.[1]?.replace(
        /<[^>]+>/g,
        '',
      ) || alt
    const title = cleanTitle(h3 || id)
    if (!title) continue
    const quality = /class=["']quality["'][^>]*>([\s\S]*?)<\//i
      .exec(block)?.[1]
      ?.replace(/<[^>]+>/g, '')
    const ratingRaw = /class=["']rating["'][^>]*>[\s\S]*?<\/span>\s*([\d.]+)/i.exec(
      block,
    )?.[1]
    const item = {
      id,
      title,
      subtitle: quality ? cleanTitle(quality) : undefined,
      poster,
      streamUrl: '',
      pageUrl,
      rating: ratingRaw ? Number.parseFloat(ratingRaw) : undefined,
    }
    if (/\/episodio\//i.test(pageUrl) || /\bepisodes\b/i.test(match[0])) {
      episodes.push(item)
    } else {
      animes.push(item)
    }
  }
  return { animes, episodes }
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'SmartTv-Launcher-Catalog/1.0',
    },
  })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.text()
}

const pages = await Promise.all([
  fetchHtml(base).then((html) => ({ label: 'home', html })),
  fetchHtml(new URL('episodio/', base).toString()).then((html) => ({
    label: 'episodes',
    html,
  })),
  fetchHtml(new URL('anime/', base).toString()).then((html) => ({
    label: 'anime',
    html,
  })),
])

const featured = []
const latestEps = []
const catalog = []
const seenAnime = new Set()
const seenEp = new Set()

for (const page of pages) {
  const { animes, episodes } = parse(page.html, base)
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
    for (const e of episodes.length ? episodes : animes) {
      if (seenEp.has(e.id)) continue
      seenEp.add(e.id)
      latestEps.push(e)
    }
    continue
  }
  const listSeen = new Set()
  for (const a of animes) {
    if (listSeen.has(a.id)) continue
    listSeen.add(a.id)
    catalog.push(a)
  }
}

function stripUndef(obj) {
  return JSON.parse(JSON.stringify(obj))
}

const out = {
  version: 1,
  title: 'Animes',
  updatedAt: new Date().toISOString().slice(0, 10),
  rows: [
    { id: 'destaques', title: 'Destaques', items: featured.slice(0, 24) },
    {
      id: 'ultimos-episodios',
      title: 'Últimos episódios',
      items: latestEps.slice(0, 30),
    },
    { id: 'catalogo', title: 'Lista de animes', items: catalog.slice(0, 40) },
  ].filter((r) => r.items.length > 0),
}

const dest = resolve(__dirname, '../public/library/catalog.json')
writeFileSync(dest, `${JSON.stringify(stripUndef(out), null, 2)}\n`, 'utf8')
console.log(
  `OK ${dest} — ${out.rows.map((r) => `${r.id}:${r.items.length}`).join(', ')}`,
)
