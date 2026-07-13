import { describe, it, expect } from 'vitest'
import {
  deriveSegmentsFromBeats,
  applyBeatSplitAndDerive,
  mergeDerivedSegmentsWithExisting,
  needsProductionDerive,
} from '@/lib/scene/deriveSegmentsFromBeats'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const approvedScene = (beats: SceneBeat[]) => ({
  storyboardStatus: 'approved' as const,
  beats: beats.map((b) => ({
    ...b,
    storyboardImageUrl: b.storyboardImageUrl ?? 'https://example.com/frame.jpg',
  })),
})

describe('deriveSegmentsFromBeats', () => {
  it('derives one segment per beat in sequence order', () => {
    const beats: SceneBeat[] = [
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
        character: 'Sarah',
        line: 'Hello there.',
        lineId: 'ln_1',
        durationSeconds: 4,
      },
    ]
    const result = deriveSegmentsFromBeats(approvedScene(beats))
    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(2)
    expect(result.segments[0].beatId).toBe('bt_1')
    expect(result.segments[0].generationMethod).toBe('REF')
    expect(result.segments[0].references?.startFrameUrl).toContain('example.com')
    expect(result.segments[0].startFrameUrl).toContain('example.com')
    expect(result.segments[0].anchorStatus).toBe('start-locked')
    expect(result.segments[1].beatId).toBe('bt_2')
  })

  it('derives five segments with matching Pre-Vis start URLs for five beats', () => {
    const beats: SceneBeat[] = Array.from({ length: 5 }, (_, i) => ({
      beatId: `bt_${i + 1}`,
      sequenceIndex: i,
      kind: 'dialogue' as const,
      character: 'Sarah',
      line: `Line ${i + 1}.`,
      lineId: `ln_${i + 1}`,
      durationSeconds: 4,
      storyboardImageUrl: `https://example.com/previz-beat-${i + 1}.jpg`,
    }))
    const result = deriveSegmentsFromBeats(approvedScene(beats))
    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(5)
    result.segments.forEach((seg, i) => {
      expect(seg.beatId).toBe(`bt_${i + 1}`)
      expect(seg.startFrameUrl).toBe(`https://example.com/previz-beat-${i + 1}.jpg`)
      expect(seg.references?.startFrameUrl).toBe(`https://example.com/previz-beat-${i + 1}.jpg`)
      expect(seg.anchorStatus).toBe('start-locked')
    })
  })

  it('rejects derivation when storyboard is not approved', () => {
    const scene = approvedScene([
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Test',
      },
    ])
    scene.storyboardStatus = 'pending_review'
    const result = deriveSegmentsFromBeats(scene)
    expect(result.segments).toHaveLength(0)
    expect(result.errors[0]).toMatch(/approved/i)
  })

  it('keeps long dialogue as a single segment (Kling-first, no Veo EXT chain)', () => {
    const longLine =
      'We have to move now before they find us at the warehouse loading dock tonight. '.repeat(2)
    const scene = approvedScene([
      {
        beatId: 'bt_dialogue',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Bob',
        line: longLine,
        lineId: 'ln_1',
        durationSeconds: 12,
      },
    ])
    const result = applyBeatSplitAndDerive(scene, 'bt_dialogue')
    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].beatId).toBe('bt_dialogue')
    expect(result.segments[0].generationMethod).toBe('REF')
    expect(result.segments[0].veoTimelineContinuation).toBe(false)
    expect(result.segments.some((s) => s.generationMethod === 'EXT')).toBe(false)
    expect(result.segments[0].dialogueLines?.[0]?.line).toBe(longLine)
  })

  it('does not auto-split long dialogue without manual extendBeatId', () => {
    const longLine =
      'This is a long spoken line that should exceed eight seconds of dialogue when read at a natural pace. '.repeat(
        4
      )
    const result = deriveSegmentsFromBeats(
      approvedScene([
        {
          beatId: 'bt_auto',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alex',
          line: longLine,
          lineId: 'ln_auto',
        },
      ])
    )
    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].generationMethod).toBe('REF')
    expect(result.segments[0].veoTimelineContinuation).toBe(false)
    expect(result.segments.some((s) => s.generationMethod === 'EXT')).toBe(false)
  })

  it('returns draft-frame warning when beats are not final', () => {
    const result = deriveSegmentsFromBeats(
      approvedScene([
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Test',
          storyboardImageUrl: 'https://example.com/frame.jpg',
          storyboardImageTier: 'draft',
        },
      ])
    )
    expect(result.errors).toHaveLength(0)
    expect(result.warnings?.[0]).toMatch(/Finalize/i)
  })

  it('applyBeatSplitAndDerive returns one segment per beat (extendBeatId ignored)', () => {
    const longLine =
      'We have to move now before they find us at the warehouse loading dock tonight. '.repeat(3)
    const scene = approvedScene([
      {
        beatId: 'bt_long',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Sarah',
        line: longLine,
        lineId: 'ln_long',
      },
    ])
    const result = applyBeatSplitAndDerive(scene, 'bt_long')
    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(1)
    expect(result.updatedScene).toBeUndefined()
  })

  it('uses TTS duration for active language but keeps one segment per beat', () => {
    const line = 'Hello there.'
    const scene = approvedScene([
      {
        beatId: 'bt_lang',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Sarah',
        line,
        lineId: 'ln_lang',
        durationSeconds: 4,
      },
    ])
    ;(scene as Record<string, unknown>).dialogueAudio = {
      en: [{ lineId: 'ln_lang', duration: 5 }],
      es: [{ lineId: 'ln_lang', duration: 14 }],
    }

    const enResult = deriveSegmentsFromBeats(scene, { language: 'en' })
    const esResult = deriveSegmentsFromBeats(scene, { language: 'es' })

    expect(enResult.segments).toHaveLength(1)
    expect(esResult.segments).toHaveLength(1)
    expect(esResult.segments[0].generationMethod).toBe('REF')
    expect(esResult.segments.some((s) => s.generationMethod === 'EXT')).toBe(false)
    expect(esResult.segments[0].endTime - esResult.segments[0].startTime).toBeGreaterThan(10)
  })
})

