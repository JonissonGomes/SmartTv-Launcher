import { config } from './config.js'
import { startDeviceAuth, pollDeviceAuth } from './googleDevice.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.js'
import { getBearer, readJsonBody, sendJson } from './http.js'

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} pathname
 */
export async function handleAuthRoute(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'smarttv-auth',
      bypass: config.devBypass,
    })
    return true
  }

  if (req.method === 'POST' && pathname === '/auth/device/start') {
    try {
      const started = await startDeviceAuth()
      sendJson(res, 200, {
        device_code: started.device_code,
        user_code: started.user_code,
        verification_url: started.verification_url,
        verification_url_complete: started.verification_url_complete ?? null,
        expires_in: started.expires_in,
        interval: started.interval,
      })
    } catch (err) {
      sendJson(res, err.status && err.status < 500 ? err.status : 502, {
        error: err.code || 'device_start_failed',
        message: err instanceof Error ? err.message : 'falha ao iniciar login',
      })
    }
    return true
  }

  if (req.method === 'POST' && pathname === '/auth/device/poll') {
    try {
      const body = await readJsonBody(req)
      const deviceCode =
        typeof body.device_code === 'string' ? body.device_code.trim() : ''
      if (!deviceCode) {
        sendJson(res, 400, {
          error: 'invalid_request',
          message: 'device_code é obrigatório',
        })
        return true
      }

      const result = await pollDeviceAuth(deviceCode)
      if (result.status !== 'ready') {
        sendJson(res, 200, { status: result.status })
        return true
      }

      const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(result.user),
        signRefreshToken(result.user),
      ])

      sendJson(res, 200, {
        status: 'ready',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: config.accessTtlMin * 60,
        user: {
          id: result.user.sub,
          email: result.user.email,
          name: result.user.name,
          picture: result.user.picture ?? null,
        },
      })
    } catch (err) {
      sendJson(res, 502, {
        error: err.code || 'device_poll_failed',
        message: err instanceof Error ? err.message : 'falha no poll',
      })
    }
    return true
  }

  if (req.method === 'POST' && pathname === '/auth/refresh') {
    try {
      const body = await readJsonBody(req)
      const refresh =
        typeof body.refresh_token === 'string' ? body.refresh_token.trim() : ''
      if (!refresh) {
        sendJson(res, 400, {
          error: 'invalid_request',
          message: 'refresh_token é obrigatório',
        })
        return true
      }
      const payload = await verifyRefreshToken(refresh)
      const user = {
        sub: String(payload.sub),
        email: String(payload.email ?? ''),
        name: String(payload.email ?? 'Usuário'),
      }
      const accessToken = await signAccessToken(user)
      sendJson(res, 200, {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: config.accessTtlMin * 60,
      })
    } catch {
      sendJson(res, 401, {
        error: 'invalid_grant',
        message: 'refresh_token inválido ou expirado',
      })
    }
    return true
  }

  if (
    req.method === 'GET' &&
    (pathname === '/me' || pathname === '/auth/me')
  ) {
    try {
      const token = getBearer(req)
      if (!token) {
        sendJson(res, 401, { error: 'unauthorized', message: 'Bearer ausente' })
        return true
      }
      const payload = await verifyAccessToken(token)
      sendJson(res, 200, {
        id: String(payload.sub),
        email: String(payload.email ?? ''),
        name: String(payload.name ?? ''),
        picture: payload.picture ? String(payload.picture) : null,
      })
    } catch {
      sendJson(res, 401, {
        error: 'unauthorized',
        message: 'access_token inválido ou expirado',
      })
    }
    return true
  }

  if (req.method === 'POST' && pathname === '/auth/logout') {
    // JWT stateless: o cliente descarta os tokens.
    sendJson(res, 200, { ok: true })
    return true
  }

  return false
}
