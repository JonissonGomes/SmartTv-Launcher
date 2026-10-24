import { config } from './config.js'

const DEVICE_CODE_URL = 'https://oauth2.googleapis.com/device/code'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
const SCOPES = 'openid email profile'

/** @type {Map<string, { createdAt: number, user?: { sub: string, email: string, name: string, picture?: string } }>} */
const bypassSessions = new Map()

function formBody(data) {
  return new URLSearchParams(data).toString()
}

/**
 * @returns {Promise<{
 *   device_code: string,
 *   user_code: string,
 *   verification_url: string,
 *   verification_url_complete?: string,
 *   expires_in: number,
 *   interval: number,
 * }>}
 */
export async function startDeviceAuth() {
  if (config.devBypass) {
    const deviceCode = `dev_${crypto.randomUUID()}`
    const userCode = `DEV-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    bypassSessions.set(deviceCode, { createdAt: Date.now() })
    // Auto-aprova após 2s para o Simulator
    setTimeout(() => {
      const session = bypassSessions.get(deviceCode)
      if (!session) return
      session.user = {
        sub: 'dev-user-1',
        email: 'dev@smarttv.local',
        name: 'Usuário Dev',
        picture: undefined,
      }
    }, 2000)
    return {
      device_code: deviceCode,
      user_code: userCode,
      verification_url: 'https://www.google.com/device',
      verification_url_complete: 'https://www.google.com/device',
      expires_in: 600,
      interval: 2,
    }
  }

  const res = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      client_id: config.googleClientId,
      scope: SCOPES,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error_description || data.error || 'device/code failed')
    err.code = data.error
    err.status = res.status
    throw err
  }
  return {
    device_code: data.device_code,
    user_code: data.user_code,
    verification_url: data.verification_url,
    verification_url_complete: data.verification_url_complete,
    expires_in: data.expires_in,
    interval: data.interval ?? 5,
  }
}

/**
 * @param {string} deviceCode
 * @returns {Promise<
 *   | { status: 'pending' }
 *   | { status: 'slow_down' }
 *   | { status: 'expired' }
 *   | { status: 'denied' }
 *   | { status: 'ready', user: { sub: string, email: string, name: string, picture?: string }, google: { access_token: string, refresh_token?: string, expires_in?: number } }
 * >}
 */
export async function pollDeviceAuth(deviceCode) {
  if (config.devBypass) {
    const session = bypassSessions.get(deviceCode)
    if (!session) return { status: 'expired' }
    if (Date.now() - session.createdAt > 600_000) {
      bypassSessions.delete(deviceCode)
      return { status: 'expired' }
    }
    if (!session.user) return { status: 'pending' }
    const user = session.user
    bypassSessions.delete(deviceCode)
    return {
      status: 'ready',
      user,
      google: { access_token: 'dev-access', expires_in: 3600 },
    }
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })
  const data = await res.json()

  if (data.error === 'authorization_pending') return { status: 'pending' }
  if (data.error === 'slow_down') return { status: 'slow_down' }
  if (data.error === 'expired_token') return { status: 'expired' }
  if (data.error === 'access_denied') return { status: 'denied' }

  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || data.error || 'token failed')
    err.code = data.error
    err.status = res.status
    throw err
  }

  const user = await fetchGoogleUser(data.access_token)
  return {
    status: 'ready',
    user,
    google: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    },
  }
}

/**
 * @param {string} accessToken
 */
async function fetchGoogleUser(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok || !data.sub) {
    throw new Error(data.error_description || 'userinfo failed')
  }
  return {
    sub: String(data.sub),
    email: String(data.email ?? ''),
    name: String(data.name ?? data.email ?? 'Usuário'),
    picture: data.picture ? String(data.picture) : undefined,
  }
}
