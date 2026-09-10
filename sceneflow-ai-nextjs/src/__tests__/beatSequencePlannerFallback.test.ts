import { describe, it, expect } from 'vitest'
import { buildFallbackBeatPlans } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  PROJECT_LOOKBOOK_VERSION,
  type ProjectLookbook,
} from '@/lib/intelligence/project-lookbook-fallback'
import { parseStillPromptSource } from '@/lib/imagen/structuredStillPrompt'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const lookbook: ProjectLookbook = {
  version: PROJECT_LOOKBOOK_VERSION,
  fingerprint: 'deadbeef',
  masterStyle: 'Rain-slick neo-noir, live-action photoreal',
  colorPalette: 'Sodium orange against slate blue',
  lightingGrammar: 'Single hard key from a practical, deep falloff',
  lensAndFormat: 'Anamorphic 40mm, 2.39:1',
  textureAndGrade: '35mm grain, crushed blacks',
  negativeStyleTerms: ['illustration', 'cartoon'],
  sceneLooks: [{ sceneIndex: 0, lookNote: 'Warmer interior spill from the desk lamp' }],
  generatedAt: '2026-01-01T00:00:00.000Z',
}

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

describe('buildFallbackBeatPlans under a project lookbook', () => {
  const beats: SceneBeat[] = [
    {
      beatId: 'bt_0',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Hero enters the room',
    },
    {
      beatId: 'bt_1',
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: 'Hero sets the folder down',
    },
  ]

  const scene = {
    heading: 'INT. OFFICE - NIGHT',
    action: 'Hero enters the room',
    sceneDirection: { lighting: { overallMood: 'Low-key desk lamp' } },
  }

  it('wraps every beat in the film-wide style anchor', () => {
    const plans = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      lookbook,
      artStyle: 'photorealistic',
    })

    expect(plans).toHaveLength(2)
    for (const plan of plans) {
      expect(plan.prompt.startsWith('[GLOBAL STYLE ANCHOR]')).toBe(true)
      expect(plan.prompt).toContain('Rain-slick neo-noir')
      expect(plan.prompt).toContain('Anamorphic 40mm')
      expect(plan.prompt).toContain('Sodium orange against slate blue')
      expect(plan.prompt).toContain('35mm grain, crushed blacks')
      expect(plan.prompt).toContain('[SCENE COMPOSITION & BEAT]')
    }

    // Every beat of this scene carries the same look, and only the same look.
    const anchors = plans.map((p) => p.prompt.split('[SCENE COMPOSITION & BEAT]')[0])
    expect(new Set(anchors).size).toBe(1)
    expect(anchors[0]).toContain('Warmer interior spill from the desk lamp')
  })

  it('keeps the style prose out of the parsed action text', () => {
    const [plan] = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      lookbook,
      artStyle: 'photorealistic',
    })

    const { actionFraming, style } = parseStillPromptSource(plan.prompt)
    expect(actionFraming).toContain('Hero enters the room')
    expect(actionFraming).not.toMatch(/neo-noir|Anamorphic|crushed blacks/i)
    expect(style).toContain('Rain-slick neo-noir')
  })

  it('emits bare action text when the project has no lookbook', () => {
    const [plan] = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      artStyle: 'photorealistic',
    })

    expect(plan.prompt).not.toContain('[GLOBAL STYLE ANCHOR]')
    expect(plan.prompt).not.toContain('[SCENE COMPOSITION & BEAT]')
    expect(plan.prompt).toContain('Hero enters the room')
  })

  it('carries the direction lighting mood onto the plan for direction gap-fill', () => {
    const [plan] = buildFallbackBeatPlans({
      scene,
      beats,
      sceneNumber: 1,
      lookbook,
    })

    expect(plan.lighting).toBe('Low-key desk lamp')
    expect(plan.prompt).toContain('Low-key desk lamp')
  })
})
