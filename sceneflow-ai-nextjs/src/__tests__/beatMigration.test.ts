import { describe, it, expect } from 'vitest'
import {
  flatSceneToBeats,
  beatsToLegacyFields,
  normalizeBeatsForProduction,
  isStoryboardApproved,
  ensureSceneBeats,
  getSceneBeats,
  getStoryboardTimelineBeats,
  hydrateBeatStoryboardMediaFromLegacy,
  isAutoLeadingEstablishingBeat,
  migrateProjectToBeats,
  migrateProjectBeatsToStartFrameOnly,
  migrateSceneBeatsToStartFrameOnly,
  applyBeatStoryboardImageToScene,
  applyExpressStoryboardImageToScene,
  applyExpressStoryboardImageErrorToScene,
} from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'

describe('beatMigration', () => {
  it('flatSceneToBeats creates action, narration, and dialogue beats', () => {
    const scene = {
      action: 'INT. WAREHOUSE - NIGHT',
      imageUrl: 'https://example.com/establishing.jpg',
      narration: 'Something is wrong.',
      dialogue: [{ character: 'Sarah', line: 'We need to leave.' }],
    }
    const beats = flatSceneToBeats(scene)
    expect(beats.length).toBeGreaterThanOrEqual(3)
    expect(beats[0].kind).toBe('action')
    expect(beats.some((b) => b.kind === 'narration')).toBe(true)
    expect(beats.some((b) => b.kind === 'dialogue')).toBe(true)
  })

  it('flatSceneToBeats does not create action beat from imageUrl alone', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      dialogue: [
        {
          kind: 'narration',
          character: 'NARRATOR',
          characterId: 'narrator',
          line: 'Welcome.',
        },
      ],
    }
    const beats = flatSceneToBeats(scene)
    expect(beats.some((b) => b.kind === 'action')).toBe(false)
    expect(beats[0].kind).toBe('narration')
  })

  it('getStoryboardTimelineBeats keeps all beats including legacy establishing action', () => {
    const scene = {
      imageUrl: 'https://example.com/est.jpg',
      dialogue: [
        { lineId: 'ln_1', character: 'Sarah', line: 'Hello.' },
      ],
      beats: [
        {
          beatId: 'bt_auto',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Establishing',
          storyboardImageUrl: 'https://example.com/est.jpg',
        },
        {
          beatId: 'bt_1',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello.',
          lineId: 'ln_1',
        },
      ],
    }
    expect(isAutoLeadingEstablishingBeat(scene.beats[0] as never, scene, 0, scene.beats as never)).toBe(true)
    const timeline = getStoryboardTimelineBeats(scene)
    expect(timeline).toHaveLength(2)
    expect(timeline[0].beatId).toBe('bt_auto')
    expect(timeline[1].beatId).toBe('bt_1')
  })

  it('isAutoLeadingEstablishingBeat is false for directed action before dialogue', () => {
    const scene = {
      dialogue: [{ lineId: 'ln_1', character: 'Elara', line: 'Hello.' }],
      beats: [
        {
          beatId: 'bt_close',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription:
            "CLOSE UP: Elara's hands, now visibly trembling, are clasped tightly on the cold table surface.",
        },
        {
          beatId: 'bt_1',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'Elara',
          line: 'Hello.',
          lineId: 'ln_1',
        },
      ],
    }
    expect(
      isAutoLeadingEstablishingBeat(scene.beats[0] as never, scene, 0, scene.beats as never)
    ).toBe(false)
    expect(getStoryboardTimelineBeats(scene)).toHaveLength(2)
  })

  it('isAutoLeadingEstablishingBeat filters action when scene.action mirrors fallback blocking', () => {
    const blocking = 'INT. WAREHOUSE - NIGHT. Dust motes in the air.'
    const scene = {
      action: blocking,
      visualDescription: blocking,
      dialogue: [{ lineId: 'ln_1', character: 'Sarah Chen', line: 'Hello.' }],
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: blocking,
        },
        {
          beatId: 'bt_1',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'Sarah Chen',
          line: 'Hello.',
          lineId: 'ln_1',
        },
      ],
    }
    const beats = scene.beats as SceneBeat[]
    expect(isAutoLeadingEstablishingBeat(beats[0], scene, 0, beats)).toBe(true)
  })

  it('beatsToLegacyFields syncs dialogue and narration', () => {
    const beats = normalizeBeatsForProduction([
      {
        beatId: 'bt_a',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Wide shot',
      },
      {
        beatId: 'bt_b',
        sequenceIndex: 1,
        kind: 'narration',
        character: 'NARRATOR',
        line: 'Voiceover line.',
        lineId: 'ln_1',
      },
      {
        beatId: 'bt_c',
        sequenceIndex: 2,
        kind: 'dialogue',
        character: 'BOB',
        line: 'Hello.',
        lineId: 'ln_2',
      },
    ])
    const legacy = beatsToLegacyFields(beats)
    expect(legacy.narration).toBe('Voiceover line.')
    expect(legacy.dialogue).toHaveLength(2)
    expect(legacy.action).toContain('Wide shot')
  })

  it('normalizeBeatsForProduction does not flag long dialogue for Veo split', () => {
    const longLine =
      'This is a very long line that should exceed the spoken duration budget when read aloud at a natural pace. '.repeat(
        4
      )
    const beats = normalizeBeatsForProduction([
      {
        beatId: 'bt_long',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Sarah',
        line: longLine,
        lineId: 'ln_long',
      },
    ])
    expect(beats[0].needsSplit).toBe(false)
    expect(beats[0].splitRecommendation).toBeUndefined()
  })

  it('isStoryboardApproved returns true only when status is approved', () => {
    expect(isStoryboardApproved({ storyboardStatus: 'approved' })).toBe(true)
    expect(isStoryboardApproved({ storyboardStatus: 'pending_review' })).toBe(false)
    expect(isStoryboardApproved({})).toBe(false)
  })

  it('ensureSceneBeats preserves LLM beats with kind field', () => {
    const scene = {
      beats: [
        { kind: 'action', actionDescription: 'Cut to close-up' },
        { kind: 'dialogue', character: 'ALICE', line: 'Run!' },
      ],
    }
    const updated = ensureSceneBeats(scene)
    const beats = updated.beats as Array<{ kind: string }>
    expect(beats).toHaveLength(2)
    expect(beats[0].kind).toBe('action')
    expect(Array.isArray(updated.dialogue)).toBe(true)
  })

  it('hydrateBeatStoryboardMediaFromLegacy only applies scene.imageUrl to auto-establishing beat 0', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      beats: [
        {
          beatId: 'bt_0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Establishing shot',
        },
        {
          beatId: 'bt_1',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Tracking',
          storyboardImageUrl: 'https://example.com/tracking.jpg',
        },
        {
          beatId: 'bt_2',
          sequenceIndex: 2,
          kind: 'action',
          actionDescription: 'Close-up',
          storyboardImageUrl: 'https://example.com/close.jpg',
        },
      ],
    }

    const hydrated = hydrateBeatStoryboardMediaFromLegacy(scene, scene.beats as SceneBeat[])
    expect(hydrated[0].storyboardImageUrl).toBe('https://example.com/establishing.jpg')
    expect(hydrated[1].storyboardImageUrl).toBe('https://example.com/tracking.jpg')
    expect(hydrated[2].storyboardImageUrl).toBe('https://example.com/close.jpg')
  })

  it('hydrateBeatStoryboardMediaFromLegacy copies dialogue images onto beats', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      dialogue: [
        {
          lineId: 'ln_1',
          character: 'BOB',
          line: 'Hello.',
          storyboardImageUrl: 'https://example.com/dialogue.jpg',
        },
      ],
      beats: [
        {
          beatId: 'bt_a',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide shot',
        },
        {
          beatId: 'bt_b',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'BOB',
          line: 'Hello.',
          lineId: 'ln_1',
        },
      ],
    }

    const beats = getSceneBeats(scene)
    expect(beats[0].storyboardImageUrl).toBeUndefined()
    expect(beats[1].storyboardImageUrl).toBe('https://example.com/dialogue.jpg')
  })

  it('hydrateBeatStoryboardMediaFromLegacy does not replace a beat still with a stale dialogue URL', () => {
    const scene = {
      dialogue: [
        {
          lineId: 'ln_1',
          character: 'BOB',
          line: 'Hello.',
          storyboardImageUrl: 'https://example.com/original.jpg',
          storyboardImageVersions: [
            {
              id: 'mv_old',
              url: 'https://example.com/original.jpg',
              createdAt: '2026-01-01T00:00:00.000Z',
              source: 'generate',
            },
            {
              id: 'mv_new',
              url: 'https://example.com/regen.jpg',
              createdAt: '2026-06-01T00:00:00.000Z',
              source: 'generate',
            },
          ],
        },
      ],
      beats: [
        {
          beatId: 'bt_b',
          sequenceIndex: 0,
          kind: 'dialogue' as const,
          character: 'BOB',
          line: 'Hello.',
          lineId: 'ln_1',
          storyboardImageUrl: 'https://example.com/regen.jpg',
          storyboardImageVersionId: 'mv_new',
        },
      ],
    }

    const hydrated = hydrateBeatStoryboardMediaFromLegacy(scene, scene.beats as SceneBeat[])
    expect(hydrated[0].storyboardImageUrl).toBe('https://example.com/regen.jpg')
    expect(hydrated[0].storyboardImageVersionId).toBe('mv_new')
    expect(hydrated[0].storyboardImageVersions?.map((v) => v.url)).toEqual([
      'https://example.com/original.jpg',
      'https://example.com/regen.jpg',
    ])
  })

  it('normalizeBeatsForProduction deduplicates beatIds', () => {
    const beats = normalizeBeatsForProduction([
      {
        beatId: 'bt_dup',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'First',
      },
      {
        beatId: 'bt_dup',
        sequenceIndex: 1,
        kind: 'dialogue',
        character: 'ALICE',
        line: 'Second',
        lineId: 'ln_1',
      },
    ])
    expect(beats[0].beatId).toBe('bt_dup')
    expect(beats[1].beatId).not.toBe('bt_dup')
  })

  it('migrateProjectToBeats hydrates storyboard media on existing beats', () => {
    const metadata = {
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                imageUrl: 'https://example.com/scene1-est.jpg',
                dialogue: [
                  {
                    lineId: 'ln_1',
                    character: 'BOB',
                    line: 'Hi',
                    storyboardImageUrl: 'https://example.com/scene1-line.jpg',
                  },
                ],
                beats: [
                  {
                    beatId: 'bt_1',
                    sequenceIndex: 0,
                    kind: 'action',
                    actionDescription: 'Establishing',
                  },
                  {
                    beatId: 'bt_2',
                    sequenceIndex: 1,
                    kind: 'dialogue',
                    character: 'BOB',
                    line: 'Hi',
                    lineId: 'ln_1',
                  },
                ],
              },
            ],
          },
        },
      },
    }

    const result = migrateProjectToBeats(metadata)
    expect(result.changed).toBe(true)
    const visionPhase = result.metadata.visionPhase as Record<string, unknown>
    const script = visionPhase.script as Record<string, unknown>
    const nested = script.script as Record<string, unknown>
    const scenes = nested.scenes as Array<{ beats: Array<{ storyboardImageUrl?: string }> }>
    const beats = scenes[0].beats
    expect(beats[0].storyboardImageUrl).toBe('https://example.com/scene1-est.jpg')
    expect(beats[1].storyboardImageUrl).toBe('https://example.com/scene1-line.jpg')
  })

  it('migrateProjectToBeats keeps still version history on existing beats', () => {
    const originalUrl =
      'https://example.com/frames/original/1779500000000.jpeg'
    const regenUrl = 'https://example.com/frames/regen/1779527367355.jpeg'
    const versions = [
      {
        id: 'mv_old',
        url: originalUrl,
        createdAt: '2026-01-01T00:00:00.000Z',
        source: 'generate',
      },
      {
        id: 'mv_new',
        url: regenUrl,
        createdAt: '2026-06-01T00:00:00.000Z',
        source: 'generate',
      },
    ]

    const metadata = {
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                id: 's1',
                beats: [
                  {
                    beatId: 'bt_1',
                    sequenceIndex: 0,
                    kind: 'action',
                    actionDescription: 'Wide digital void',
                    storyboardImageUrl: regenUrl,
                    storyboardImageVersionId: 'mv_new',
                    storyboardImageVersions: versions,
                    kenBurns: {
                      enabled: true,
                      start: { x: 0, y: 0, width: 1, height: 1 },
                      end: { x: 0.1, y: 0, width: 0.8, height: 0.8 },
                      easing: 'smooth',
                    },
                  },
                  {
                    beatId: 'bt_2',
                    sequenceIndex: 1,
                    kind: 'dialogue',
                    character: 'BOB',
                    line: 'Hi',
                    lineId: 'ln_1',
                    storyboardImageUrl: regenUrl,
                    storyboardImageVersionId: 'mv_new',
                    storyboardImageVersions: versions,
                  },
                ],
                dialogue: [
                  {
                    lineId: 'ln_1',
                    character: 'BOB',
                    line: 'Hi',
                    storyboardImageUrl: originalUrl,
                  },
                ],
              },
            ],
          },
        },
      },
    }

    const result = migrateProjectToBeats(metadata)
    const visionPhase = result.metadata.visionPhase as Record<string, unknown>
    const script = visionPhase.script as Record<string, unknown>
    const nested = script.script as Record<string, unknown>
    const scenes = nested.scenes as Array<{
      beats: Array<{
        storyboardImageUrl?: string
        storyboardImageVersionId?: string
        storyboardImageVersions?: Array<{ url: string }>
        kenBurns?: { enabled?: boolean; easing?: string }
      }>
    }>
    const [actionBeat, dialogueBeat] = scenes[0].beats

    expect(actionBeat.storyboardImageUrl).toBe(regenUrl)
    expect(actionBeat.storyboardImageVersionId).toBe('mv_new')
    expect(actionBeat.storyboardImageVersions?.map((v) => v.url)).toEqual([
      originalUrl,
      regenUrl,
    ])
    expect(actionBeat.kenBurns?.enabled).toBe(true)
    expect(actionBeat.kenBurns?.easing).toBe('smooth')

    expect(dialogueBeat.storyboardImageUrl).toBe(regenUrl)
    expect(dialogueBeat.storyboardImageVersionId).toBe('mv_new')
    expect(dialogueBeat.storyboardImageVersions?.map((v) => v.url)).toEqual([
      originalUrl,
      regenUrl,
    ])
  })
})

