import { createServer } from 'node:http'
import { assertRuntimeConfig, config } from './config.js'
import { applyCors, sendJson } from './http.js'
import { handleAuthRoute } from './routes.js'

assertRuntimeConfig()

const server = createServer((req, res) => {
  applyCors(req, res, config.corsOrigin)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.url ?? '/', `http://${host}`)
  // Aceita /auth/* e /api/auth/* (proxy Vite)
  let pathname = url.pathname
  if (pathname.startsWith('/api/auth')) {
    pathname = pathname.slice('/api'.length) || '/'
  }

  void handleAuthRoute(req, res, pathname).then((handled) => {
    if (!handled) {
      sendJson(res, 404, { error: 'not_found', message: 'rota inexistente' })
    }
  })
})

server.listen(config.port, () => {
  console.info(
    `[smarttv-auth] listening on :${String(config.port)} bypass=${String(config.devBypass)}`,
  )
})
