import { describe, it, expect } from 'vitest'
import {
  applyDeselectedSceneChanges,
  beatChangeSummary,
  diffSceneChanges,
  isStructuredBeatPreview,
} from '@/lib/script/sceneDiffChanges'
import { getSceneBeats, migrateProjectToBeats } from '@/lib/script/beatMigration'
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

  it('diffSceneChanges reports sceneDirection when direction summary changes', () => {
    const candidate = {
      ...originalScene,
      sceneDirection: {
        sceneDescription: 'Alex confronts the intruder with new resolve.',
        camera: { movement: 'Handheld', shots: ['Close-Up'], angle: 'Low', lensChoice: '50mm', focus: 'Shallow' },
        lighting: { overallMood: 'Low-Key', timeOfDay: 'Night', keyLight: 'Hard', fillLight: 'None', backlight: 'Rim', practicals: 'Lamp', colorTemperature: 'Cool' },
        scene: { location: 'Room', keyProps: [], atmosphere: 'Tense' },
        talent: { blocking: 'Center', keyActions: ['Stand'], emotionalBeat: 'Defiant' },
        audio: { priorities: 'Dialogue', considerations: 'Quiet set' },
      },
    }

    const changes = diffSceneChanges(originalScene, candidate)
    expect(changes).toContain('sceneDirection')
  })

  it('applyDeselectedSceneChanges restores original sceneDirection when deselected', () => {
    const candidate = {
      ...originalScene,
      sceneDirection: {
        sceneDescription: 'A completely new direction summary.',
        camera: { movement: 'Dolly', shots: ['Wide'], angle: 'High', lensChoice: '24mm', focus: 'Deep' },
        lighting: { overallMood: 'High-Key', timeOfDay: 'Day', keyLight: 'Soft', fillLight: 'Ambient', backlight: 'None', practicals: 'Window', colorTemperature: 'Warm' },
        scene: { location: 'Office', keyProps: ['Phone'], atmosphere: 'Bright' },
        talent: { blocking: 'Window', keyActions: ['Pace'], emotionalBeat: 'Anxious' },
        audio: { priorities: 'Ambient', considerations: 'HVAC' },
      },
    }

    const merged = applyDeselectedSceneChanges(
      originalScene,
      candidate,
      new Set(['sceneDirection'])
    )
    expect(merged.sceneDirection).toEqual(originalScene.sceneDirection)
  })
})

describe('beat identity re-alignment when AI omits beatIds', () => {
  const fourBeatOriginal: SceneBeat[] = [
    { beatId: 'b1', sequenceIndex: 0, kind: 'action', actionDescription: 'Enter.' },
    {
      beatId: 'b2',
      sequenceIndex: 1,
      kind: 'dialogue',
      character: 'ALEX',
      line: 'Hi.',
      lineId: 'l2',
    },
    { beatId: 'b3', sequenceIndex: 2, kind: 'action', actionDescription: 'Pause.' },
    {
      beatId: 'b4',
      sequenceIndex: 3,
      kind: 'dialogue',
      character: 'JORDAN',
      line: 'Hey.',
      lineId: 'l4',
    },
  ]

  const fourBeatScene = structuredScene(fourBeatOriginal)

  const rawSixBeatsNoIds = [
    { kind: 'action', actionDescription: 'Enter revised.' },
    { kind: 'dialogue', character: 'ALEX', line: '[happy] Hi revised.' },
    { kind: 'action', actionDescription: 'Pause revised.' },
    { kind: 'dialogue', character: 'JORDAN', line: '[cold] Hey revised.' },
    { kind: 'narration', character: 'NARRATOR', line: 'New narration.' },
    { kind: 'action', actionDescription: 'New action beat.' },
  ]

  it('mapStructuredRevisionBeats reuses original beatIds and lineIds for aligned beats', () => {
    const mapped = mapStructuredRevisionBeats(rawSixBeatsNoIds, fourBeatScene)
    expect(mapped).toHaveLength(6)

    const reusedIds = ['b1', 'b2', 'b3', 'b4']
    for (const id of reusedIds) {
      expect(mapped.some((b) => b.beatId === id)).toBe(true)
    }
    expect(mapped.find((b) => b.beatId === 'b2')?.lineId).toBe('l2')
    expect(mapped.find((b) => b.beatId === 'b4')?.lineId).toBe('l4')

    const newIds = mapped.filter((b) => !reusedIds.includes(b.beatId))
    expect(newIds).toHaveLength(2)
  })

  it('diff reports changed beats instead of spurious add+remove when ids were omitted', () => {
    const candidate = finalizeStructuredRevisedScene(
      { beats: rawSixBeatsNoIds },
      fourBeatScene,
      [],
      {}
    )
    const changes = diffSceneChanges(fourBeatScene, candidate)

    const added = changes.filter((k) => k.startsWith('beat-added:'))
    const removed = changes.filter((k) => k.startsWith('beat-removed:'))
    const changed = changes.filter(
      (k) => k.startsWith('beat:') && !k.startsWith('beat-added:') && !k.startsWith('beat-removed:')
    )

    expect(added.length).toBeLessThanOrEqual(2)
    expect(removed.length).toBe(0)
    expect(changed.length).toBe(4)
    expect(getSceneBeats(candidate)).toHaveLength(6)
  })

  it('preview union shows 6 beat rows not 10 when ids are realigned', () => {
    const candidate = finalizeStructuredRevisedScene(
      { beats: rawSixBeatsNoIds },
      fourBeatScene,
      [],
      {}
    )
    const candidateBeats = getSceneBeats(candidate)
    const originalBeats = getSceneBeats(fourBeatScene)
    const allBeatIds = new Set([
      ...originalBeats.map((b) => b.beatId),
      ...candidateBeats.map((b) => b.beatId),
    ])
    const visibleRows = Array.from(allBeatIds).filter((id) => {
      const summary = beatChangeSummary(fourBeatScene, candidate, id)
      return summary.status !== 'unchanged'
    })

    expect(allBeatIds.size).toBe(6)
    expect(visibleRows.length).toBe(6)
    expect(candidateBeats.length).toBe(6)
  })

  it('migrateProjectToBeats does not re-expand a 6-beat revised scene to 10', () => {
    const candidate = finalizeStructuredRevisedScene(
      { beats: rawSixBeatsNoIds },
      fourBeatScene,
      [],
      {}
    )
    const metadata = {
      visionPhase: {
        script: {
          script: {
            scenes: [candidate],
          },
        },
      },
    }
    const result = migrateProjectToBeats(metadata)
    const scenes = (result.metadata.visionPhase as { script: { script: { scenes: unknown[] } } })
      .script.script.scenes
    expect(getSceneBeats(scenes[0] as Record<string, unknown>)).toHaveLength(6)
  })
})
