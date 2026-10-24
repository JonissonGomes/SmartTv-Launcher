import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertRuntimeConfig, config } from './config.js'
import { applyCors, sendJson } from './http.js'
import { handleAuthRoute } from './routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadDotEnv() {
  const path = resolve(__dirname, '../.env')
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnv()
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
