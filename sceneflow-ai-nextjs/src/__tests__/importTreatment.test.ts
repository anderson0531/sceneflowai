import { describe, it, expect } from 'vitest'
import {
  isTreatmentTextUsable,
  parseTreatmentImportResult,
} from '@/lib/blueprint/importTreatment'

describe('isTreatmentTextUsable', () => {
  it('rejects very short input', () => {
    expect(isTreatmentTextUsable('too short')).toBe(false)
    expect(isTreatmentTextUsable('')).toBe(false)
  })

  it('accepts a reasonable treatment paragraph', () => {
    expect(
      isTreatmentTextUsable(
        'A documentary following three urban beekeepers across one honey season in Chicago.'
      )
    ).toBe(true)
  })
})

describe('parseTreatmentImportResult', () => {
  it('normalizes valid model output', () => {
    const parsed = {
      synopsis: 'A warm documentary about urban beekeeping.',
      contentIntent: 'informational',
      genre: 'nature documentary',
      tone: 'warm and hopeful',
      summary: 'Urban beekeeping doc',
    }
    const result = parseTreatmentImportResult(parsed, 'original text')
    expect(result.synopsis).toBe('A warm documentary about urban beekeeping.')
    expect(result.contentIntent).toBe('informational')
    expect(result.genre).toBe('nature documentary')
    expect(result.tone).toBe('warm and hopeful')
  })

  it('coerces an invalid content intent to null', () => {
    const result = parseTreatmentImportResult(
      { synopsis: 'x', contentIntent: 'documentary' },
      'original'
    )
    expect(result.contentIntent).toBeNull()
  })

  it('falls back to the original text when synopsis is missing', () => {
    const original = 'The original pasted treatment content that should survive.'
    const result = parseTreatmentImportResult(null, original)
    expect(result.synopsis).toBe(original)
    expect(result.genre).toBe('')
    expect(result.contentIntent).toBeNull()
  })
})
