import { describe, expect, it } from 'vitest'
import { buildBeatVideoClips } from '@/lib/scene/buildBeatVideoClips'
import { deriveSegmentsFromBeats } from '@/lib/scene/deriveSegmentsFromBeats'
import { listMixerBeatRows } from '@/lib/scene/mixerBeatInclude'
import { isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  countStoryboardFrameStats,
  enumerateStoryboardFrameSlots,
} from '@/lib/storyboard/types'
import { buildExpressBeatFrameItems } from '@/lib/storyboard/expressBeatFrameProgress'
import { videoRailStatus } from '@/lib/vision/videoClipFilters'
import type { SceneSegment } from '@/components/vision/scene-production/types'

describe('isBeatExcluded', () => {
  it('returns true only when excluded is explicitly true', () => {
    expect(isBeatExcluded({ beatId: 'b1', sequenceIndex: 0, kind: 'action' } as SceneBeat)).toBe(
      false
    )
    expect(
      isBeatExcluded({
        beatId: 'b1',
        sequenceIndex: 0,
        kind: 'action',
        excluded: true,
      } as SceneBeat)
    ).toBe(true)
    expect(
      isBeatExcluded({
        beatId: 'b1',
        sequenceIndex: 0,
        kind: 'action',
        excluded: false,
      } as SceneBeat)
    ).toBe(false)
  })
})

describe('excluded beats in storyboard slots', () => {
  const scene = {
    beats: [
      {
        beatId: 'bt_active',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Active beat',
        storyboardImageUrl: 'https://example.com/active.jpg',
      },
      {
        beatId: 'bt_excluded',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'Excluded beat',
        excluded: true,
      },
    ],
  }

  it('enumerateStoryboardFrameSlots omits excluded beats', () => {
    const slots = enumerateStoryboardFrameSlots(scene)
    expect(slots).toHaveLength(1)
    expect(slots[0].beatId).toBe('bt_active')
  })

  it('countStoryboardFrameStats does not count excluded beats as missing', () => {
    const stats = countStoryboardFrameStats(scene)
    expect(stats.total).toBe(1)
    expect(stats.missing).toBe(0)
    expect(stats.withImage).toBe(1)
  })

  it('buildExpressBeatFrameItems omits excluded beats', () => {
    const items = buildExpressBeatFrameItems(scene, {
      scope: 'missing',
      includeEndFrames: false,
      storyboardQuality: 'draft',
    })
    expect(items.every((item) => item.key !== 'bt_excluded')).toBe(true)
  })
})

