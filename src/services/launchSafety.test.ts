import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_CONFIGS, getAllKnownWebOsAppIds } from '@/config/apps'
import {
  ALLOWED_LUNA_METHODS,
  MAX_HISTORY_ENTRIES,
  MAX_LAUNCH_STRING_LEN,
  assertAllowedWebOsAppId,
  buildSafeLaunchParameters,
  clampHistoryEntries,
  isAllowedLunaMethod,
  isSafeGameRoomId,
  isSafeWebOsAppId,
} from '@/services/launchSafety'

const ALLOWED_IDS = getAllKnownWebOsAppIds()

describe('segurança — Luna / launch (protege a TV)', () => {
  it('só permite métodos Luna conhecidos', () => {
    expect(isAllowedLunaMethod('launch')).toBe(true)
    expect(isAllowedLunaMethod('listApps')).toBe(true)
    expect(isAllowedLunaMethod('getAppLoadStatus')).toBe(true)
    expect(isAllowedLunaMethod('removeApp')).toBe(false)
    expect(isAllowedLunaMethod('close')).toBe(false)
    expect(ALLOWED_LUNA_METHODS).toEqual([
      'launch',
      'listApps',
      'getAppLoadStatus',
    ])
  })

  it('rejeita app ids fora da allowlist ou malformados', () => {
    expect(isSafeWebOsAppId('netflix')).toBe(true)
    expect(isSafeWebOsAppId('com.disney.disneyplus-prod')).toBe(true)
    expect(isSafeWebOsAppId('../evil')).toBe(false)
    expect(isSafeWebOsAppId('id;rm -rf')).toBe(false)
    expect(isSafeWebOsAppId('')).toBe(false)

    expect(() =>
      assertAllowedWebOsAppId('com.malware.app', ALLOWED_IDS),
    ).toThrow(/allowlist/)

    expect(() => assertAllowedWebOsAppId('netflix', ALLOWED_IDS)).not.toThrow()
  })

  it('sanitiza deep links aninhados em params (formato LG)', () => {
    const huge = 'A'.repeat(500)
    const payload = buildSafeLaunchParameters('netflix', ALLOWED_IDS, {
      contentTarget: `${huge}\u0000<script>alert(1)</script>`,
      id: 'hijack-should-be-ignored',
      '__proto__': 'x',
      nested: { a: 1 },
      okNum: 42,
      okBool: true,
    })

    expect(payload.id).toBe('netflix')
    expect(payload.contentTarget).toBeUndefined()
    const nested = payload.params as Record<string, unknown>
    expect(nested).toBeTruthy()
    expect(typeof nested.contentTarget).toBe('string')
    expect(String(nested.contentTarget).length).toBeLessThanOrEqual(
      MAX_LAUNCH_STRING_LEN,
    )
    expect(String(nested.contentTarget)).not.toContain('\u0000')
    expect(nested.okNum).toBe(42)
    expect(nested.okBool).toBe(true)
    expect(nested.nested).toBeUndefined()
    expect(
      Object.prototype.hasOwnProperty.call(nested, '__proto__'),
    ).toBe(false)
  })

  it('aceita contentId no topo (formato Netflix/LG)', () => {
    const payload = buildSafeLaunchParameters('netflix', ALLOWED_IDS, {
      contentId: 'https://www.netflix.com/search?q=Test',
      contentTarget: 'm=https://www.netflix.com/search?q=Test',
    })
    expect(payload.id).toBe('netflix')
    expect(payload.contentId).toBe('https://www.netflix.com/search?q=Test')
    expect((payload.params as Record<string, unknown>).contentTarget).toContain(
      'netflix.com',
    )
  })

  it('todos os apps e candidatos passam na allowlist', () => {
    for (const config of Object.values(APP_CONFIGS)) {
      expect(() =>
        assertAllowedWebOsAppId(config.webosAppId, ALLOWED_IDS),
      ).not.toThrow()
      for (const id of config.webosAppIdCandidates ?? []) {
        expect(() => assertAllowedWebOsAppId(id, ALLOWED_IDS)).not.toThrow()
      }
    }
  })
})

describe('segurança — histórico (memória da TV)', () => {
  it(`limita histórico a ${String(MAX_HISTORY_ENTRIES)} entradas`, () => {
    const many = Array.from({ length: MAX_HISTORY_ENTRIES + 40 }, (_, i) => i)
    const clamped = clampHistoryEntries(many)
    expect(clamped).toHaveLength(MAX_HISTORY_ENTRIES)
    expect(clamped[0]).toBe(0)
  })
})

describe('segurança — salas multiplayer', () => {
  it('aceita só room ids curtos alfanuméricos', () => {
    expect(isSafeGameRoomId('ABC12')).toBe(true)
    expect(isSafeGameRoomId('abc12')).toBe(true)
    expect(isSafeGameRoomId('AB')).toBe(false)
    expect(isSafeGameRoomId('A'.repeat(20))).toBe(false)
    expect(isSafeGameRoomId('../x')).toBe(false)
    expect(isSafeGameRoomId('AB CD')).toBe(false)
  })
})

describe('segurança — superfície do código fonte', () => {
  it('não usa APIs perigosas de injeção no src/', () => {
    const root = join(process.cwd(), 'src')
    const dangerous =
      /\beval\s*\(|new\s+Function\s*\(|dangerouslySetInnerHTML|document\.write\s*\(/

    const offenders: string[] = []

    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        const st = statSync(full)
        if (st.isDirectory()) {
          walk(full)
          continue
        }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\.(ts|tsx)$/.test(name)) {
          continue
        }
        const text = readFileSync(full, 'utf8')
        if (dangerous.test(text)) {
          offenders.push(relative(process.cwd(), full))
        }
      }
    }

    walk(root)
    expect(offenders).toEqual([])
  })
})
