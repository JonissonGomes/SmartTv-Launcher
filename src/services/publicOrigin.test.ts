import { describe, expect, it, vi } from 'vitest'
import {
  buildAppQueryUrl,
  getCloudRelayOrigin,
  isLoopbackHost,
  isUsablePublicOrigin,
  normalizeRelayOrigin,
  wsUrlFromOrigin,
} from '@/services/publicOrigin'

describe('publicOrigin', () => {
  it('detecta loopback', () => {
    expect(isLoopbackHost('localhost')).toBe(true)
    expect(isLoopbackHost('127.0.0.1')).toBe(true)
    expect(isLoopbackHost('192.168.0.10')).toBe(false)
  })

  it('rejeita file:// e aceita http LAN', () => {
    expect(isUsablePublicOrigin('file:///media/app/index.html')).toBe(false)
    expect(isUsablePublicOrigin('http://192.168.0.10:5173')).toBe(true)
    expect(normalizeRelayOrigin('192.168.0.10:5173')).toBe(
      'http://192.168.0.10:5173',
    )
    expect(normalizeRelayOrigin('file:///x')).toBe(null)
  })

  it('monta URL de query na raiz do relay', () => {
    const url = buildAppQueryUrl(
      'http://192.168.0.10:5173',
      {
        controller: '1',
        room: 'ABCD',
      },
      '/media/developer/apps/usr/palm/applications/br.jonis.launcher/index.html',
    )
    expect(url).toContain('http://192.168.0.10:5173/?')
    expect(url).toContain('controller=1')
    expect(url).toContain('room=ABCD')
    expect(url).not.toContain('media/developer')
  })

  it('monta ws a partir da origem HTTP', () => {
    expect(wsUrlFromOrigin('http://192.168.0.10:5173', '/ws/games')).toBe(
      'ws://192.168.0.10:5173/ws/games',
    )
    expect(wsUrlFromOrigin('https://app.example.com', '/ws/cast')).toBe(
      'wss://app.example.com/ws/cast',
    )
    expect(wsUrlFromOrigin('file:///x', '/ws/games')).toBe(null)
  })

  it('lê cloud de VITE_AUTH_API_URL', () => {
    vi.stubEnv('VITE_AUTH_API_URL', 'https://smarttv-launcher.onrender.com/')
    expect(getCloudRelayOrigin()).toBe('https://smarttv-launcher.onrender.com')
    vi.unstubAllEnvs()
  })
})
