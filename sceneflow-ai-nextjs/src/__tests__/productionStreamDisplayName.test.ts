import { describe, it, expect } from 'vitest'
import { getProductionStreamDisplayName } from '@/components/vision/scene-production/defaults'
import type { ProductionStream } from '@/components/vision/scene-production/types'

describe('getProductionStreamDisplayName', () => {
  const base: ProductionStream = {
    id: 's1',
    streamType: 'animatic',
    streamVersion: 2,
    language: 'en',
    languageLabel: 'English',
    status: 'complete',
  }

  it('uses custom displayName when set', () => {
    expect(
      getProductionStreamDisplayName({ ...base, displayName: '  Director cut  ' })
    ).toBe('Director cut')
  })

  it('falls back to language, type, and version', () => {
    expect(getProductionStreamDisplayName(base)).toBe('English Animatic v2')
    expect(
      getProductionStreamDisplayName({ ...base, streamType: 'video', streamVersion: 1 })
    ).toBe('English Video v1')
  })
})
