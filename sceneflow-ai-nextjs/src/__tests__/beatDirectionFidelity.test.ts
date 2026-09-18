import { describe, expect, it } from 'vitest'
import { scoreBeatDirectionFidelity } from '@/lib/intelligence/beatDirectionFidelity'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function intimidationBeat(): SceneBeat {
  return {
    beatId: 'bt_fidelity',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription:
      'Gideon plants the iron spanner beside Piper as she sits trapped against the wall.',
    beatDirection: {
      shotType: 'Two-Shot',
      cameraAngle: 'low angle',
      castInFrame: ['Piper Hayes', 'Gideon Croft'],
      keyProps: ['Thirty-Inch Iron Rail Spanner', 'dispatch cylinder'],
      frozenMoment:
        'Gideon plants the spanner beside Piper as she sits trapped against the brick wall.',
      blocking:
        'Piper sits trapped against the wall; Gideon leans his weight onto the spanner beside her shoulder.',
      emotion: 'Piper hunched defensively; Gideon jaw firmly set, staring her down.',
      gaze: 'Gideon stares directly down at Piper; Piper looks up.',
    },
  }
}

describe('scoreBeatDirectionFidelity', () => {
  it('scores a faithful rewrite as strong and holds cast, props, and action', () => {
    const beat = intimidationBeat()
    const rewritten = [
      'Two-Shot, low angle: both Piper Hayes and Gideon Croft fully in frame.',
      'Gideon plants the Thirty-Inch Iron Rail Spanner beside Piper as she sits trapped against the brick wall.',
      'Piper hunched defensively; Gideon jaw firmly set.',
      'Gideon stares directly down at Piper.',
      'dispatch cylinder in Piper\'s hands.',
    ].join(' ')

    const result = scoreBeatDirectionFidelity({ beat, rewrittenFraming: rewritten })
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.band).toBe('strong')
    expect(result.heldFacets).toEqual(
      expect.arrayContaining(['cast', 'props'])
    )
    expect(result.driftedFacets).not.toContain('cast')
    expect(result.driftedFacets).not.toContain('props')
  })

  it('treats missing cast names and props as severe drift', () => {
    const beat = intimidationBeat()
    const rewritten =
      'Two-Shot. A figure stands in a hallway holding a tool. Calm, even light.'

    const result = scoreBeatDirectionFidelity({ beat, rewrittenFraming: rewritten })
    expect(result.score).toBeLessThan(50)
    expect(result.band).toBe('drifted')
    expect(result.driftedFacets).toEqual(expect.arrayContaining(['cast', 'props']))
    expect(result.note).toMatch(/cast/)
    expect(result.note).toMatch(/props/)
  })

  it('drops blocking and emotion for Safety verb softening while holding cast and props', () => {
    const beat = intimidationBeat()
    const rewritten = [
      'Two-Shot, eye-level: Piper Hayes seated against the brick wall; Gideon Croft stands beside her.',
      'Thirty-Inch Iron Rail Spanner resting upright on the floor.',
      'dispatch cylinder held in both hands.',
      'Both look toward the cylinder.',
    ].join(' ')

    const result = scoreBeatDirectionFidelity({ beat, rewrittenFraming: rewritten })
    expect(result.heldFacets).toEqual(expect.arrayContaining(['cast', 'props']))
    expect(result.driftedFacets).toEqual(
      expect.arrayContaining(['blocking', 'emotion'])
    )
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.score).toBeLessThan(80)
    expect(result.band).toBe('moderate')
    expect(result.note).toMatch(/blocking/)
    expect(result.note).toMatch(/emotion/)
    expect(result.note).toMatch(/cast and props/)
    expect(result.note).toMatch(/held/)
  })
})
