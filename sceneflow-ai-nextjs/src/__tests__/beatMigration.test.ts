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
} from '@/lib/script/beatMigration'
import { VEO_DIALOGUE_CLIP_MAX_SEC } from '@/lib/scene/dialogueSegmentSplit'
import type { SceneBeat } from '@/lib/script/segmentTypes'

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

  it('normalizeBeatsForProduction flags long dialogue for split', () => {
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
    expect(beats[0].needsSplit).toBe(true)
    expect(beats[0].splitRecommendation?.partCount).toBeGreaterThan(1)
    expect(beats[0].splitRecommendation?.excerpts.length).toBeGreaterThan(1)
    for (const excerpt of beats[0].splitRecommendation?.excerpts ?? []) {
      expect(excerpt.length).toBeGreaterThan(0)
    }
    expect(VEO_DIALOGUE_CLIP_MAX_SEC).toBeGreaterThan(0)
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
})
