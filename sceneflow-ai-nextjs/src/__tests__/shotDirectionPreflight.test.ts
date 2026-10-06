import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  shotNeedsDirectionRewrite,
  STILL_DIRECTOR_BEAT_CHUNK,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

function beat(overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId: 'bt_preflight',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: 'Gideon sets the brick on the table.',
    ...overrides,
  }
}

describe('shotNeedsDirectionRewrite', () => {
  it('rewrites a shot that has no frozen moment or blocking', () => {
    expect(
      shotNeedsDirectionRewrite(
        beat({ beatDirection: { frozenMoment: 'a hand on the brick' } })
      )
    ).toBe(true)
  })

  it('leaves a user-locked shot alone', () => {
    expect(
      shotNeedsDirectionRewrite(
        beat({ beatDirection: { generatedBy: 'user' } })
      )
    ).toBe(false)
  })

  it('rewrites when a resolved plate is not named in the composed text', () => {
    expect(
      shotNeedsDirectionRewrite(
        beat({
          beatDirection: {
            frozenMoment: 'a hand closes on the brick',
            blocking: 'centered at the table',
          },
        }),
        { composedText: 'a hand closes on the brick at the table', plateNames: ['Piper'] }
      )
    ).toBe(true)
  })

  it('skips a shot that already names its plates', () => {
    expect(
      shotNeedsDirectionRewrite(
        beat({
          beatDirection: {
            frozenMoment: 'Piper looks down at the brick',
            blocking: 'Piper at the table',
            castInFrame: ['Piper'],
          },
        }),
        { composedText: 'Piper at the table looks down at the brick', plateNames: ['Piper'] }
      )
    ).toBe(false)
  })

  it('rewrites when people are expected and cast is unstated', () => {
    expect(
      shotNeedsDirectionRewrite(
        beat({
          beatDirection: {
            frozenMoment: 'the door opens',
            blocking: 'centered on the door',
          },
        }),
        { expectsCast: true, composedText: 'the door opens', plateNames: [] }
      )
    ).toBe(true)
  })

  it('chunks the scene-wide still director and rewrites before stills and clips', () => {
    expect(STILL_DIRECTOR_BEAT_CHUNK).toBe(6)
    const orchestrator = readSource('src/lib/sceneGeneration/expressOrchestrator.ts')
    expect(orchestrator).toContain('STILL_DIRECTOR_BEAT_CHUNK')
    expect(orchestrator).toContain('ensureDirectedBeatBeforeStill')
    const route = readSource('src/app/api/segments/[segmentId]/generate-asset/route.ts')
    expect(route).toContain('rewriteThinClipPrompt')
  })
})
