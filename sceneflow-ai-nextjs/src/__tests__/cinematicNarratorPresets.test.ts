import { describe, expect, it } from 'vitest'
import {
  CINEMATIC_NARRATOR_PRESETS,
  DEFAULT_CINEMATIC_NARRATOR,
  getCinematicNarratorPreset,
  getNarratorPresetsByGender,
} from '@/lib/tts/cinematicNarratorPresets'

describe('cinematicNarratorPresets', () => {
  it('has six presets split 3 male / 3 female, each with profile text and a hidden gemini base', () => {
    expect(CINEMATIC_NARRATOR_PRESETS).toHaveLength(6)
    expect(getNarratorPresetsByGender('male')).toHaveLength(3)
    expect(getNarratorPresetsByGender('female')).toHaveLength(3)

    for (const preset of CINEMATIC_NARRATOR_PRESETS) {
      expect(preset.profile.trim().length).toBeGreaterThan(20)
      expect(preset.voiceId.startsWith('gemini-')).toBe(true)
      expect(preset.displayName).not.toMatch(
        /Achernar|Puck|Kore|Algenib|Charon|Fenrir|Zephyr/i,
      )
    }
  })

  it('resolves presets by id or hidden voice id', () => {
    expect(getCinematicNarratorPreset('warm-documentary')?.displayName).toBe(
      'Warm Documentary',
    )
    expect(getCinematicNarratorPreset('gemini-Kore')?.id).toBe(
      'intimate-storyteller',
    )
    expect(DEFAULT_CINEMATIC_NARRATOR.id).toBe('warm-documentary')
  })
})
