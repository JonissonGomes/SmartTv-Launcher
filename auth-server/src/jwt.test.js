import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long!!'
process.env.AUTH_DEV_BYPASS = '1'
process.env.GOOGLE_CLIENT_ID = 'x'
process.env.GOOGLE_CLIENT_SECRET = 'y'

const { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } =
  await import('./jwt.js')

test('access token round-trip', async () => {
  const token = await signAccessToken({
    sub: 'u1',
    email: 'a@b.c',
    name: 'Ana',
    picture: 'https://example.com/p.png',
  })
  const payload = await verifyAccessToken(token)
  assert.equal(payload.sub, 'u1')
  assert.equal(payload.email, 'a@b.c')
  assert.equal(payload.name, 'Ana')
})

test('refresh token tipado', async () => {
  const token = await signRefreshToken({ sub: 'u1', email: 'a@b.c' })
  const payload = await verifyRefreshToken(token)
  assert.equal(payload.sub, 'u1')
  await assert.rejects(() => verifyAccessToken(token))
})
