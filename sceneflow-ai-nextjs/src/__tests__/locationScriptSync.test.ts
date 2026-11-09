import { describe, expect, it } from 'vitest'
import {
  appendDirectedLocationVersion,
  buildLocationVersionSyncDiff,
  enrichSuggestionsWithBeatLocationState,
  mergeLocationVersionSyncDiff,
  accumulateStateNotes,
  stampLocationVersionAppliesFrom,
} from '@/lib/vision/locationScriptSync'
import {
  resolveAnchorForLocationVersion,
  sortLocationVersionsChronologically,
  withStaleDownstreamVersionsAfterVersionChange,
} from '@/lib/vision/locationVersionResolve'

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

  it('deduplicates repeated clauses and strips bare "; debris" across cumulative versions', () => {
    const rawV2 =
      "A thick, jagged horizontal chalk slash marks the massive slate board over the equation 'RESONANCE FLUX = 0'.; debris"
    const rawV3 =
      "A thick, jagged horizontal chalk slash marks the massive slate board over the equation 'RESONANCE FLUX = 0'.; debris; A thick, jagged horizontal chalk slash marks the massive slate board. The wall-mounted acoustic seismograph's smoked-paper drum is heavily scratched with irregular zig-zag arcs."
    const rawV4 =
      "A thick, jagged horizontal chalk slash marks the massive slate board over the equation 'RESONANCE FLUX = 0'.; debris; A thick, jagged horizontal chalk slash marks the massive slate board. The wall-mounted acoustic seismograph's smoked-paper drum is heavily scratched with irregular zig-zag arcs.; A thick, jagged horizontal chalk slash marks the massive slate board. The wall-mounted acoustic seismograph's smoked-paper drum is heavily scratched. The overhead eighteen-inch pneumatic mail dispatch hatch is sheared open, its cast-iron seam rivets broken, and a thick layer of black coal silt covers the floor and surrounding area."

    const accumulated = accumulateStateNotes([
      { stateNotes: rawV2, sceneNumbers: [2] },
      { stateNotes: rawV3, sceneNumbers: [3] },
      { stateNotes: rawV4, sceneNumbers: [4] },
    ])

    // Bare "; debris" is stripped
    expect(accumulated[0]).not.toMatch(/;\s*debris\b/i)
    expect(accumulated[1]).not.toMatch(/;\s*debris\b/i)
    expect(accumulated[2]).not.toMatch(/;\s*debris\b/i)

    // Chalk slash sentence appears only ONCE in V3 and V4, retaining the full 'RESONANCE FLUX = 0' detail
    expect(accumulated[1].match(/chalk slash marks the massive slate board/gi)).toHaveLength(1)
    expect(accumulated[1]).toContain("'RESONANCE FLUX = 0'")
    expect(accumulated[2].match(/chalk slash marks the massive slate board/gi)).toHaveLength(1)

    // Seismograph sentence appears only ONCE in V4, retaining 'irregular zig-zag arcs'
    expect(accumulated[2].match(/wall-mounted acoustic seismograph/gi)).toHaveLength(1)
    expect(accumulated[2]).toContain('irregular zig-zag arcs')
    expect(accumulated[2]).toContain('overhead eighteen-inch pneumatic mail dispatch hatch is sheared open')
  })

  it('preserves existing drawn stateNotes and avoids marking imageStale when a resync suggestion is already covered', () => {
    const drawnVersions = [
      {
        id: 'ver-s2',
        name: 'Chalk-slashed slate board',
        stateNotes:
          "A thick, jagged horizontal chalk slash marks the massive slate board over the equation 'RESONANCE FLUX = 0'.",
        sceneNumbers: [2],
        appliesFrom: { sceneNumber: 2, beatIndex: 0, beatId: 'b-s2' },
        imageUrl: 'https://blob.example/s2.png',
        needsImageRegen: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const diff = buildLocationVersionSyncDiff('loc-vault', 'VAULT', drawnVersions, [
      {
        name: 'Slate board chalk slash',
        stateNotes: 'Horizontal chalk slash across the massive slate board.',
        sceneNumbers: [2, 3],
        appliesFrom: { sceneNumber: 2, beatIndex: 0, beatId: 'b-s2' },
        reason: 'Chalk slash on board',
      },
    ])

    expect(diff.creates).toHaveLength(0)
    expect(diff.updates).toHaveLength(1)
    expect(diff.updates[0].imageStale).toBe(false)
    expect(diff.updates[0].patch.stateNotes).toBeUndefined()
    expect(diff.updates[0].patch.sceneNumbers).toEqual([2, 3])
    const merged = mergeLocationVersionSyncDiff(drawnVersions, diff)
    expect(merged.versions[0]?.stateNotes).toBe(drawnVersions[0].stateNotes)
    expect(merged.versions[0]?.needsImageRegen).toBe(false)
  })

  it('sorts versions chronologically, resolves sequential anchors (Base -> V1 -> V2), and cascades downstream staleness', () => {
    const location = {
      id: 'loc-vault',
      location: 'VAULT',
      locationDisplay: 'INT. VAULT - NIGHT',
      imageUrl: 'https://blob.example/base.png',
      description: 'Subterranean brick vault with intact slate board.',
      sourceSceneIndex: 0,
      sourceSceneHeading: 'INT. VAULT - NIGHT',
      pinnedAt: '2026-01-01T00:00:00.000Z',
      versions: [
        {
          id: 'ver-s4',
          name: 'Pneumatic hatch sheared open',
          stateNotes: 'Chalk slash on slate board; seismograph drum scratched; pneumatic hatch sheared open.',
          sceneNumbers: [4],
          appliesFrom: { sceneNumber: 4, beatIndex: 2 },
          imageUrl: 'https://blob.example/s4.png',
          needsImageRegen: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ver-s2',
          name: 'Chalk-slashed slate board',
          stateNotes: 'Chalk slash on slate board.',
          sceneNumbers: [2],
          appliesFrom: { sceneNumber: 2, beatIndex: 1 },
          imageUrl: 'https://blob.example/s2.png',
          needsImageRegen: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ver-s3',
          name: 'Scratched seismograph drum',
          stateNotes: 'Chalk slash on slate board; seismograph drum scratched.',
          sceneNumbers: [3],
          appliesFrom: { sceneNumber: 3, beatIndex: 0 },
          imageUrl: 'https://blob.example/s3.png',
          needsImageRegen: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }

    const sorted = sortLocationVersionsChronologically(location.versions)
    expect(sorted.map((v) => v.id)).toEqual(['ver-s2', 'ver-s3', 'ver-s4'])

    const anchorS2 = resolveAnchorForLocationVersion(location, 'ver-s2')
    expect(anchorS2.anchorVersion).toBeUndefined()
    expect(anchorS2.anchorLabel).toBe('Base')
    expect(anchorS2.anchorImageUrl).toBe('https://blob.example/base.png')
    expect(anchorS2.chronologicalIndex).toBe(0)

    const anchorS3 = resolveAnchorForLocationVersion(location, 'ver-s3')
    expect(anchorS3.anchorVersion?.id).toBe('ver-s2')
    expect(anchorS3.anchorImageUrl).toBe('https://blob.example/s2.png')
    expect(anchorS3.previousVersion?.stateNotes).toBe('Chalk slash on slate board.')
    expect(anchorS3.chronologicalIndex).toBe(1)

    const anchorS4 = resolveAnchorForLocationVersion(location, 'ver-s4')
    expect(anchorS4.anchorVersion?.id).toBe('ver-s3')
    expect(anchorS4.anchorImageUrl).toBe('https://blob.example/s3.png')
    expect(anchorS4.chronologicalIndex).toBe(2)

    // Regenerating ver-s2 marks ver-s3 and ver-s4 stale, leaving ver-s2 fresh
    const cascaded = withStaleDownstreamVersionsAfterVersionChange(location, 'ver-s2')
    const byId = new Map((cascaded.versions || []).map((v) => [v.id, v]))
    expect(byId.get('ver-s2')?.needsImageRegen).toBe(false)
    expect(byId.get('ver-s3')?.needsImageRegen).toBe(true)
    expect(byId.get('ver-s4')?.needsImageRegen).toBe(true)
  })
})
