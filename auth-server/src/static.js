/**
 * Serve SPA do launcher (QR do celular) a partir de auth-server/public.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

/**
 * @param {string} pathname
 */
function safePath(pathname) {
  const decoded = decodeURIComponent(pathname.split('?')[0] ?? '/')
  const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '')
  const full = normalize(join(ROOT, rel))
  if (!full.startsWith(ROOT + sep) && full !== ROOT) return null
  return full
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} pathname
 * @returns {boolean}
 */
export function tryServeStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/ws/') ||
    pathname === '/health' ||
    pathname === '/me'
  ) {
    return false
  }

  if (!existsSync(ROOT)) return false

  let file = safePath(pathname)
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    // SPA fallback
    const index = join(ROOT, 'index.html')
    if (!existsSync(index)) return false
    file = index
  }

  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'
  res.statusCode = 200
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache')
  if (req.method === 'HEAD') {
    res.end()
    return true
  }
  createReadStream(file).pipe(res)
  return true
}

export function publicDirReady() {
  return existsSync(join(ROOT, 'index.html'))
}
