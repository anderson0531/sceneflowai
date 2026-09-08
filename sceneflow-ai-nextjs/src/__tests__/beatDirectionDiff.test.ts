import { describe, expect, it } from 'vitest'
import {
  beatChangeSummary,
  beatDirectionChanged,
  beatDirectionFacetSummary,
  diffSceneChanges,
} from '@/lib/script/sceneDiffChanges'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function buildBeat(
  direction?: SceneBeat['beatDirection'],
  actionOverride?: string
): SceneBeat {
  return {
    beatId: 'bt-1',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: actionOverride ?? 'Elara faces the console.',
    beatDirection: direction,
  }
}

describe('beat direction diff helpers', () => {
  it('detects when beat direction fields change even without prose change', () => {
    const original = {
      heading: 'INT. CONTROL ROOM - NIGHT',
      beats: [buildBeat({ shotType: 'Medium Close-Up', emotion: 'wary' })],
    }
    const candidate = {
      heading: 'INT. CONTROL ROOM - NIGHT',
      beats: [buildBeat({ shotType: 'Insert Shot', emotion: 'resolute' })],
    }
    const changes = diffSceneChanges(original, candidate)
    expect(changes).toContain('beat:bt-1')

    const summary = beatChangeSummary(original, candidate, 'bt-1')
    expect(summary.status).toBe('changed')
    expect(beatDirectionChanged(summary.original, summary.candidate)).toBe(true)
  })

  it('formats facet summary in human-readable order', () => {
    const facets = beatDirectionFacetSummary(
      buildBeat({
        shotType: 'Insert Shot',
        cameraAngle: 'low angle',
        blocking: 'she brings the journal to her chest',
        emotion: 'hypnotic awe',
        keyProps: ['Journal', 'Core'],
        transition: 'CUT',
      })
    )
    expect(facets[0]).toMatch(/Shot: Insert Shot/)
    expect(facets).toContain('Angle: low angle')
    expect(facets).toContain('Emotion: hypnotic awe')
    expect(facets).toContain('Key props: Journal, Core')
    expect(facets).toContain('Transition: CUT')
  })

  it('returns empty summary array when no beat direction is present', () => {
    expect(beatDirectionFacetSummary(buildBeat())).toEqual([])
    expect(beatDirectionFacetSummary(undefined)).toEqual([])
  })

  it('reports no direction change when text is identical', () => {
    const dir: SceneBeat['beatDirection'] = { shotType: 'Wide', emotion: 'calm' }
    const a = buildBeat(dir)
    const b = buildBeat({ ...dir })
    expect(beatDirectionChanged(a, b)).toBe(false)
  })
})
