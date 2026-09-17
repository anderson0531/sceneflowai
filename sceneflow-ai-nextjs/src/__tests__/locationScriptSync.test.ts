import { describe, expect, it } from 'vitest'
import {
  appendDirectedLocationVersion,
  buildLocationVersionSyncDiff,
  enrichSuggestionsWithBeatLocationState,
  mergeLocationVersionSyncDiff,
  accumulateStateNotes,
  stampLocationVersionAppliesFrom,
} from '@/lib/vision/locationScriptSync'

describe('locationScriptSync', () => {
  const existing = [
    {
      id: 'ver-door',
      name: 'Exploded front door',
      stateNotes: 'Front door blown out, splinters on the floor',
      sceneNumbers: [1],
      appliesFrom: { sceneNumber: 1, beatIndex: 1, beatId: 'b1' },
      imageUrl: 'https://blob.example/door.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'ver-flood',
      name: 'Flooded kitchen',
      stateNotes: 'Kitchen standing water around the island',
      sceneNumbers: [4],
      imageUrl: 'https://blob.example/flood.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  it('matches suggestions by name before creating duplicates', () => {
    const diff = buildLocationVersionSyncDiff('loc-1', 'FOYER', existing, [
      {
        name: 'exploded front door',
        stateNotes: 'Front door blown out, splinters on the floor',
        sceneNumbers: [1, 2],
        reason: 'Same state, more scenes',
      },
    ])
    expect(diff.creates).toHaveLength(0)
    expect(diff.updates).toHaveLength(1)
    expect(diff.updates[0].imageStale).toBe(false)
    expect(diff.updates[0].patch.sceneNumbers).toEqual([1, 2])
    expect(diff.obsolete.map((o) => o.versionId)).toContain('ver-flood')
  })

  it('marks image stale when stateNotes change', () => {
    const diff = buildLocationVersionSyncDiff('loc-1', 'FOYER', existing, [
      {
        name: 'Exploded front door',
        stateNotes: 'Front door blown out, foyer on fire, ceiling collapsed',
        sceneNumbers: [1],
        reason: 'Fire after the blast',
      },
      {
        name: 'Flooded kitchen',
        stateNotes: 'Kitchen standing water around the island',
        sceneNumbers: [4],
        reason: 'Unchanged',
      },
    ])
    const door = diff.updates.find((u) => u.versionId === 'ver-door')
    expect(door?.imageStale).toBe(true)
    expect(door?.patch.stateNotes).toMatch(/fire/i)
  })

  it('creates new versions and soft-obsoletes unmatched without deleting images', () => {
    const diff = buildLocationVersionSyncDiff('loc-1', 'FOYER', existing, [
      {
        name: 'Boarded windows',
        stateNotes: 'Windows boarded with plywood',
        sceneNumbers: [3],
        reason: 'Time jump',
      },
    ])
    expect(diff.creates).toHaveLength(1)
    const { versions } = mergeLocationVersionSyncDiff(existing, diff)
    const boarded = versions.find((v) => v.name === 'Boarded windows')
    expect(boarded?.needsImageRegen).toBe(true)
    const door = versions.find((v) => v.id === 'ver-door')
    expect(door?.sceneNumbers).toEqual([])
    expect(door?.imageUrl).toBe('https://blob.example/door.png')
  })

  it('accumulates earlier lasting damage into later state notes', () => {
    const accumulated = accumulateStateNotes([
      { stateNotes: 'Front door exploded, missing from the frame' },
      { stateNotes: 'The room is on fire' },
    ])
    expect(accumulated[1].toLowerCase()).toContain('door')
    expect(accumulated[1].toLowerCase()).toMatch(/fire/)
  })

  it('enriches missing stateNotes from beat text', () => {
    const suggestions = enrichSuggestionsWithBeatLocationState(
      [
        {
          name: 'Foyer aftermath',
          stateNotes: '',
          sceneNumbers: [1],
          reason: 'Main look',
        },
      ],
      [
        {
          sceneNumber: 1,
          heading: 'INT. FOYER - NIGHT',
          beats: [
            { actionDescription: 'They enter.' },
            { actionDescription: 'The front door explodes inward.' },
          ],
        },
      ]
    )
    expect(suggestions[0].stateNotes).toMatch(/door/i)
    expect(suggestions[0].appliesFrom?.beatIndex).toBe(1)
  })

  it('creates a version when the LLM omitted a dialogue shut-door hit', () => {
    const suggestions = enrichSuggestionsWithBeatLocationState(
      [],
      [
        {
          sceneNumber: 1,
          beats: [
            { beatId: 'b0', actionDescription: 'The door stands open.' },
            {
              beatId: 'b10',
              kind: 'dialogue',
              line: '[wincing, defiant] Cleanup doesn\'t bleed. Shut the damn door.',
            },
          ],
        },
      ]
    )
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].stateNotes).toMatch(/door/i)
    expect(suggestions[0].appliesFrom?.beatId).toBe('b10')
  })

  it('appends a directed version that applies from the chosen beat', () => {
    const location = {
      id: 'loc-foyer',
      location: 'FOYER',
      locationDisplay: 'INT. FOYER - NIGHT',
      imageUrl: 'https://blob.example/base.png',
      sourceSceneIndex: 0,
      sourceSceneHeading: 'INT. FOYER - NIGHT',
      pinnedAt: '2026-01-01T00:00:00.000Z',
      versions: [],
    }
    const { location: next, version } = appendDirectedLocationVersion(
      location,
      {
        name: 'Door shut',
        stateNotes: 'The door is shut.',
        appliesFrom: { sceneNumber: 1, beatIndex: 9, beatId: 'b10' },
      },
      { versionId: 'loc-ver-directed-test' }
    )
    expect(next.versions).toHaveLength(1)
    expect(version.needsImageRegen).toBe(true)
    expect(version.appliesFrom).toEqual({ sceneNumber: 1, beatIndex: 9, beatId: 'b10' })
    expect(stampLocationVersionAppliesFrom(location, 'missing', version.appliesFrom!).versions).toEqual(
      []
    )
    const stamped = stampLocationVersionAppliesFrom(
      { ...location, versions: [{ ...version, appliesFrom: undefined }] },
      version.id,
      { sceneNumber: 1, beatIndex: 9, beatId: 'b10' }
    )
    expect(stamped.versions?.[0].appliesFrom?.beatIndex).toBe(9)
  })
})
