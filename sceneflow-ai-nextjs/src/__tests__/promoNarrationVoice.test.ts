import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { PROMO_AUDIO_MIX } from '@/lib/publish/promoAudioMix'
import {
  buildPromoNarrationPrompt,
  mergePromoDialogueAudio,
  promoNarrationLineFromScene,
  promoNarrationShotsFromPlan,
  unwrapPromoNarrationText,
} from '@/lib/publish/promoNarrationScript'
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
    expect(route).toContain("responseMimeType: 'text/plain'")
    expect(route).toContain("thinkingLevel: 'minimal'")
    expect(route).toContain('narrationLine')
    expect(route).toContain('mergePromoDialogueAudio')
  })
})

describe('promo narration script', () => {
  it('writes the ordered cut as a spoken line, not JSON', () => {
    const prompt = buildPromoNarrationPrompt({
      title: 'The White City Current',
      logline: 'A river keeps a city alive.',
      shots: promoNarrationShotsFromPlan([
        { label: 'The gates open', durationSec: 5, included: true },
        { label: 'Leave this out', durationSec: 4, included: false },
        { label: 'She reaches the current', durationSec: 4.2, startSec: 0, endSec: 4.2 },
      ]),
      targetDurationSec: 60,
      languageName: 'English',
      minWords: 32,
      maxWords: 52,
    })
    expect(prompt).toContain('1. (5s) The gates open')
    expect(prompt).toContain('2. (4s) She reaches the current')
    expect(prompt).not.toContain('Leave this out')
    expect(prompt).toContain('Return only the spoken narration')
    expect(prompt).toContain('No JSON')
  })

  it('unwraps a JSON narration blob and keeps plain speech', () => {
    expect(unwrapPromoNarrationText('{"narration":"The city holds its breath."}')).toBe(
      'The city holds its breath.'
    )
    expect(unwrapPromoNarrationText('{"text":"She runs."}')).toBe('She runs.')
    expect(unwrapPromoNarrationText('The river does not wait.')).toBe('The river does not wait.')
    expect(unwrapPromoNarrationText('{"narration": "The city holds')).toBe('The city holds')
    expect(unwrapPromoNarrationText('{"shots":[]}')).toBe('')
    expect(unwrapPromoNarrationText('')).toBe('')
  })

  it('keeps a stored voice-over when the client scene has none', () => {
    const stored = {
      dialogueAudio: {
        en: [{ line: 'The city holds its breath.', audioUrl: 'https://cdn.example/vo.mp3' }],
      },
    }
    const merged = mergePromoDialogueAudio({ id: 'promo' }, stored)
    expect(promoNarrationLineFromScene({ dialogueAudio: merged }, 'en')).toBe(
      'The city holds its breath.'
    )
    expect(merged?.en?.[0]).toMatchObject({ audioUrl: 'https://cdn.example/vo.mp3' })

    const client = {
      dialogueAudio: {
        en: [{ line: 'A newer line.', audioUrl: 'https://cdn.example/new.mp3' }],
      },
    }
    expect(promoNarrationLineFromScene({ dialogueAudio: mergePromoDialogueAudio(client, stored) }, 'en')).toBe(
      'A newer line.'
    )
  })
})
