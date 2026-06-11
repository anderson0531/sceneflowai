import { describe, it, expect } from 'vitest'
import { buildFallbackBeatPlans } from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('buildFallbackBeatPlans photorealistic prompts', () => {
  it('uses live-action film still language instead of storyboard still', () => {
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
    expect(plans[0].prompt.toLowerCase()).toContain('live-action film still')
    expect(plans[0].prompt.toLowerCase()).not.toContain('storyboard still')
  })
})
