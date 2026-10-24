import { networkInterfaces } from 'node:os'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

function scoreLanIp(ip: string): number {
  if (ip.startsWith('192.168.')) return 300
  if (ip.startsWith('10.')) return 200
  // 172.16–31 costuma ser Hyper-V/WSL/Docker — menor prioridade
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return 50
  return 100
}

function lanIpv4Addresses(): string[] {
  const nets = networkInterfaces()
  const out: string[] = []
  for (const [name, entries] of Object.entries(nets)) {
    if (!entries) continue
    const lower = name.toLowerCase()
    if (
      lower.includes('wsl') ||
      lower.includes('hyper-v') ||
      lower.includes('vethernet') ||
      lower.includes('docker') ||
      lower.includes('virtualbox') ||
      lower.includes('vmware')
    ) {
      continue
    }
    for (const entry of entries) {
      const family = String(entry.family)
      if (family === 'IPv4' && !entry.internal) out.push(entry.address)
    }
  }
  return [...new Set(out)].sort((a, b) => scoreLanIp(b) - scoreLanIp(a))
}

function sendLanJson(
  res: ServerResponse,
  port: number,
  protocol: 'http' | 'https' = 'http',
): void {
  const origins = lanIpv4Addresses().map(
    (ip) => `${protocol}://${ip}:${String(port)}`,
  )
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify({ origins, preferred: origins[0] ?? null }))
}

function attachLanEndpoint(
  server: ViteDevServer | PreviewServer,
  getPort: () => number,
): void {
  server.middlewares.use(
    (
      req: IncomingMessage,
      res: ServerResponse,
      next: (err?: unknown) => void,
    ) => {
      const url = req.url ?? '/'
      if (!url.startsWith('/__lan')) {
        next()
        return
      }
      sendLanJson(res, getPort())
    },
  )
}

/** Expõe GET /__lan com origins IPv4 da máquina (QR celular). */
export function lanOriginPlugin(): Plugin {
  return {
    name: 'lan-origin',
    configureServer(server) {
      attachLanEndpoint(server, () => {
        const addr = server.httpServer?.address()
        if (addr && typeof addr === 'object') return addr.port
        return server.config.server.port ?? 5173
      })
    },
    configurePreviewServer(server) {
      attachLanEndpoint(server, () => {
        const addr = server.httpServer?.address()
        if (addr && typeof addr === 'object') return addr.port
        return 4173
      })
    },
  }
}
