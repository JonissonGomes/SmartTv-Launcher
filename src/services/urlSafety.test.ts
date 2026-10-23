import { describe, expect, it } from 'vitest'
import {
  hostOf,
  isDirectMediaUrl,
  isUrlAllowedForLibrary,
  normalizeHttpsUrl,
} from '@/services/urlSafety'

describe('urlSafety', () => {
  it('normaliza https e rejeita lixo', () => {
    expect(normalizeHttpsUrl('assistiranimesonline.net')).toBe(
      'https://assistiranimesonline.net/',
    )
    expect(normalizeHttpsUrl('https://assistiranimesonline.net/animes')).toContain(
      'assistiranimesonline.net',
    )
    expect(normalizeHttpsUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeHttpsUrl('')).toBeNull()
  })

  it('restringe ao host da biblioteca', () => {
    const base = 'https://assistiranimesonline.net'
    expect(
      isUrlAllowedForLibrary('https://assistiranimesonline.net/ep/1', base),
    ).toBe(true)
    expect(
      isUrlAllowedForLibrary('https://cdn.assistiranimesonline.net/v.mp4', base),
    ).toBe(true)
    expect(isUrlAllowedForLibrary('https://evil.com', base)).toBe(false)
  })

  it('detecta mídia direta', () => {
    expect(isDirectMediaUrl('https://x.com/a/b.mp4')).toBe(true)
    expect(isDirectMediaUrl('https://x.com/a/stream.m3u8')).toBe(true)
    expect(isDirectMediaUrl('https://x.com/page')).toBe(false)
    expect(hostOf('https://Foo.COM/x')).toBe('foo.com')
  })
})
