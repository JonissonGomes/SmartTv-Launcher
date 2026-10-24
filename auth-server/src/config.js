import './loadEnv.js'

function env(name, fallback = '') {
  const value = process.env[name]
  return value === undefined || value === '' ? fallback : value
}

function envInt(name, fallback) {
  const raw = env(name, String(fallback))
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

export const config = {
  port: envInt('PORT', 8787),
  corsOrigin: env('CORS_ORIGIN', '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  googleClientId: env('GOOGLE_CLIENT_ID'),
  googleClientSecret: env('GOOGLE_CLIENT_SECRET'),
  jwtSecret: env('JWT_SECRET'),
  jwtIssuer: env('JWT_ISSUER', 'smarttv-launcher'),
  jwtAudience: env('JWT_AUDIENCE', 'smarttv-launcher'),
  accessTtlMin: envInt('JWT_ACCESS_TTL_MIN', 60),
  refreshTtlDays: envInt('JWT_REFRESH_TTL_DAYS', 30),
  /** Login demo sem Google — apenas desenvolvimento. */
  devBypass: env('AUTH_DEV_BYPASS', '0') === '1',
}

export function assertRuntimeConfig() {
  if (config.devBypass) {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET é obrigatório mesmo com AUTH_DEV_BYPASS=1')
    }
    return
  }
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error(
      'Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (ou AUTH_DEV_BYPASS=1 no dev)',
    )
  }
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres')
  }
}
