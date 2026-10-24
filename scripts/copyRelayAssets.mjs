/**
 * Copia dist/ → auth-server/public/ para o Render servir QR do celular.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const dest = resolve(root, 'auth-server', 'public')

if (!existsSync(dist)) {
  console.error('dist/ não encontrado. Rode npm run build antes.')
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(dist, dest, { recursive: true })
console.info(`OK: ${dist} → ${dest}`)
