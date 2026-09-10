import { describe, expect, it } from 'vitest'
import {
  reconcilePickerGender,
  resolveAutoVoiceScoringGender,
} from '@/lib/tts/autoVoiceGender'
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

  it('scores the matching brief and persists a separate director note', () => {
    const assignment = buildGoogleVoiceAssignment(
      'Authoritative, measured, resonant male voice.',
      {
        gender: 'male',
        name: 'Gideon',
        prompt:
          'A late-40s male baritone, warm and slightly husky. Measured pacing with quiet authority.',
      },
    )

    expect(assignment.voiceId.startsWith('gemini-')).toBe(true)
    expect(assignment.prompt).toContain('late-40s male baritone')
    expect(assignment.prompt).not.toContain('Authoritative, measured, resonant')
  })
})

const REPORTER_PROFILE =
  'A female voice in her late 30s to early 40s of African American descent, possessing a grounded, smoky alto pitch with a textured, fatigue-worn rasp. Her cadence is sharp, propulsive, and articulate, carrying the brisk, probing efficiency of a seasoned investigative reporter layered with a subtle Chicago urban inflection. Guided by fierce empathy and hard-bitten skepticism, her vocal delivery cuts through atmospheric dread with steady, low-register conviction. Underneath the guarded, razor-edged intensity lies an unyielding moral urgency, projecting a survivor who speaks with tactical clarity even under extreme peril.'

describe('resolveAutoVoiceScoringGender', () => {
  it('prefers the confirm-dialog override over vision analysis', () => {
    expect(
      resolveAutoVoiceScoringGender({
        genderOverride: 'female',
        genderSource: 'ai',
        characterGender: 'male',
        analysisGender: 'male',
      }),
    ).toBe('female')
  })

  it('prefers a user-set character gender over vision analysis', () => {
    expect(
      resolveAutoVoiceScoringGender({
        genderSource: 'user',
        characterGender: 'female',
        analysisGender: 'male',
      }),
    ).toBe('female')
  })

  it('uses vision analysis when gender is not user-set', () => {
    expect(
      resolveAutoVoiceScoringGender({
        genderSource: 'ai',
        characterGender: 'male',
        analysisGender: 'female',
      }),
    ).toBe('female')
  })
})

describe('reconcilePickerGender', () => {
  it('lets a female voice profile override a conflicting explicit male gender', () => {
    expect(reconcilePickerGender(REPORTER_PROFILE, 'male')).toBe('female')
  })

  it('lets a male voice profile override a conflicting explicit female gender', () => {
    expect(
      reconcilePickerGender('A male voice in his late 40s, resonant baritone.', 'female'),
    ).toBe('male')
  })
})

describe('pickGeminiBaseVoice gender from profile', () => {
  it('picks a female catalog voice from the reporter profile with no gender option', () => {
    const pick = pickGeminiBaseVoice(REPORTER_PROFILE)
    expect(catalogGender(pick.voiceId)).toBe('female')
    expect(pick.voiceName).toBe('Female SceneFlow voice')
  })

  it('picks a female catalog voice even when options.gender is male', () => {
    const pick = pickGeminiBaseVoice(REPORTER_PROFILE, { gender: 'male' })
    expect(catalogGender(pick.voiceId)).toBe('female')
    expect(pick.voiceName).toBe('Female SceneFlow voice')
  })

  it('picks a female catalog voice when options.gender is female', () => {
    const pick = pickGeminiBaseVoice(REPORTER_PROFILE, { gender: 'female' })
    expect(catalogGender(pick.voiceId)).toBe('female')
  })

  it('picks a male catalog voice when a male profile conflicts with explicit female', () => {
    const pick = pickGeminiBaseVoice(
      'A male voice in his late 40s, resonant baritone with measured pacing.',
      { gender: 'female' },
    )
    expect(catalogGender(pick.voiceId)).toBe('male')
    expect(pick.voiceName).toBe('Male SceneFlow voice')
  })
})
