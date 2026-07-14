import { describe, it, expect } from 'vitest'
import { resolveGoogleTtsLanguageCode } from '@/lib/tts/googleTtsLocale'

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
