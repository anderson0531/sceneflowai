import { describe, expect, it } from 'vitest'
import {
  normalizeBeatDirection,
  parseLlmBeats,
} from '@/lib/script/beatMigration'

describe('normalizeBeatDirection', () => {
  it('returns undefined for non-object input', () => {
    expect(normalizeBeatDirection(null)).toBeUndefined()
    expect(normalizeBeatDirection(undefined)).toBeUndefined()
    expect(normalizeBeatDirection('shot: wide')).toBeUndefined()
    expect(normalizeBeatDirection(42)).toBeUndefined()
  })

  it('returns undefined when no usable fields remain', () => {
    expect(normalizeBeatDirection({})).toBeUndefined()
    expect(
      normalizeBeatDirection({
        shotType: '   ',
        cameraAngle: '',
      })
    ).toBeUndefined()
  })

  it('trims whitespace and drops empty strings', () => {
    const d = normalizeBeatDirection({
      shotType: '  Medium Wide  ',
      cameraAngle: '',
      blocking: 'Two subjects flank the console',
    })
    expect(d).toEqual({
      shotType: 'Medium Wide',
      blocking: 'Two subjects flank the console',
    })
  })

  it('coerces snake_case aliases to canonical field names', () => {
    const d = normalizeBeatDirection({
      camera_angle: 'low',
      camera_movement: 'handheld push-in',
      key_props: ['journal', 'core'],
      prop_interaction: 'holds journal in left hand',
      lighting_accent: 'teal underlight',
      frozen_moment: 'Elara stares into the pulse.',
      audio_cue: 'proximity timer chirps',
    })
    expect(d).toMatchObject({
      cameraAngle: 'low',
      cameraMovement: 'handheld push-in',
      keyProps: ['journal', 'core'],
      propInteraction: 'holds journal in left hand',
      lightingAccent: 'teal underlight',
      frozenMoment: 'Elara stares into the pulse.',
      audioCue: 'proximity timer chirps',
    })
  })

  it('coerces transition values to the enum', () => {
    expect(normalizeBeatDirection({ transition: 'cut' })).toEqual({
      transition: 'CUT',
    })
    expect(normalizeBeatDirection({ transition: 'match cut' })).toEqual({
      transition: 'MATCH_CUT',
    })
    expect(normalizeBeatDirection({ transition: 'match-cut' })).toEqual({
      transition: 'MATCH_CUT',
    })
    expect(normalizeBeatDirection({ transition: 'weird-unknown' })).toBeUndefined()
  })

  it('dedupes and cleans keyProps arrays', () => {
    const d = normalizeBeatDirection({
      keyProps: [' Journal ', 'Journal', '', 'Core', 'core'],
    })
    expect(d?.keyProps).toEqual(['Journal', 'Core'])
  })

  it('parseLlmBeats attaches normalized beatDirection to each beat', () => {
    const beats = parseLlmBeats([
      {
        kind: 'action',
        actionDescription: 'Elara raises the journal.',
        beatDirection: {
          shotType: 'Medium Close-Up',
          cameraAngle: 'low angle',
          keyProps: ['Journal'],
          transition: 'CUT',
        },
      },
      {
        kind: 'dialogue',
        character: 'ELARA',
        line: 'Ready.',
        direction: { emotion: 'resolute', blocking: 'faces the console' },
      },
    ])

    expect(beats).toHaveLength(2)
    expect(beats[0].beatDirection).toMatchObject({
      shotType: 'Medium Close-Up',
      cameraAngle: 'low angle',
      keyProps: ['Journal'],
      transition: 'CUT',
      generatedBy: 'llm',
    })
    expect(beats[1].beatDirection).toMatchObject({
      emotion: 'resolute',
      blocking: 'faces the console',
      generatedBy: 'llm',
    })
  })

  it('parseLlmBeats leaves beatDirection undefined when LLM omits it', () => {
    const beats = parseLlmBeats([
      { kind: 'action', actionDescription: 'A silent hallway.' },
    ])
    expect(beats[0].beatDirection).toBeUndefined()
  })
})
