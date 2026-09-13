import { describe, it, expect } from 'vitest'
import {
  buildPolicySafePhrasingRules,
  softenStillPhrasingForPolicy,
} from '@/lib/generation/policySafePhrasing'
import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import { buildBeatDirectionPromptBlock } from '@/lib/script/narrationPolicy'
import { buildSceneImageSystemPrompt } from '@/lib/intelligence/scene-image-intelligence'
import { buildPlannerSystemPrompt } from '@/lib/intelligence/beat-sequence-planner-fallback'
import { readFileSync } from 'fs'
import path from 'path'
import type { SceneBeat } from '@/lib/script/segmentTypes'

/**
 * The frame Vertex refused in production on 2026-09-13. Every construction the
 * softener exists for is in this one sentence, so it is the fixture.
 */
const REFUSED_FROZEN_MOMENT =
  'A heavy iron spanner slams into the stone an inch from her fingers, showering sparks. Gideon looms over her, his eyes feral.'

describe('softenStillPhrasingForPolicy', () => {
  it('rewrites every refusal trigger in the frame production refused', () => {
    const { text, changes } = softenStillPhrasingForPolicy(REFUSED_FROZEN_MOMENT)

    expect(text).not.toMatch(/slams into/i)
    expect(text).not.toMatch(/an inch from/i)
    expect(text).not.toMatch(/looms over/i)
    expect(text).not.toMatch(/feral/i)
    expect(changes.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps the prop, the cast and the visual detail that make the shot', () => {
    const { text } = softenStillPhrasingForPolicy(REFUSED_FROZEN_MOMENT)

    expect(text).toContain('spanner')
    expect(text).toContain('Gideon')
    expect(text).toContain('her fingers')
    expect(text).toContain('showering sparks')
    expect(text).toContain('stone')
  })

  it('turns an impact verb aimed at a body part into a near miss', () => {
    const { text } = softenStillPhrasingForPolicy('The pipe slams her wrist against the rail.')

    expect(text).toContain('stops just short of her wrist')
    expect(text).toContain('pipe')
    expect(text).not.toMatch(/slams her wrist/i)
  })

  it('replaces a predatory metaphor with a directable expression', () => {
    const { text } = softenStillPhrasingForPolicy('He stands still, his eyes feral, breath short.')

    expect(text).toContain('jaw set')
    expect(text).not.toMatch(/feral/i)
    expect(text).toContain('breath short')
  })

  it('settles a weapon-ready posture without dropping the implement', () => {
    const { text } = softenStillPhrasingForPolicy(
      'The crowbar is cocked back over his shoulder, mid-swing.'
    )

    expect(text).toContain('crowbar')
    expect(text).toContain('held at')
    expect(text).toContain('at rest')
    expect(text).not.toMatch(/cocked back/i)
    expect(text).not.toMatch(/mid-swing/i)
  })

  it('agrees in number with a plural subject', () => {
    const { text } = softenStillPhrasingForPolicy('Both spanners slam into the wall.')

    expect(text).toBe('Both spanners rest embedded in the wall.')
  })

  it('returns clean direction byte-identical and reports no changes', () => {
    const clean =
      "Elise's open hand is flat on the cold stone, the journal splayed beside it, pages lifting in the draft."
    const { text, changes } = softenStillPhrasingForPolicy(clean)

    expect(text).toBe(clean)
    expect(changes).toEqual([])
  })

  it('handles empty and missing direction', () => {
    expect(softenStillPhrasingForPolicy(undefined)).toEqual({ text: '', changes: [] })
    expect(softenStillPhrasingForPolicy(null)).toEqual({ text: '', changes: [] })
    expect(softenStillPhrasingForPolicy('   ')).toEqual({ text: '', changes: [] })
  })

  it('logs each rewrite as a before and after pair', () => {
    const { changes } = softenStillPhrasingForPolicy('The spanner slams into the stone.')

    expect(changes).toHaveLength(1)
    expect(changes[0]).toContain('slams into')
    expect(changes[0]).toContain('rests embedded in')
  })
})

/**
 * A prop reference image is kept only while the frame still names the prop by
 * its head noun, so a softener that renamed the prop would silently discard the
 * reference it was meant to protect. This is the guard on that.
 */
describe('prop head-noun preservation', () => {
  const PROP_NOUNS = [
    'spanner',
    'crowbar',
    'journal',
    'lantern',
    'revolver',
    'knife',
    'rifle',
    'hammer',
    'axe',
    'blade',
  ]

  it('never rewrites a prop noun', () => {
    for (const noun of PROP_NOUNS) {
      const { text } = softenStillPhrasingForPolicy(
        `The ${noun} slams into the stone an inch from her hand, ${noun} still trembling.`
      )
      expect(text, `"${noun}" must survive softening`).toContain(noun)
    }
  })

  it('never substitutes a generic stand-in for a prop', () => {
    const { text } = softenStillPhrasingForPolicy(
      'The revolver is raised to strike, murderous intent in his face.'
    )

    expect(text).toContain('revolver')
    expect(text).not.toMatch(/\bweapon\b/i)
    expect(text).not.toMatch(/stage prop/i)
    expect(text).not.toMatch(/\bobject\b/i)
  })

  it('leaves character names untouched', () => {
    const { text } = softenStillPhrasingForPolicy(
      'Gideon looms over Elise, his eyes feral, while Marcus white-knuckling the rail.'
    )

    expect(text).toContain('Gideon')
    expect(text).toContain('Elise')
    expect(text).toContain('Marcus')
  })
})

describe('composeBeatActionFraming policy softening', () => {
  function beatWith(direction: SceneBeat['beatDirection']): SceneBeat {
    return {
      beatId: 'bt_policy',
      sequenceIndex: 0,
      kind: 'action',
      beatDirection: direction,
    }
  }

  it('softens frozenMoment on the way into the still prompt', () => {
    const framing = composeBeatActionFraming(
      beatWith({
        frozenMoment: REFUSED_FROZEN_MOMENT,
        shotType: 'Medium close-up',
      })
    )

    expect(framing).not.toMatch(/slams into/i)
    expect(framing).not.toMatch(/an inch from/i)
    expect(framing).not.toMatch(/feral/i)
    expect(framing).toContain('spanner')
  })

  it('softens blocking and propInteraction as well', () => {
    const framing = composeBeatActionFraming(
      beatWith({
        frozenMoment: 'The workshop is silent.',
        blocking: 'He looms over her, body cocked back.',
        propInteraction: 'Both hands white-knuckling the spanner shaft.',
      })
    )

    expect(framing).not.toMatch(/looms over/i)
    expect(framing).not.toMatch(/cocked back/i)
    expect(framing).not.toMatch(/white-knuckling/i)
    expect(framing).toContain('stands over')
    expect(framing).toContain('gripping')
    expect(framing).toContain('spanner')
  })

  it('leaves a clean beat unchanged', () => {
    const clean = 'Her open hand rests flat on the cold stone, dust settling around it.'
    const framing = composeBeatActionFraming(beatWith({ frozenMoment: clean }))

    expect(framing).toContain(clean)
  })
})

describe('buildPolicySafePhrasingRules', () => {
  it('teaches the reframe rather than banning words', () => {
    const rules = buildPolicySafePhrasingRules()

    expect(rules).toContain('Name the settled result, not the blow')
    expect(rules).toContain('Rejected:')
    expect(rules).toContain('Accepted:')
    expect(rules).toContain('impact verb')
  })

  it('tells the model to keep the prop name so references stay bound', () => {
    const rules = buildPolicySafePhrasingRules()

    expect(rules).toContain("Keep every prop's real name")
    expect(rules).toMatch(/reference image is bound to the prop's own noun/)
  })

  it('carries a worked rewrite of the same composition', () => {
    const rules = buildPolicySafePhrasingRules()

    expect(rules).toContain('slams into the stone an inch from her fingers')
    expect(rules).toContain('buried in cracked stone beside her open hand')
  })

  it('keeps the compact variant to a single line for the longform path', () => {
    const compact = buildPolicySafePhrasingRules({ compact: true })

    expect(compact).not.toContain('\n')
    expect(compact.length).toBeLessThan(buildPolicySafePhrasingRules().length)
    expect(compact).toContain('settled result')
    expect(compact).toContain("prop's real name")
  })
})

/**
 * The rules only prevent refusals if they actually reach every model that
 * authors beat direction. These pin the four wiring points.
 */
describe('policy phrasing reaches every authoring prompt', () => {
  const marker = 'Name the settled result, not the blow'

  it('is in the beat direction prompt block', () => {
    expect(buildBeatDirectionPromptBlock()).toContain(marker)
  })

  it('is in the compact beat direction prompt block', () => {
    const compact = buildBeatDirectionPromptBlock({ compact: true })
    expect(compact).toContain('settled result')
  })

  it('is in the Express planner system prompt', () => {
    expect(buildPlannerSystemPrompt()).toContain(marker)
  })

  it('is in the scene image intelligence system prompt', () => {
    expect(buildSceneImageSystemPrompt()).toContain(marker)
  })

  it('is in the scene revision prompt', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/app/api/vision/revise-scene/route.ts'),
      'utf8'
    )
    expect(source).toContain('buildPolicySafePhrasingRules()')
  })
})
