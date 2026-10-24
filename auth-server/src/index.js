import { createServer } from 'node:http'
import { assertRuntimeConfig, config } from './config.js'
import { applyCors, sendJson } from './http.js'
import { attachGameRelays } from './relay.js'
import { handleAuthRoute } from './routes.js'
import { publicDirReady, tryServeStatic } from './static.js'

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

  if (pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      relay: true,
      spa: publicDirReady(),
    })
    return
  }

  void handleAuthRoute(req, res, pathname).then((handled) => {
    if (handled) return
    if (tryServeStatic(req, res, url.pathname)) return
    sendJson(res, 404, { error: 'not_found', message: 'rota inexistente' })
  })
})

attachGameRelays(server)

server.listen(config.port, () => {
  console.info(
    `[smarttv-auth] listening on :${String(config.port)} bypass=${String(config.devBypass)} spa=${String(publicDirReady())} relay=on`,
  )
})
