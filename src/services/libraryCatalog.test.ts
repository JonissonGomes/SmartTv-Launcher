import { describe, expect, it } from 'vitest'
import type { LibraryCatalog } from '@/domain/library'

describe('library catalog shape', () => {
  it('aceita item com streamUrl direto', () => {
    const sample: LibraryCatalog = {
      version: 1,
      rows: [
        {
          id: 'r1',
          title: 'Row',
          items: [
            {
              id: 'i1',
              title: 'Título',
              streamUrl: 'https://cdn.example.com/a.mp4',
            },
          ],
        },
      ],
    }
    expect(sample.rows[0]?.items[0]?.streamUrl).toContain('.mp4')
  })
})
