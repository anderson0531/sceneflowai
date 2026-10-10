import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { PROMO_AUDIO_MIX } from '@/lib/publish/promoAudioMix'
import { resolvePromoNarrationVoiceId } from '@/lib/publish/promoNarrationVoice'
import { DEFAULT_BLUEPRINT_GEMINI_VOICE } from '@/lib/tts/blueprintTtsConstants'

function read(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), 'utf8')
}

describe('resolvePromoNarrationVoiceId', () => {
  it('uses the narrator, then the stored narration voice, then a protagonist', () => {
    expect(
      resolvePromoNarrationVoiceId({
        characters: [
          { type: 'narrator', voiceConfig: { voiceId: 'gemini-Charon' } },
          { role: 'protagonist', voiceConfig: { voiceId: 'gemini-Aoede' } },
        ],
        narrationVoice: { voiceId: 'gemini-Kore' },
      })
    ).toBe('gemini-Charon')

    expect(
      resolvePromoNarrationVoiceId({
        characters: [{ role: 'protagonist', voiceConfig: { voiceId: 'gemini-Aoede' } }],
        narrationVoice: { voiceId: 'gemini-Fenrir' },
      })
    ).toBe('gemini-Fenrir')

    expect(
      resolvePromoNarrationVoiceId({
        characters: [
          { role: 'supporting', voiceConfig: { voiceId: 'gemini-Zephyr' } },
          { role: 'main', voiceConfig: { voiceId: 'gemini-Orus' } },
          { role: 'protagonist', voiceConfig: { voiceId: 'gemini-Aoede' } },
        ],
      })
    ).toBe('gemini-Aoede')

    expect(
      resolvePromoNarrationVoiceId({
        characters: [{ role: 'main', voiceConfig: { voiceId: 'gemini-Orus' } }],
      })
    ).toBe('gemini-Orus')
  })

  it('maps a non-Gemini cast voice onto the default Gemini voice', () => {
    expect(
      resolvePromoNarrationVoiceId({
        characters: [{ type: 'narrator', voiceConfig: { voiceId: 'pNInz6obpgDQGcFmaJgB' } }],
      })
    ).toBe(DEFAULT_BLUEPRINT_GEMINI_VOICE)
  })

  it('falls back to Kore when nobody has a voice', () => {
    expect(resolvePromoNarrationVoiceId({ characters: [] })).toBe(DEFAULT_BLUEPRINT_GEMINI_VOICE)
  })
})

describe('promo narration level and timeline controls', () => {
  it('puts narration above the clip level', () => {
    expect(PROMO_AUDIO_MIX.narration).toBe(1.5)
    expect(PROMO_AUDIO_MIX.narration).toBeGreaterThan(PROMO_AUDIO_MIX.clip)
    expect(PROMO_AUDIO_MIX.narration).toBeGreaterThan(PROMO_AUDIO_MIX.music)
  })

  it('regenerates narration and music from their own timeline rows', () => {
    const tab = read('src/components/publishing/PublishingPromoTab.tsx')
    expect(tab).toContain("handleRegenAudio('narration')")
    expect(tab).toContain("handleRegenAudio('music')")
    expect(tab).toContain("await postScene(action)")
    expect(tab).toContain("'plan' | 'upsert' | 'timeline' | 'narration' | 'music'")
    const route = read('src/app/api/publish/promo/scene/route.ts')
    expect(route).toContain('resolvePromoNarrationVoiceId')
  })
})
