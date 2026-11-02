import { describe, it, expect } from 'vitest'
import {
  buildTreatmentImportPrompt,
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

describe('buildTreatmentImportPrompt', () => {
  it('instructs the model to preserve full script characters, locations, and scene progression', () => {
    const prompt = buildTreatmentImportPrompt('INT. LAB - NIGHT\nDR. ELENA VANCE inspects the core.')
    expect(prompt).toContain('COMPLETE SCRIPT, SCREENPLAY, or DETAILED MULTI-SCENE TREATMENT')
    expect(prompt).toContain('Named characters or subjects')
    expect(prompt).toContain('Act-by-act or scene-by-scene narrative progression')
    expect(prompt).toContain('DR. ELENA VANCE')
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
