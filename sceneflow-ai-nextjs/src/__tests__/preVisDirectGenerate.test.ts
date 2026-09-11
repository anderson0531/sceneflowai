import { describe, it, expect } from 'vitest'
import {
  buildPreVisDirectApiFields,
  shouldUseCustomPromptOverride,
} from '@/lib/vision/preVisDirectGenerate'
import type { VisualSetup, TalentDirection } from '@/components/image-gen/types'

const visualSetup: VisualSetup = {
  location: 'INT. KITCHEN',
  timeOfDay: 'day',
  weather: 'clear',
  atmosphere: 'neutral',
  shotType: 'medium-shot',
  cameraAngle: 'eye-level',
  lighting: 'natural',
}

const talentDirection: TalentDirection = {
  talentBlocking: '',
  emotionalBeat: '',
  keyProps: '',
}

describe('buildPreVisDirectApiFields', () => {
  it('never includes customPrompt, even when direction is empty', () => {
    const fields = buildPreVisDirectApiFields({
      visualSetup,
      talentDirection,
      artStyle: 'photorealistic',
      modelTier: 'eco',
      thinkingLevel: 'low',
    })

    expect(fields).not.toHaveProperty('customPrompt')
    expect(fields.generationMode).toBe('direct')
    expect(fields.fromDialog).toBe(true)
    expect(fields.visualSetup).toEqual(visualSetup)
    expect(fields).not.toHaveProperty('userDirection')
  })

  it('passes trimmed userDirection and visual overlays', () => {
    const fields = buildPreVisDirectApiFields({
      visualSetup: { ...visualSetup, lighting: 'cold' },
      talentDirection: { ...talentDirection, talentBlocking: 'Maya at the counter' },
      userDirection: '  Closer on Maya, keep the coffee cup  ',
      artStyle: 'photorealistic',
      modelTier: 'designer',
      thinkingLevel: 'high',
    })

    expect(fields.userDirection).toBe('Closer on Maya, keep the coffee cup')
    expect((fields.visualSetup as VisualSetup).lighting).toBe('cold')
    expect((fields.talentDirection as TalentDirection).talentBlocking).toBe('Maya at the counter')
    expect(fields).not.toHaveProperty('customPrompt')
  })
})

describe('shouldUseCustomPromptOverride', () => {
  it('skips the custom-prompt compiler bypass in Direct mode', () => {
    expect(shouldUseCustomPromptOverride('direct', 'adhoc prompt text')).toBe(false)
  })

  it('allows custom prompt override for non-Direct modes', () => {
    expect(shouldUseCustomPromptOverride('default', 'adhoc prompt text')).toBe(true)
    expect(shouldUseCustomPromptOverride('default', '  ')).toBe(false)
  })
})
