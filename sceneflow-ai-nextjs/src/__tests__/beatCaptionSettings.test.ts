import { describe, it, expect } from 'vitest'
import { isBeatCaptionEnabledForLanguage } from '@/lib/storyboard/beatCaptionSettings'

describe('isBeatCaptionEnabledForLanguage', () => {
  it('defaults to off for English and on for other languages', () => {
    expect(isBeatCaptionEnabledForLanguage('en')).toBe(false)
    expect(isBeatCaptionEnabledForLanguage('th')).toBe(true)
    expect(isBeatCaptionEnabledForLanguage('es')).toBe(true)
  })

  it('respects explicit per-language overrides', () => {
    const settings = { en: true, th: false }
    expect(isBeatCaptionEnabledForLanguage('en', settings)).toBe(true)
    expect(isBeatCaptionEnabledForLanguage('th', settings)).toBe(false)
    expect(isBeatCaptionEnabledForLanguage('es', settings)).toBe(true)
  })

  it('treats explicit false as disabled even for non-English', () => {
    expect(isBeatCaptionEnabledForLanguage('th', { th: false })).toBe(false)
  })
})
