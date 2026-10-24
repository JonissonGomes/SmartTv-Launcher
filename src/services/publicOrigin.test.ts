import { describe, expect, it } from 'vitest'
import { buildAppQueryUrl, isLoopbackHost } from '@/services/publicOrigin'

describe('publicOrigin', () => {
  it('detecta loopback', () => {
    expect(isLoopbackHost('localhost')).toBe(true)
    expect(isLoopbackHost('127.0.0.1')).toBe(true)
    expect(isLoopbackHost('192.168.0.10')).toBe(false)
  })

  it('monta URL de query com origin', () => {
    const url = buildAppQueryUrl('http://192.168.0.10:5173', {
      controller: '1',
      room: 'ABCD',
    })
    expect(url).toContain('http://192.168.0.10:5173')
    expect(url).toContain('controller=1')
    expect(url).toContain('room=ABCD')
  })
})
