import { describe, expect, it } from 'vitest'
import {
  applyCastingBriefUpdate,
  isNarratorCharacter,
  refreshCastingBriefForAppearance,
} from '@/lib/character/applyCastingBriefUpdate'

describe('isNarratorCharacter', () => {
  it('detects narrator by type, role, or name', () => {
    expect(isNarratorCharacter({ type: 'narrator' })).toBe(true)
    expect(isNarratorCharacter({ role: 'Narrator' })).toBe(true)
    expect(isNarratorCharacter({ name: 'narrator' })).toBe(true)
    expect(isNarratorCharacter({ name: 'Julian Ward', role: 'fixer' })).toBe(false)
  })
})

describe('applyCastingBriefUpdate', () => {
  it('returns voiceDescription when no voice is assigned', () => {
    const applied = applyCastingBriefUpdate(
      { name: 'Julian Ward', gender: 'male' },
      'Late 50s gravelly baritone, unhurried corporate detachment.',
    )
    expect(applied.voiceDescription).toContain('gravelly baritone')
    expect(applied.voiceConfig).toBeUndefined()
  })

  it('writes the brief onto an existing voiceConfig prompt without rematching if there is no voiceId', () => {
    const applied = applyCastingBriefUpdate(
      {
        name: 'Julian Ward',
        voiceConfig: { provider: 'google', prompt: 'old brief' },
      },
      'New casting brief with a dry gravelly edge.',
    )
    expect(applied.voiceConfig?.prompt).toBe('New casting brief with a dry gravelly edge.')
    expect(applied.voiceConfig?.voiceId).toBeUndefined()
  })

  it('silently rematches an assigned Gemini voice from the new brief', () => {
    const applied = applyCastingBriefUpdate(
      {
        name: 'Julian Ward',
        gender: 'male',
        age: 'late 50s',
        role: 'corporate fixer',
        voiceConfig: {
          provider: 'google',
          voiceId: 'gemini-Puck',
          voiceName: 'Puck (Gemini)',
          prompt: 'Bright playful sidekick',
        },
      },
      'A male voice in his late 50s. Clinical baritone with a dry, gravelly edge. Unhurried, measured delivery. Corporate detachment.',
    )
    expect(applied.voiceDescription).toContain('gravelly')
    expect(applied.voiceConfig?.voiceId).toBe('gemini-Algenib')
    expect(applied.voiceConfig?.prompt).toContain('gravelly')
  })
})

describe('refreshCastingBriefForAppearance', () => {
  it('skips narrator characters without calling the API', async () => {
    const applied = await refreshCastingBriefForAppearance({
      character: { name: 'Narrator', type: 'narrator' },
      appearanceDescription: 'Should not matter',
    })
    expect(applied).toBeNull()
  })
})
