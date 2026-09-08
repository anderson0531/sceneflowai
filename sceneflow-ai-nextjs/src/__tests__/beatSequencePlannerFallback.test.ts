import { describe, it, expect } from 'vitest'
import { buildFallbackBeatPlans } from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('buildFallbackBeatPlans photorealistic prompts', () => {
  it('emits Action/Framing stills without F2V start-frame language', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_0',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Hero enters the room',
      },
    ]

    const plans = buildFallbackBeatPlans({
      scene: {
        heading: 'INT. OFFICE - DAY',
        action: 'Hero enters the room',
      },
      beats,
      sceneNumber: 1,
      artStyle: 'photorealistic',
    })

    expect(plans).toHaveLength(1)
    expect(plans[0].prompt).toContain('Hero enters the room')
    expect(plans[0].prompt.toLowerCase()).not.toContain('f2v')
    expect(plans[0].prompt.toLowerCase()).not.toContain('start frame')
    expect(plans[0].prompt.toLowerCase()).not.toContain('storyboard still')
  })

  it('does not inherit another character’s scene-description sentence on dialogue beats', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_dlg',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Gideon',
        line: 'I reclaimed this room.',
      },
    ]

    const plans = buildFallbackBeatPlans({
      scene: {
        heading: 'INT. BRIEFING ROOM - DAY',
        action: 'The briefing continues.',
        sceneDirection: {
          sceneDescription:
            'Piper Hayes storms the briefing room and slams a folder on the table. Gideon reclaims his academic authority.',
        },
      },
      beats,
      sceneNumber: 2,
      artStyle: 'photorealistic',
    })

    expect(plans).toHaveLength(1)
    expect(plans[0].frozenMoment).toContain('Gideon')
    expect(plans[0].frozenMoment).toContain('I reclaimed this room')
    expect(plans[0].prompt).not.toMatch(/Piper Hayes/)
  })
})