describe('mergeDerivedSegmentsWithExisting', () => {
  it('preserves production startFrameUrl when re-deriving segments', () => {
    const beatUrl = 'https://example.com/beat-1779527367000.jpeg'
    const productionUrl = 'https://example.com/production-1779527369000.jpeg'
    const scene = approvedScene([
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        storyboardImageUrl: beatUrl,
      },
    ])

    const derived = deriveSegmentsFromBeats(scene).segments
    const existing = [
      {
        ...derived[0],
        startFrameUrl: productionUrl,
        references: {
          ...derived[0].references,
          startFrameUrl: productionUrl,
        },
      },
    ]

    const merged = mergeDerivedSegmentsWithExisting(derived, existing)
    expect(merged[0].startFrameUrl).toBe(productionUrl)
    expect(merged[0].references?.startFrameUrl).toBe(productionUrl)
  })

  it('preserves mixer crop and trim fields when re-deriving segments', () => {
    const scene = approvedScene([
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Test',
      },
    ])

    const derived = deriveSegmentsFromBeats(scene).segments
    const existing = [
      {
        ...derived[0],
        watermarkCropPercent: 5,
        videoTrimInSec: 0.25,
        videoTrimOutSec: 7.5,
        mixerBeatIncluded: true,
      },
    ]

    const merged = mergeDerivedSegmentsWithExisting(derived, existing)
    expect(merged[0].watermarkCropPercent).toBe(5)
    expect(merged[0].videoTrimInSec).toBe(0.25)
    expect(merged[0].videoTrimOutSec).toBe(7.5)
    expect(merged[0].mixerBeatIncluded).toBe(true)
  })

  it('preserves uploaded video assets when re-deriving segments', () => {
    const scene = approvedScene([
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Test',
      },
    ])

    const derived = deriveSegmentsFromBeats(scene).segments
    const uploadUrl = 'https://example.com/user-upload.mp4'
    const existing = [
      {
        ...derived[0],
        status: 'COMPLETE' as const,
        assetType: 'video' as const,
        activeAssetUrl: uploadUrl,
        isUserUpload: true,
        takes: [
          {
            id: 'take-upload',
            createdAt: '2026-01-01T00:00:00.000Z',
            assetUrl: uploadUrl,
            status: 'COMPLETE' as const,
          },
        ],
      },
    ]

    const merged = mergeDerivedSegmentsWithExisting(derived, existing)
    expect(merged[0].activeAssetUrl).toBe(uploadUrl)
    expect(merged[0].isUserUpload).toBe(true)
    expect(merged[0].takes?.[0]?.assetUrl).toBe(uploadUrl)
    expect(merged[0].status).toBe('COMPLETE')
  })
})

describe('needsProductionDerive', () => {
  it('returns false when not storyboard-approved', () => {
    const scene = approvedScene([
      { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Test' },
    ])
    scene.storyboardStatus = 'pending_review'
    expect(needsProductionDerive(scene, [])).toBe(false)
  })

  it('returns true when approved scene has no segments', () => {
    const scene = approvedScene([
      { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Test' },
    ])
    expect(needsProductionDerive(scene, [])).toBe(true)
    expect(needsProductionDerive(scene, undefined)).toBe(true)
  })

  it('returns false when excluded beats do not reduce segment coverage', () => {
    const scene = approvedScene([
      { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Active' },
      {
        beatId: 'bt_2',
        sequenceIndex: 1,
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Excluded line.',
        lineId: 'ln_1',
        excluded: true,
      },
    ])
    const segments = deriveSegmentsFromBeats(scene).segments
    expect(segments).toHaveLength(1)
    expect(needsProductionDerive(scene, segments)).toBe(false)
  })

  it('returns true when an active beat is missing from segments', () => {
    const scene = approvedScene([
      { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'One' },
      {
        beatId: 'bt_2',
        sequenceIndex: 1,
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Two.',
        lineId: 'ln_1',
      },
    ])
    const segments = deriveSegmentsFromBeats(scene).segments.slice(0, 1)
    expect(needsProductionDerive(scene, segments)).toBe(true)
  })
})
