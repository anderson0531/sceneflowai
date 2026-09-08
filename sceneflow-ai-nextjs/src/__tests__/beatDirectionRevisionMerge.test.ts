import { describe, expect, it } from 'vitest'
import {
  finalizeStructuredRevisedScene,
  formatBeatsForRevisionPrompt,
} from '@/lib/script/structuredSceneRevision'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const originalDirection = {
  shotType: 'Original Medium Close-Up',
  cameraAngle: 'low angle',
  emotion: 'wary',
  blocking: 'Elara faces the console',
  generatedBy: 'llm' as const,
}

const originalBeats: SceneBeat[] = [
  {
    beatId: 'bt-1',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: 'Elara approaches the console.',
    beatDirection: originalDirection,
  },
]

const originalScene = {
  heading: 'INT. CONTROL ROOM - NIGHT',
  music: 'Ambient hum',
  beats: originalBeats,
  action: 'Elara approaches the console.',
}

describe('finalizeStructuredRevisedScene beatDirection merge', () => {
  it('regenerates beat direction by default (uses the parsed LLM output verbatim)', () => {
    const revised = finalizeStructuredRevisedScene(
      {
        beats: [
          {
            beatId: 'bt-1',
            kind: 'action',
            actionDescription: 'Elara steps closer to the console.',
            beatDirection: {
              shotType: 'Revised Insert Shot',
              cameraAngle: 'high angle',
              emotion: 'resolute',
            },
          },
        ],
      },
      originalScene,
      [],
      {}
    )
    const [beat] = getSceneBeats(revised)
    expect(beat.beatDirection?.shotType).toBe('Revised Insert Shot')
    expect(beat.beatDirection?.cameraAngle).toBe('high angle')
    expect(beat.beatDirection?.emotion).toBe('resolute')
    expect(beat.beatDirection?.blocking).toBeUndefined()
  })

  it('preserves original beat direction when "beatDirection" is in preserveElements', () => {
    const revised = finalizeStructuredRevisedScene(
      {
        beats: [
          {
            beatId: 'bt-1',
            kind: 'action',
            actionDescription: 'Elara steps closer to the console.',
            beatDirection: {
              shotType: 'LLM Wanted Wide',
              emotion: 'resolute',
            },
          },
        ],
      },
      originalScene,
      ['beatDirection'],
      {}
    )
    const [beat] = getSceneBeats(revised)
    expect(beat.beatDirection).toEqual(originalDirection)
  })

  it('keeps original direction on unmatched beats when preserve flag is present', () => {
    const revised = finalizeStructuredRevisedScene(
      {
        beats: [
          {
            kind: 'action',
            actionDescription: 'Fresh brand-new beat.',
            beatDirection: { shotType: 'Whatever' },
          },
        ],
      },
      originalScene,
      ['beatDirection'],
      {}
    )
    const [beat] = getSceneBeats(revised)
    expect(beat.beatDirection?.shotType).toBe('Whatever')
  })
})

describe('formatBeatsForRevisionPrompt includes direction summary', () => {
  it('exposes direction fields to the LLM prompt formatter', () => {
    const summary = formatBeatsForRevisionPrompt(originalBeats)
    expect(summary).toContain('shot: Original Medium Close-Up')
    expect(summary).toContain('angle: low angle')
    expect(summary).toContain('emotion: wary')
    expect(summary).toContain('blocking: Elara faces the console')
  })

  it('omits the direction section when a beat has none', () => {
    const bare: SceneBeat[] = [
      {
        beatId: 'bt-bare',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'A quiet hallway.',
      },
    ]
    const summary = formatBeatsForRevisionPrompt(bare)
    expect(summary).not.toContain('direction')
  })
})
