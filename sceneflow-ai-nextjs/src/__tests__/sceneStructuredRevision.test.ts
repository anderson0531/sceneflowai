import { describe, it, expect } from 'vitest'
import {
  applyDeselectedSceneChanges,
  beatChangeSummary,
  diffSceneChanges,
  isStructuredBeatPreview,
} from '@/lib/script/sceneDiffChanges'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  finalizeFlatRevisedScene,
  finalizeStructuredRevisedScene,
  invalidateChangedBeatFramesOnScene,
  isStructuredRevisionResponse,
  mapStructuredRevisionBeats,
} from '@/lib/script/structuredSceneRevision'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const FRAME_URL = 'https://blob.example/frame.jpg'

function structuredScene(beats: SceneBeat[], extras: Record<string, unknown> = {}) {
  return {
    heading: 'INT. ROOM - DAY',
    music: 'Soft piano',
    sfx: ['Wind'],
    beats,
    ...extras,
  }
}

describe('structured scene revision', () => {
  const originalBeats: SceneBeat[] = [
    {
      beatId: 'bt-action',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Alex enters quietly.',
      storyboardImageUrl: FRAME_URL,
    },
    {
      beatId: 'bt-dialogue',
      sequenceIndex: 1,
      kind: 'dialogue',
      character: 'ALEX',
      line: '[neutral] Hello.',
      lineId: 'line-1',
    },
  ]

  const originalScene = structuredScene(originalBeats, {
    action: 'Alex enters quietly.',
    dialogue: [{ character: 'ALEX', line: '[neutral] Hello.', lineId: 'line-1' }],
  })

  it('isStructuredRevisionResponse accepts beats array payloads', () => {
    expect(isStructuredRevisionResponse({ beats: [{ kind: 'action' }] })).toBe(true)
    expect(isStructuredRevisionResponse({ action: 'x' })).toBe(false)
    expect(isStructuredRevisionResponse({ beats: [] })).toBe(false)
  })

  it('diffSceneChanges detects beat changed, added, and removed', () => {
    const candidateBeats: SceneBeat[] = [
      {
        beatId: 'bt-action',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Alex bursts through the door.',
      },
      {
        beatId: 'bt-new',
        sequenceIndex: 1,
        kind: 'narration',
        character: 'NARRATOR',
        line: 'Something shifts.',
      },
    ]
    const candidate = finalizeStructuredRevisedScene(
      {
        beats: candidateBeats,
        music: 'Dramatic strings',
        sfx: ['Door slam'],
      },
      originalScene,
      [],
      {}
    )

    const changes = diffSceneChanges(originalScene, candidate)
    expect(changes).toContain('beat:bt-action')
    expect(changes).toContain('beat-added:bt-new')
    expect(changes).toContain('beat-removed:bt-dialogue')
    expect(changes).toContain('music')
    expect(isStructuredBeatPreview(originalScene, candidate)).toBe(true)
  })

  it('applyDeselectedSceneChanges restores one beat while keeping others', () => {
    const candidateBeats: SceneBeat[] = [
      {
        beatId: 'bt-action',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Alex bursts through the door.',
      },
      {
        beatId: 'bt-dialogue',
        sequenceIndex: 1,
        kind: 'dialogue',
        character: 'ALEX',
        line: '[angry] Get out!',
        lineId: 'line-1',
      },
    ]
    const candidate = finalizeStructuredRevisedScene(
      { beats: candidateBeats, music: 'Dramatic strings' },
      originalScene,
      [],
      {}
    )

    const merged = applyDeselectedSceneChanges(originalScene, candidate, new Set(['beat:bt-action']))
    const mergedBeats = getSceneBeats(merged)

    expect(mergedBeats.find((b) => b.beatId === 'bt-action')?.actionDescription).toBe(
      'Alex enters quietly.'
    )
    expect(mergedBeats.find((b) => b.beatId === 'bt-dialogue')?.line).toBe('[angry] Get out!')
    expect(merged.music).toBe('Dramatic strings')
  })

  it('applyDeselectedSceneChanges drops added beats and restores removed beats', () => {
    const candidateBeats: SceneBeat[] = [
      {
        beatId: 'bt-action',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Alex enters quietly.',
      },
      {
        beatId: 'bt-new',
        sequenceIndex: 1,
        kind: 'narration',
        character: 'NARRATOR',
        line: 'A new thought.',
      },
    ]
    const candidate = finalizeStructuredRevisedScene({ beats: candidateBeats }, originalScene, [], {})

    const merged = applyDeselectedSceneChanges(
      originalScene,
      candidate,
      new Set(['beat-added:bt-new', 'beat-removed:bt-dialogue'])
    )
    const mergedBeats = getSceneBeats(merged)

    expect(mergedBeats.some((b) => b.beatId === 'bt-new')).toBe(false)
    expect(mergedBeats.some((b) => b.beatId === 'bt-dialogue')).toBe(true)
  })

  it('mapStructuredRevisionBeats preserves storyboard media when fingerprint unchanged', () => {
    const mapped = mapStructuredRevisionBeats(
      [
        {
          beatId: 'bt-action',
          kind: 'action',
          actionDescription: 'Alex enters quietly.',
        },
      ],
      originalScene
    )

    expect(mapped[0].storyboardImageUrl).toBe(FRAME_URL)
  })

  it('mapStructuredRevisionBeats clears inherited media when beat content changes', () => {
    const mapped = mapStructuredRevisionBeats(
      [
        {
          beatId: 'bt-action',
          kind: 'action',
          actionDescription: 'Alex runs in.',
        },
      ],
      originalScene
    )

    expect(mapped[0].storyboardImageUrl).toBeUndefined()
  })

  it('invalidateChangedBeatFramesOnScene clears frames only for changed beats', () => {
    const revised = finalizeStructuredRevisedScene(
      {
        beats: [
          {
            beatId: 'bt-action',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Alex runs in.',
            storyboardImageUrl: FRAME_URL,
          },
          {
            beatId: 'bt-dialogue',
            sequenceIndex: 1,
            kind: 'dialogue',
            character: 'ALEX',
            line: '[neutral] Hello.',
            lineId: 'line-1',
          },
        ],
      },
      originalScene,
      [],
      {}
    )

    const invalidated = invalidateChangedBeatFramesOnScene(revised, originalScene)
    const beats = getSceneBeats(invalidated)
    const actionBeat = beats.find((b) => b.beatId === 'bt-action')
    const dialogueBeat = beats.find((b) => b.beatId === 'bt-dialogue')

    expect(actionBeat?.storyboardImageUrl).toBeUndefined()
    expect(dialogueBeat?.storyboardImageUrl).toBeUndefined()
  })

  it('finalizeFlatRevisedScene falls back without beats reconstruction', () => {
    const flat = finalizeFlatRevisedScene(
      { action: 'New action prose.', music: 'New music' },
      originalScene,
      [],
      {}
    )

    expect(flat.action).toBe('New action prose.')
    expect(flat.music).toBe('New music')
    expect(getSceneBeats(flat).length).toBeGreaterThan(0)
  })

  it('beatChangeSummary classifies beat states', () => {
    const candidate = finalizeStructuredRevisedScene(
      {
        beats: [
          {
            beatId: 'bt-action',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Changed action.',
          },
          {
            beatId: 'bt-new',
            sequenceIndex: 1,
            kind: 'narration',
            character: 'NARRATOR',
            line: 'Added line.',
          },
        ],
      },
      originalScene,
      [],
      {}
    )

    expect(beatChangeSummary(originalScene, candidate, 'bt-action').status).toBe('changed')
    expect(beatChangeSummary(originalScene, candidate, 'bt-new').status).toBe('added')
    expect(beatChangeSummary(originalScene, candidate, 'bt-dialogue').status).toBe('removed')
  })

  it('falls back to flat diff when candidate has no derivable beats', () => {
    const changes = diffSceneChanges(originalScene, { music: 'Only music changed' })
    expect(changes).toContain('music')
    expect(changes.some((key) => key.startsWith('beat:'))).toBe(false)
    expect(isStructuredBeatPreview(originalScene, { music: 'Only music changed' })).toBe(false)
  })
})
