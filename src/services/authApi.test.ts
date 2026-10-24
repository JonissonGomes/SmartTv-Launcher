import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthApiBase } from '@/services/authApi'

describe('getAuthApiBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('usa /api/auth relativo quando VITE_AUTH_API_URL está vazio (node)', () => {
    vi.stubEnv('VITE_AUTH_API_URL', '')
    expect(getAuthApiBase()).toBe('/api/auth')
  })

  it('respeita VITE_AUTH_API_URL absoluto', () => {
    vi.stubEnv('VITE_AUTH_API_URL', 'https://auth.example.com/')
    expect(getAuthApiBase()).toBe('https://auth.example.com')
  })
})
