import { describe, it, expect } from 'vitest'
import {
  resolveGeminiTtsLanguageCode,
  resolveGoogleTtsLanguageCode,
} from '@/lib/tts/googleTtsLocale'

describe('resolveGoogleTtsLanguageCode', () => {
  it('maps Arabic short code to ar-XA', () => {
    expect(resolveGoogleTtsLanguageCode('ar')).toBe('ar-XA')
  })

  it('maps Chinese short code to cmn-CN', () => {
    expect(resolveGoogleTtsLanguageCode('zh')).toBe('cmn-CN')
  })

  it('maps Hebrew short code to he-IL', () => {
    expect(resolveGoogleTtsLanguageCode('he')).toBe('he-IL')
  })

  it('passes through full locale codes', () => {
    expect(resolveGoogleTtsLanguageCode('ar-XA')).toBe('ar-XA')
    expect(resolveGoogleTtsLanguageCode('th-TH')).toBe('th-TH')
  })

  it('maps Thai via precise fallback', () => {
    expect(resolveGoogleTtsLanguageCode('th')).toBe('th-TH')
  })

  it('maps Czech via voice metadata', () => {
    expect(resolveGoogleTtsLanguageCode('cs')).toBe('cs-CZ')
  })

  it('maps Ukrainian via voice metadata', () => {
    expect(resolveGoogleTtsLanguageCode('uk')).toBe('uk-UA')
  })
})

describe('resolveGeminiTtsLanguageCode', () => {
  it('maps Arabic short code to ar-EG', () => {
    expect(resolveGeminiTtsLanguageCode('ar')).toBe('ar-EG')
  })

  it('maps legacy ar-XA to ar-EG for Gemini', () => {
    expect(resolveGeminiTtsLanguageCode('ar-XA')).toBe('ar-EG')
  })

  it('maps Chinese short code to cmn-CN', () => {
    expect(resolveGeminiTtsLanguageCode('zh')).toBe('cmn-CN')
  })

  it('maps Spanish short code to es-ES', () => {
    expect(resolveGeminiTtsLanguageCode('es')).toBe('es-ES')
  })

  it('maps Norwegian short code to nb-NO', () => {
    expect(resolveGeminiTtsLanguageCode('no')).toBe('nb-NO')
  })

  it('maps English short code to en-US', () => {
    expect(resolveGeminiTtsLanguageCode('en')).toBe('en-US')
  })

  it('passes through valid Gemini locale codes', () => {
    expect(resolveGeminiTtsLanguageCode('ar-EG')).toBe('ar-EG')
    expect(resolveGeminiTtsLanguageCode('th-TH')).toBe('th-TH')
  })
})
