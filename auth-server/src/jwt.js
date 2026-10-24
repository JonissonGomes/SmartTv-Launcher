import { SignJWT, jwtVerify } from 'jose'
import { config } from './config.js'

function secretKey() {
  return new TextEncoder().encode(config.jwtSecret)
}

/**
 * @param {{ sub: string, email: string, name: string, picture?: string }} user
 */
export async function signAccessToken(user) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    picture: user.picture ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuer(config.jwtIssuer)
    .setAudience(config.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(`${String(config.accessTtlMin)}m`)
    .sign(secretKey())
}

/**
 * @param {{ sub: string, email: string }} user
 */
export async function signRefreshToken(user) {
  return new SignJWT({ typ: 'refresh', email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuer(config.jwtIssuer)
    .setAudience(config.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(`${String(config.refreshTtlDays)}d`)
    .sign(secretKey())
}

/**
 * @param {string} token
 */
export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  })
  if (payload.typ === 'refresh') {
    throw new Error('token de refresh não é access')
  }
  return payload
}

/**
 * @param {string} token
 */
export async function verifyRefreshToken(token) {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  })
  if (payload.typ !== 'refresh') {
    throw new Error('token não é refresh')
  }
  return payload
}