describe('migrateSceneBeatsToStartFrameOnly', () => {
  it('promotes end URL to start when start is missing and strips end fields', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello',
          storyboardEndImageUrl: 'https://example.com/end.jpg',
          storyboardEndImagePrompt: 'End prompt',
          storyboardEndImageTier: 'draft',
        },
      ],
    }

    const migrated = migrateSceneBeatsToStartFrameOnly(scene)
    const beats = (migrated.beats as Array<Record<string, unknown>>) ?? []
    expect(beats[0].storyboardImageUrl).toBe('https://example.com/end.jpg')
    expect(beats[0].storyboardImagePrompt).toBe('End prompt')
    expect(beats[0].storyboardImageTier).toBe('draft')
    expect(beats[0].storyboardEndImageUrl).toBeUndefined()
    expect(beats[0].storyboardEndImagePrompt).toBeUndefined()
    expect(beats[0].storyboardEndImageTier).toBeUndefined()
  })

  it('strips end fields when start already exists', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alice',
          line: 'Hello',
          storyboardImageUrl: 'https://example.com/start.jpg',
          storyboardEndImageUrl: 'https://example.com/end.jpg',
        },
      ],
    }

    const migrated = migrateSceneBeatsToStartFrameOnly(scene)
    const beats = (migrated.beats as Array<Record<string, unknown>>) ?? []
    expect(beats[0].storyboardImageUrl).toBe('https://example.com/start.jpg')
    expect(beats[0].storyboardEndImageUrl).toBeUndefined()
  })

  it('migrateProjectBeatsToStartFrameOnly is idempotent', () => {
    const metadata = {
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                beats: [
                  {
                    beatId: 'bt_1',
                    sequenceIndex: 0,
                    kind: 'dialogue',
                    character: 'Alice',
                    line: 'Hello',
                    storyboardEndImageUrl: 'https://example.com/end.jpg',
                  },
                ],
              },
            ],
          },
        },
      },
    }

    const first = migrateProjectBeatsToStartFrameOnly(metadata)
    expect(first.changed).toBe(true)
    const second = migrateProjectBeatsToStartFrameOnly(first.metadata)
    expect(second.changed).toBe(false)
  })
})

