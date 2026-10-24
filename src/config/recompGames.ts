/**
 * Catálogo de portes web-recomp (PSP/PS2).
 * Só metadata + URL do build local — nunca inclui ISO/ROM.
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

function envDefault(id: RecompGameId, port: number): string {
  const key = `VITE_RECOMP_URL_${id.replace(/-/g, '_').toUpperCase()}`
  const fromEnv = (import.meta.env as Record<string, string | undefined>)[key]
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, '')
  // LAN-friendly placeholder — usuário ajusta na UI ou .env
  return `http://127.0.0.1:${String(port)}`
}

export function defaultRecompUrls(): Record<RecompGameId, string> {
  const out = {} as Record<RecompGameId, string>
  for (const g of RECOMP_GAMES) {
    out[g.id] = envDefault(g.id, g.defaultPort)
  }
  return out
}

export function resolveRecompUrl(
  id: RecompGameId,
  overrides: RecompUrlMap,
): string {
  const game = RECOMP_GAMES.find((g) => g.id === id)
  const base = (overrides[id] || defaultRecompUrls()[id]).replace(/\/$/, '')
  if (game?.path) return `${base}${game.path.startsWith('/') ? '' : '/'}${game.path}`
  return `${base}/`
}
