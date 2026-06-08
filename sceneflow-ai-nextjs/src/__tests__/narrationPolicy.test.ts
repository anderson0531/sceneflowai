import { describe, it, expect } from 'vitest'
import {
  resolveNarrationPolicy,
  treatmentHasNarratorCharacter,
  enforceNarrationPolicyOnScenes,
  sceneAllowsNarration,
  calculateShowVsTellMetrics,
  applyShowVsTellAutoCap,
  buildScriptARShowVsTellGuidance,
} from '@/lib/script/narrationPolicy'
import { NARRATOR_CHARACTER, NARRATOR_CHARACTER_ID } from '@/lib/script/segmentTypes'

describe('resolveNarrationPolicy', () => {
  it('uses minimal mode for short-film without blueprint narrator', () => {
    const policy = resolveNarrationPolicy({
      format: 'short-film',
      treatment: { character_descriptions: [{ name: 'Alice', role: 'Protagonist' }] },
    })
    expect(policy.mode).toBe('minimal')
    expect(policy.allowNarration).toBe(false)
    expect(policy.allowPerSceneNarration).toBe(false)
    expect(policy.blueprintHasNarrator).toBe(false)
  })

  it('allows narration when blueprint defines a Narrator character', () => {
    const policy = resolveNarrationPolicy({
      format: 'short-film',
      treatment: {
        character_descriptions: [{ name: 'Jane Doe', role: 'Narrator' }],
      },
    })
    expect(policy.blueprintHasNarrator).toBe(true)
    expect(policy.allowNarration).toBe(true)
    expect(policy.allowPerSceneNarration).toBe(true)
  })

  it('uses narrative-driven mode for documentary', () => {
    const policy = resolveNarrationPolicy({ format: 'documentary' })
    expect(policy.mode).toBe('narrative-driven')
    expect(policy.allowPerSceneNarration).toBe(true)
  })

  it('uses moderate mode for educational content', () => {
    const policy = resolveNarrationPolicy({ format: 'educational' })
    expect(policy.mode).toBe('moderate')
    expect(policy.allowPerSceneNarration).toBe(true)
  })
})

describe('treatmentHasNarratorCharacter', () => {
  it('detects voiceover in role', () => {
    expect(
      treatmentHasNarratorCharacter({
        character_descriptions: [{ name: 'Host', role: 'Voiceover artist' }],
      })
    ).toBe(true)
  })
})

describe('enforceNarrationPolicyOnScenes', () => {
  const minimalPolicy = resolveNarrationPolicy({
    format: 'short-film',
    treatment: { character_descriptions: [] },
  })

  it('strips narration from middle content scenes', () => {
    const scenes = [
      { sceneNumber: 1, cinematicType: 'title', heading: 'INT. TITLE SEQUENCE - DAY', narration: '' },
      {
        sceneNumber: 2,
        heading: 'INT. OFFICE - DAY',
        narration: 'He felt afraid of what was coming.',
        dialogue: [
          { character: NARRATOR_CHARACTER, line: '[calm] Omniscient voiceover.' },
          { character: 'Alice', line: '[nervous] Hello.' },
        ],
        beats: [
          { kind: 'narration', character: NARRATOR_CHARACTER, line: 'Omniscient voiceover.' },
          { kind: 'dialogue', character: 'Alice', line: '[nervous] Hello.' },
        ],
      },
      { sceneNumber: 3, cinematicType: 'outro', heading: 'INT. CREDITS - DAY', narration: '' },
    ]

    const result = enforceNarrationPolicyOnScenes(scenes, minimalPolicy)
    const middle = result[1] as Record<string, unknown>

    expect(middle.narration).toBe('')
    expect(
      (middle.dialogue as Array<{ character: string }>).some((d) =>
        d.character?.toUpperCase().includes('NARRATOR')
      )
    ).toBe(false)
    expect(
      (middle.beats as Array<{ kind: string }>).some((b) => b.kind === 'narration')
    ).toBe(false)
  })

  it('preserves optional title-sequence narration when allowed', () => {
    const titleScene = {
      sceneNumber: 1,
      cinematicType: 'title',
      heading: 'INT. TITLE SEQUENCE - DAY',
      narration: 'Once upon a time in a distant land.',
      beats: [
        {
          kind: 'narration',
          character: NARRATOR_CHARACTER,
          characterId: NARRATOR_CHARACTER_ID,
          line: 'Once upon a time in a distant land.',
        },
      ],
    }
    expect(sceneAllowsNarration(titleScene, 0, 3, minimalPolicy)).toBe(true)

    const result = enforceNarrationPolicyOnScenes([titleScene], minimalPolicy)
    expect((result[0] as { narration?: string }).narration).toContain('Once upon')
  })
})

describe('calculateShowVsTellMetrics', () => {
  it('counts narrator dialogue and beats as narration words', () => {
    const scenes = [
      {
        narration: 'Legacy voiceover block.',
        dialogue: [
          { character: NARRATOR_CHARACTER, line: 'Narrator speaks here too.' },
          { character: 'Bob', line: 'Hi there friend.' },
        ],
        beats: [{ kind: 'narration', line: 'Beat narration words.' }],
        action: 'Bob waves hello warmly.',
      },
    ]

    const metrics = calculateShowVsTellMetrics(scenes)
    expect(metrics.narrationWords).toBeGreaterThan(5)
    expect(metrics.dialogueWords).toBe(3)
    expect(metrics.ratio).toBeGreaterThan(0)
  })
})

describe('applyShowVsTellAutoCap', () => {
  it('does not cap documentary scripts for high narration ratio', () => {
    const policy = resolveNarrationPolicy({ format: 'documentary' })
    const { autoScoreCap } = applyShowVsTellAutoCap(55, policy)
    expect(autoScoreCap).toBe(100)
  })

  it('caps fiction scripts with excessive narration', () => {
    const policy = resolveNarrationPolicy({ format: 'short-film' })
    const { autoScoreCap } = applyShowVsTellAutoCap(45, policy)
    expect(autoScoreCap).toBe(82)
  })
})

describe('buildScriptARShowVsTellGuidance', () => {
  it('tells AR not to penalize documentary narration', () => {
    const policy = resolveNarrationPolicy({ format: 'documentary' })
    const { formatContext } = buildScriptARShowVsTellGuidance(policy)
    expect(formatContext).toMatch(/documentary|narrative-driven/i)
    expect(formatContext).toMatch(/Do NOT penalize/i)
  })
})