describe('applyBeatStoryboardImageToScene', () => {
  it('syncs scene.imageUrl when beat 0 is an action establishing shot', () => {
    const scene = {
      imageUrl: 'https://example.com/old.jpg',
      beats: [
        {
          beatId: 'bt_0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide opening',
        },
      ],
    }

    const updated = applyBeatStoryboardImageToScene(
      scene,
      0,
      'https://example.com/new-establishing.jpg',
      { imageTier: 'draft', imagePrompt: 'Wide digital void' }
    )

    expect(updated.imageUrl).toBe('https://example.com/new-establishing.jpg')
    expect(updated.imagePrompt).toBe('Wide digital void')
    expect(getSceneBeats(updated)[0].storyboardImageUrl).toBe(
      'https://example.com/new-establishing.jpg'
    )
    expect(getSceneBeats(updated)[0].storyboardImageTier).toBe('draft')
  })

  it('does not overwrite scene.imageUrl for non-zero beats', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      beats: [
        {
          beatId: 'bt_0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide',
          storyboardImageUrl: 'https://example.com/establishing.jpg',
        },
        {
          beatId: 'bt_1',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Tracking',
        },
      ],
    }

    const updated = applyExpressStoryboardImageToScene(scene, {
      imageUrl: 'https://example.com/tracking.jpg',
      beatIndex: 1,
      imageTier: 'draft',
    })

    expect(updated.imageUrl).toBe('https://example.com/establishing.jpg')
    const storedBeats = updated.beats as SceneBeat[]
    expect(storedBeats[1].storyboardImageUrl).toBe('https://example.com/tracking.jpg')
    expect(updated.storyboardStatus).toBe('pending_review')
  })

  it('persists beat frame errors and clears them on later success', () => {
    const scene = {
      heading: 'INT. OFFICE - DAY',
      beats: [
        {
          beatId: 'bt_0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide',
        },
      ],
    }

    const failed = applyExpressStoryboardImageErrorToScene(scene, {
      error: 'Rate limited — retry this frame',
      beatIndex: 0,
    })
    expect((failed.beats as SceneBeat[])[0].storyboardImageError).toBe(
      'Rate limited — retry this frame'
    )

    const recovered = applyExpressStoryboardImageToScene(failed, {
      imageUrl: 'https://example.com/ok.jpg',
      beatIndex: 0,
      imageTier: 'draft',
    })
    expect((recovered.beats as SceneBeat[])[0].storyboardImageError).toBeUndefined()
    expect((recovered.beats as SceneBeat[])[0].storyboardImageUrl).toBe(
      'https://example.com/ok.jpg'
    )
  })

  it('restamps still keys so a leftover Prompt Changed key does not survive a good gen', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Elara raises the journal.',
          beatDirection: { shotType: 'Medium Shot', frozenMoment: 'Elara raises the journal' },
          storyboardImageUrl: 'https://example.com/old.jpg',
          storyboardImageDirectionKey: 'still-v3|shotType=Wide Shot',
          storyboardImageContentKey: 'action|Old prose',
        },
      ],
    }

    const updated = applyBeatStoryboardImageToScene(
      scene,
      0,
      'https://example.com/new.jpg',
      { imageTier: 'final', imagePrompt: 'Medium shot: Elara raises the journal.' }
    )
    const beat = getSceneBeats(updated)[0]
    expect(beat.storyboardImageTier).toBe('final')
    expect(isBeatFrameStale(beat)).toBe(false)
    expect(beat.storyboardImageDirectionKey).toBe(
      beatStillDirectionFingerprint({
        shotType: 'Medium Shot',
        frozenMoment: 'Elara raises the journal',
      })
    )
    expect(beat.storyboardImageContentKey).toBe('action|Elara raises the journal.')
  })
})
