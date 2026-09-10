import { describe, expect, it } from 'vitest'
import { GEMINI_VOICE_CATALOG } from '@/lib/tts/geminiVoiceCatalog'
import {
  buildGoogleVoiceAssignment,
  pickGeminiBaseVoice,
} from '@/lib/tts/pickGeminiBaseVoice'

function catalogGender(voiceId: string) {
  return GEMINI_VOICE_CATALOG.find((voice) => voice.id === voiceId)?.gender
}

describe('pickGeminiBaseVoice', () => {
  it('returns only gemini-* ids and a human label, never a catalog star name', () => {
    const pick = pickGeminiBaseVoice('Warm, intelligent documentary storyteller.', {
      gender: 'male',
      name: 'Narrator',
    })

    expect(pick.voiceId.startsWith('gemini-')).toBe(true)
    expect(pick.voiceId).not.toMatch(/Journey|Studio|Neural2/)
    expect(pick.voiceName).toBe('Male SceneFlow voice')
    expect(pick.voiceName).not.toMatch(/Algenib|Puck|Kore|Achernar|Charon|Fenrir/)
  })

  it('respects gender when mapping to a hidden base voice', () => {
    const male = pickGeminiBaseVoice('Bold cinematic adventure narrator.', {
      gender: 'male',
    })
    const female = pickGeminiBaseVoice('Intimate lyrical storyteller.', {
      gender: 'female',
    })

    expect(male.voiceId.startsWith('gemini-')).toBe(true)
    expect(female.voiceId.startsWith('gemini-')).toBe(true)
    expect(catalogGender(male.voiceId)).toBe('male')
    expect(catalogGender(female.voiceId)).toBe('female')
    expect(male.voiceName).toBe('Male SceneFlow voice')
    expect(female.voiceName).toBe('Female SceneFlow voice')
  })

  it('buildGoogleVoiceAssignment writes provider google plus the profile prompt', () => {
    const assignment = buildGoogleVoiceAssignment(
      'Close, human storyteller with thoughtful pacing.',
      { gender: 'female', name: 'Piper' },
    )

    expect(assignment.provider).toBe('google')
    expect(assignment.voiceId.startsWith('gemini-')).toBe(true)
    expect(assignment.prompt).toBe(
      'Close, human storyteller with thoughtful pacing.',
    )
    expect(assignment.voiceName).toBe('Female SceneFlow voice')
  })
})