describe('deriveSegmentsFromBeats with excluded beats', () => {
  it('skips excluded beats without failing on missing frames', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Active establishing shot',
        storyboardImageUrl: 'https://example.com/frame-1.jpg',
      },
      {
        beatId: 'bt_2',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'Excluded filler beat',
        excluded: true,
      },
      {
        beatId: 'bt_3',
        sequenceIndex: 2,
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Hello there.',
        lineId: 'ln_1',
        durationSeconds: 4,
        storyboardImageUrl: 'https://example.com/frame-3.jpg',
      },
    ]

    const result = deriveSegmentsFromBeats({
      storyboardStatus: 'approved',
      beats,
    })

    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(2)
    expect(result.segments.map((seg) => seg.beatId)).toEqual(['bt_1', 'bt_3'])
  })

  it('preserves canonical shot numbers and does not leak excluded Shot 1 into Shot 15 as Missing in a 15-shot scene', () => {
    const makeBeats = (excludeShot1: boolean): SceneBeat[] =>
      Array.from({ length: 15 }, (_, idx) => ({
        beatId: `bt_${idx + 1}`,
        sequenceIndex: idx,
        kind: 'action' as const,
        actionDescription: `Action for shot ${idx + 1}`,
        storyboardImageUrl: `https://example.com/still-${idx + 1}.jpg`,
        storyboardImageTier: 'final' as const,
        ...(idx === 0 && excludeShot1 ? { excluded: true } : {}),
      }))

    const segments: SceneSegment[] = Array.from({ length: 15 }, (_, idx) => ({
      segmentId: `seg_${idx + 1}`,
      beatId: `bt_${idx + 1}`,
      sequenceIndex: idx,
      startTime: idx * 5,
      endTime: (idx + 1) * 5,
      status: 'COMPLETE',
      assetType: 'video',
      activeAssetUrl: `https://example.com/clip-${idx + 1}.mp4`,
      takes: [
        {
          id: `take_${idx + 1}`,
          assetUrl: `https://example.com/clip-${idx + 1}.mp4`,
          videoUrl: `https://example.com/clip-${idx + 1}.mp4`,
          status: 'COMPLETE',
          createdAt: '2026-04-20T00:00:00.000Z',
          duration: 5,
        },
      ],
      references: {
        startFrameUrl: `https://example.com/still-${idx + 1}.jpg`,
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
    }))

    // 1. Exclude Shot 1 (`bt_1`), while `seg_1` remains preserved in `segments`
    const excludedScene = { beats: makeBeats(true) }
    const clipsWhileExcluded = buildBeatVideoClips({
      scene: excludedScene,
      segments,
      queue: [],
    })

    // Only the 14 active beats (Shot 2 .. Shot 15) should appear; `seg_1` must NOT leak into orphanClips as fake Shot 15
    expect(clipsWhileExcluded).toHaveLength(14)
    expect(clipsWhileExcluded.map((c) => c.beatNumber)).toEqual(
      Array.from({ length: 14 }, (_, i) => i + 2)
    )
    expect(clipsWhileExcluded.some((c) => c.beatId === 'bt_1' || c.key === 'seg_1')).toBe(false)

    // Shot 15 (`bt_15`) stays Shot 15 with its own `seg_15` clip and `final` tier (never `Missing`)
    const shot15WhileExcluded = clipsWhileExcluded.find((c) => c.beatNumber === 15)
    expect(shot15WhileExcluded?.beatId).toBe('bt_15')
    expect(shot15WhileExcluded?.segment?.segmentId).toBe('seg_15')
    expect(shot15WhileExcluded?.imageTier).toBe('final')
    expect(
      videoRailStatus({
        key: shot15WhileExcluded!.key,
        status: 'complete',
        promptChanged: false,
        imageTier: shot15WhileExcluded?.imageTier,
      }).label
    ).toBe('Final')

    // Mixer rows also keep canonical Shot #2 .. Shot #15 numbering
    const mixerRows = listMixerBeatRows(excludedScene, segments)
    expect(mixerRows).toHaveLength(14)
    expect(mixerRows[0]).toMatchObject({ beatId: 'bt_2', beatNumber: 2 })
    expect(mixerRows[13]).toMatchObject({ beatId: 'bt_15', beatNumber: 15 })

    // 2. Toggle Shot 1 (`bt_1`) back to Included
    const reIncludedScene = { beats: makeBeats(false) }
    const clipsAfterReInclude = buildBeatVideoClips({
      scene: reIncludedScene,
      segments,
      queue: [],
    })

    expect(clipsAfterReInclude).toHaveLength(15)
    expect(clipsAfterReInclude.map((c) => c.beatNumber)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1)
    )
    expect(clipsAfterReInclude[0]?.beatId).toBe('bt_1')
    expect(clipsAfterReInclude[0]?.segment?.segmentId).toBe('seg_1')
    expect(clipsAfterReInclude[14]?.beatId).toBe('bt_15')
    expect(clipsAfterReInclude[14]?.segment?.segmentId).toBe('seg_15')
  })

  it('resolves imageTier and thumbnailUrl when Start/End frames (storyboardStartImageUrl / storyboardEndImageUrl) are created without a Shot Still', () => {
    const sceneWithActionFramesOnly = {
      beats: [
        {
          beatId: 'bt_frames_only',
          sequenceIndex: 0,
          kind: 'action' as const,
          actionDescription: 'Hero leaps across the rooftop',
          storyboardStartImageUrl: 'https://example.com/start-frame.jpg',
          storyboardStartImageTier: 'final' as const,
          storyboardEndImageUrl: 'https://example.com/end-frame.jpg',
          storyboardEndImageTier: 'final' as const,
        },
        {
          beatId: 'bt_no_frames',
          sequenceIndex: 1,
          kind: 'dialogue' as const,
          character: 'Sarah',
          line: 'Watch out!',
        },
      ],
    }

    const segments: SceneSegment[] = [
      {
        segmentId: 'seg_1',
        beatId: 'bt_frames_only',
        sequenceIndex: 0,
        startTime: 0,
        endTime: 5,
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://example.com/clip-1.mp4',
        takes: [
          {
            id: 'take_1',
            assetUrl: 'https://example.com/clip-1.mp4',
            videoUrl: 'https://example.com/clip-1.mp4',
            status: 'COMPLETE',
            createdAt: '2026-04-20T00:00:00.000Z',
            duration: 5,
          },
        ],
      } as SceneSegment,
      {
        segmentId: 'seg_2',
        beatId: 'bt_no_frames',
        sequenceIndex: 1,
        startTime: 5,
        endTime: 10,
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://example.com/clip-2.mp4',
        takes: [
          {
            id: 'take_2',
            assetUrl: 'https://example.com/clip-2.mp4',
            videoUrl: 'https://example.com/clip-2.mp4',
            status: 'COMPLETE',
            createdAt: '2026-04-20T00:00:00.000Z',
            duration: 5,
          },
        ],
      } as SceneSegment,
    ]

    const clips = buildBeatVideoClips({
      scene: sceneWithActionFramesOnly,
      segments,
      queue: [],
    })

    expect(clips).toHaveLength(2)
    // Shot 1 has dedicated Start/End frames and no storyboardImageUrl -> resolves 'final' tier and start frame thumbnail
    expect(clips[0]?.imageTier).toBe('final')
    expect(clips[0]?.thumbnailUrl).toBe('https://example.com/start-frame.jpg')
    expect(clips[0]?.hasStartFrame).toBe(true)
    expect(clips[0]?.f2vStartUrl).toBe('https://example.com/start-frame.jpg')
    expect(clips[0]?.f2vEndUrl).toBe('https://example.com/end-frame.jpg')

    // Shot 2 was rendered via Standard Reference-to-Video without any still frames -> status is still 'Final' (ready), never 'Missing'
    expect(clips[1]?.imageTier).toBeUndefined()
    expect(
      videoRailStatus({
        key: clips[1]!.key,
        status: 'complete',
        promptChanged: false,
        imageTier: clips[1]?.imageTier,
      })
    ).toEqual({
      status: 'ready',
      label: 'Final',
    })
  })
})
