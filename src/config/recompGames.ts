/**
 * Catálogo de portes web-recomp (PSP/PS2).
 * Só metadata + porta do serve local — host LAN é resolvido em runtime.
 * Projetos: snuri00/psp-web-recomp e snuri00/ps2-web-recomp.
 */

export type RecompGameId =
  | 'gow-coo'
  | 'gow-gos'
  | 'gt4'
  | 'gow2'

export type RecompFamily = 'psp' | 'ps2'

export interface RecompGame {
  id: RecompGameId
  title: string
  subtitle: string
  family: RecompFamily
  /** Porta padrão do `serve` dos projetos oficiais. */
  defaultPort: number
  needs: 'webgl2' | 'webgpu'
  project: string
  /** Caminho relativo opcional se vários jogos no mesmo host. */
  path?: string
}

export const RECOMP_GAMES: RecompGame[] = [
  {
    id: 'gow-coo',
    title: 'God of War: Chains of Olympus',
    subtitle: 'PSP · web-recomp · WebGL2',
    family: 'psp',
    defaultPort: 8613,
    needs: 'webgl2',
    project: 'psp-web-recomp',
  },
  {
    id: 'gow-gos',
    title: 'God of War: Ghost of Sparta',
    subtitle: 'PSP · web-recomp · WebGL2',
    family: 'psp',
    defaultPort: 8614,
    needs: 'webgl2',
    project: 'psp-web-recomp',
  },
  {
    id: 'gt4',
    title: 'Gran Turismo 4',
    subtitle: 'PS2 · web-recomp · WebGPU',
    family: 'ps2',
    defaultPort: 8620,
    needs: 'webgpu',
    project: 'ps2-web-recomp',
  },
  {
    id: 'gow2',
    title: 'God of War II',
    subtitle: 'PS2 · web-recomp · WebGPU',
    family: 'ps2',
    defaultPort: 8621,
    needs: 'webgpu',
    project: 'ps2-web-recomp',
  },
]

export type RecompUrlMap = Partial<Record<RecompGameId, string>>

/** Overrides vazios — host vem da LAN em runtime. */
export function emptyRecompUrls(): Record<RecompGameId, string> {
  const out = {} as Record<RecompGameId, string>
  for (const g of RECOMP_GAMES) out[g.id] = ''
  return out
}

export function hostFromOrigin(origin: string): string {
  try {
    return new URL(origin.includes('://') ? origin : `http://${origin}`)
      .hostname
  } catch {
    return '127.0.0.1'
  }
}

/** Monta URL a partir do host LAN + porta do catálogo (ou override manual). */
export function resolveRecompUrl(
  id: RecompGameId,
  lanHost: string,
  overrides: RecompUrlMap = {},
): string {
  const custom = overrides[id]?.trim()
  if (custom) {
    const base = custom.replace(/\/$/, '')
    const game = RECOMP_GAMES.find((g) => g.id === id)
    if (game?.path) {
      return `${base}${game.path.startsWith('/') ? '' : '/'}${game.path}`
    }
    return `${base}/`
  }

  const game = RECOMP_GAMES.find((g) => g.id === id)
  const port = game?.defaultPort ?? 8613
  const host = lanHost.trim() || '127.0.0.1'
  const base = `http://${host}:${String(port)}`
  if (game?.path) {
    return `${base}${game.path.startsWith('/') ? '' : '/'}${game.path}`
  }
  return `${base}/`
}

/** URL só com porta padrão (sem override) — migração limpa do IDB. */
export function isAutoPortUrl(
  id: RecompGameId,
  url: string | undefined,
): boolean {
  if (!url?.trim()) return true
  const game = RECOMP_GAMES.find((g) => g.id === id)
  if (!game) return true
  try {
    const u = new URL(url.includes('://') ? url : `http://${url}`)
    const port = u.port
      ? Number(u.port)
      : u.protocol === 'https:'
        ? 443
        : 80
    const pathOk =
      !game.path ||
      u.pathname === '/' ||
      u.pathname === game.path ||
      u.pathname === `${game.path}/`
    return port === game.defaultPort && pathOk
  } catch {
    return true
  }
}
