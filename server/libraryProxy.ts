import type { Plugin } from 'vite'

const AF_API = 'https://api.animefire.one'

/**
 * Proxy DEV → API AnimeFire (evita CORS no Simulator/browser).
 * POST/GET /api/animefire/* → https://api.animefire.one/*
 */
export function libraryProxyPlugin(): Plugin {
  return {
    name: 'animefire-proxy',
    configureServer(server) {
      server.middlewares.use('/api/animefire', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
          next()
          return
        }
        void (async () => {
          try {
            const url = new URL(req.url ?? '/', 'http://localhost')
            const path = url.pathname.replace(/^\/api\/animefire\/?/, '')
            const upstream = new URL(
              `/${path}${url.search}`.replace(/\/{2,}/g, '/'),
              `${AF_API}/`,
            )

            const chunks: Buffer[] = []
            if (req.method === 'POST') {
              for await (const chunk of req) {
                chunks.push(
                  typeof chunk === 'string' ? Buffer.from(chunk) : chunk,
                )
              }
            }

            const upstreamRes = await fetch(upstream.toString(), {
              method: req.method,
              headers: {
                Accept: 'application/json',
                Origin: 'https://animefire.one',
                Referer: 'https://animefire.one/',
                'User-Agent': 'SmartTv-Launcher-DevProxy/1.0',
                ...(req.method === 'POST'
                  ? { 'Content-Type': 'application/json' }
                  : {}),
              },
              body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
            })
            const buf = Buffer.from(await upstreamRes.arrayBuffer())
            res.statusCode = upstreamRes.status
            const ct = upstreamRes.headers.get('content-type')
            if (ct) res.setHeader('Content-Type', ct)
            res.setHeader('Cache-Control', 'no-store')
            res.end(buf)
          } catch (err) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                message: err instanceof Error ? err.message : 'proxy failed',
              }),
            )
          }
        })()
      })
    },
  }
}
