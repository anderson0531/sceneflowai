import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { fromTtsLanguageCode, toTtsLanguageCode } from '@/i18n/languageCodeBridge'
import { resolveGeminiTtsLanguageCode } from '@/lib/tts/googleTtsLocale'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('language code bridge for Blueprint TTS', () => {
  it('maps platform locales to TTS language codes', () => {
    expect(toTtsLanguageCode('zh-CN')).toBe('zh')
    expect(toTtsLanguageCode('tl')).toBe('fil')
    expect(toTtsLanguageCode('es')).toBe('es')
    expect(fromTtsLanguageCode('zh')).toBe('zh-CN')
    expect(fromTtsLanguageCode('fil')).toBe('tl')
  })

  it('resolves Gemini languageCode for short TTS codes', () => {
    expect(resolveGeminiTtsLanguageCode('es')).not.toBe('en-US')
    expect(resolveGeminiTtsLanguageCode('zh')).not.toBe('en-US')
    expect(resolveGeminiTtsLanguageCode('en')).toBe('en-US')
  })
})

describe('Blueprint TTS language plumbing', () => {
  it('syncs studio TTS language from the header locale', () => {
    const hook = readSource('src/hooks/useBlueprintTts.ts')
    expect(hook).toContain('useUiLocale')
    expect(hook).toContain('toTtsLanguageCode')
    expect(hook).toContain('language: selectedLanguage')
  })

  it('forwards languageCode into Gemini synthesis on the Blueprint TTS route', () => {
    const route = readSource('src/app/api/tts/blueprint/route.ts')
    expect(route).toContain('resolveGeminiTtsLanguageCode')
    expect(route).toContain('languageCode')
  })

  it('passes language into share section synthesis', () => {
    const share = readSource('src/lib/blueprint/generateShareSectionAudio.ts')
    expect(share).toContain('resolveGeminiTtsLanguageCode')
    expect(share).toContain('synthesizeSectionMp3(speakableText, voiceId, directorNotes, language)')
  })

  it('lets Share/Review override content MT target locale', () => {
    const hook = readSource('src/i18n/content/useContentTranslation.ts')
    expect(hook).toContain('targetLocale?: string')
    expect(hook).toContain('targetLocaleOverride')

    const share = readSource('src/components/blueprint/BlueprintShareViewer.tsx')
    expect(share).toContain('useContentTranslation')
    expect(share).toContain('applyTreatmentVariantTranslations')
    expect(share).toContain('fromTtsLanguageCode')
    expect(share).toContain('enableGoogleTranslate={false}')
  })
})
