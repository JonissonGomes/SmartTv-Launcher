import type { Plugin } from 'vite'

const DEFAULT_UPSTREAM = 'http://127.0.0.1:8787'

/**
 * Dev: /api/auth/* → auth-server (Render local).
 * Em produção na TV, o cliente usa VITE_AUTH_API_URL absoluto.
 */
export function authProxyPlugin(): Plugin {
  const upstream = (
    process.env.AUTH_API_UPSTREAM ||
    process.env.VITE_AUTH_API_URL ||
    DEFAULT_UPSTREAM
  ).replace(/\/+$/, '')

  return {
    name: 'smarttv-auth-proxy',
    configureServer(server) {
      server.middlewares.use('/api/auth', (req, res, next) => {
        if (
          req.method !== 'GET' &&
          req.method !== 'HEAD' &&
          req.method !== 'POST' &&
          req.method !== 'OPTIONS'
        ) {
          next()
          return
        }

        void (async () => {
          try {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
              res.setHeader(
                'Access-Control-Allow-Headers',
                'Content-Type, Authorization',
              )
              res.end()
              return
            }

            const url = new URL(req.url ?? '/', 'http://localhost')
            const path = url.pathname.replace(/^\/+/, '')
            const target = `${upstream}/auth/${path}${url.search}`

            const chunks: Buffer[] = []
            if (req.method === 'POST') {
              for await (const chunk of req) {
                chunks.push(
                  typeof chunk === 'string' ? Buffer.from(chunk) : chunk,
                )
              }
            }

            const headers: Record<string, string> = {
              Accept: 'application/json',
            }
            const auth = req.headers.authorization
            if (typeof auth === 'string') headers.Authorization = auth
            if (req.method === 'POST') {
              headers['Content-Type'] = 'application/json'
            }

            const upstreamRes = await fetch(target, {
              method: req.method,
              headers,
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
                error: 'auth_proxy_failed',
                message:
                  err instanceof Error
                    ? err.message
                    : 'auth-server indisponível (rode npm run auth:dev)',
              }),
            )
          }
        })()
      })
    },
  }
}
