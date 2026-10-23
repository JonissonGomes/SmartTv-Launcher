import type { Plugin } from 'vite'

/**
 * Proxy DEV → site do catálogo (evita CORS no Simulator/browser).
 * GET /api/library-site/<path> → https://animesonlinecc.to/<path>
 */
export function libraryProxyPlugin(
  target = 'https://animesonlinecc.to',
): Plugin {
  return {
    name: 'library-site-proxy',
    configureServer(server) {
      server.middlewares.use('/api/library-site', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next()
          return
        }
        void (async () => {
          try {
            const url = new URL(req.url ?? '/', 'http://localhost')
            const path = url.pathname.replace(/^\/api\/library-site\/?/, '')
            const upstream = new URL(
              path + url.search,
              target.endsWith('/') ? target : `${target}/`,
            )
            const upstreamRes = await fetch(upstream.toString(), {
              headers: {
                Accept: req.headers.accept ?? 'text/html,application/json',
                'User-Agent': 'SmartTv-Launcher-DevProxy/1.0',
              },
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
                error: err instanceof Error ? err.message : 'proxy failed',
              }),
            )
          }
        })()
      })
    },
  }
}
