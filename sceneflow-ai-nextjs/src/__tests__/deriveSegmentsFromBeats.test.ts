import { describe, it, expect } from 'vitest'
import {
  deriveSegmentsFromBeats,
  applyBeatSplitAndDerive,
  mergeDerivedSegmentsWithExisting,
  needsProductionDerive,
  productionDeriveAttemptKey,
  buildStartFramePrompt,
  buildEndFramePrompt,
  isStoredFrameBookendPromptAligned,
  resolveAlignedStartFrameInstruction,
  resolveAlignedEndFrameInstruction,
} from '@/lib/scene/deriveSegmentsFromBeats'
import {
  extractClipPromptFacets,
  parseClipBookendDirectorResponse,
} from '@/lib/intelligence/clip-frame-bookend-director-fallback'
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

  it('derives when frames exist even if pre-vis was never approved', () => {
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
    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(1)
  })

  it('still rejects derivation when approval is explicitly required', () => {
    const scene = approvedScene([
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Test',
      },
    ])
    scene.storyboardStatus = 'pending_review'
    const result = deriveSegmentsFromBeats(scene, { requireApproved: true })
    expect(result.segments).toHaveLength(0)
    expect(result.errors[0]).toMatch(/approved/i)
  })

  it('splits long dialogue across shots instead of shortening the line', () => {
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
    expect(result.segments.length).toBeGreaterThan(1)
    expect(result.segments[0].beatId).toBe('bt_dialogue')
    expect(result.segments[0].generationMethod).toBe('REF')
    expect(result.segments.slice(1).every((s) => s.generationMethod === 'EXT')).toBe(true)
    expect(result.segments.slice(1).every((s) => s.transitionType === 'CONTINUE')).toBe(true)
    const joined = result.segments.map((s) => s.dialoguePortion?.excerpt ?? '').join(' ')
    expect(joined.replace(/\s+/g, ' ').trim()).toBe(longLine.replace(/\s+/g, ' ').trim())
  })

  it('auto-splits long dialogue so spoken text is not stuffed into one 10s clip', () => {
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
    expect(result.segments.length).toBeGreaterThan(1)
    expect(result.segments[0].generationMethod).toBe('REF')
      expect(result.segments.some((s) => s.generationMethod === 'EXT')).toBe(true)
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

  it('applyBeatSplitAndDerive splits a long spoken beat (extendBeatId ignored)', () => {
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
    expect(result.segments.length).toBeGreaterThan(1)
    expect(result.updatedScene).toBeUndefined()
  })

  it('uses TTS duration for active language but does not split a short line', () => {
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

  it('keeps the completed clip when a beat was split into two segments', () => {
    const scene = approvedScene([
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Hello.',
        lineId: 'ln_1',
      },
    ])
    const derived = deriveSegmentsFromBeats(scene).segments
    const existing = [
      {
        ...derived[0],
        segmentId: 'seg_part_0',
        dialoguePortion: { lineId: 'ln_1', partIndex: 0, partCount: 2, excerpt: 'Hel' },
        status: 'DRAFT' as const,
      },
      {
        ...derived[0],
        segmentId: 'seg_part_1',
        dialoguePortion: { lineId: 'ln_1', partIndex: 1, partCount: 2, excerpt: 'lo' },
        status: 'COMPLETE' as const,
        assetType: 'video' as const,
        activeAssetUrl: 'https://example.com/part1.mp4',
        takes: [
          {
            id: 'take-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            assetUrl: 'https://example.com/part1.mp4',
            status: 'COMPLETE' as const,
          },
        ],
      },
    ]
    const merged = mergeDerivedSegmentsWithExisting(derived, existing)
    expect(merged).toHaveLength(1)
    expect(merged[0].segmentId).toBe('seg_part_1')
    expect(merged[0].activeAssetUrl).toBe('https://example.com/part1.mp4')
  })

  it('heals a segment whose clip lives in takes with status DRAFT when re-deriving after beat exclude/include', () => {
    const scene = approvedScene([
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Shot 1',
      },
    ])
    const derived = deriveSegmentsFromBeats(scene).segments
    const existing = [
      {
        ...derived[0],
        status: 'DRAFT' as const,
        assetType: null,
        activeAssetUrl: null,
        takes: [
          {
            id: 'take-clip-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            assetUrl: 'https://example.com/shot1.mp4',
            status: 'COMPLETE' as const,
          },
        ],
      },
    ]

    const merged = mergeDerivedSegmentsWithExisting(derived, existing)
    expect(merged[0].status).toBe('COMPLETE')
    expect(merged[0].assetType).toBe('video')
    expect(merged[0].activeAssetUrl).toBe('https://example.com/shot1.mp4')
    expect(merged[0].currentTakeId).toBe('take-clip-1')
  })
})

describe('needsProductionDerive', () => {
  it('returns true for a framed scene that was never approved and has no clips', () => {
    const scene = approvedScene([
      { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Test' },
    ])
    scene.storyboardStatus = 'pending_review'
    expect(needsProductionDerive(scene, [])).toBe(true)
  })

  it('returns true when one beat has two clips', () => {
    const scene = approvedScene([
      { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Test' },
    ])
    const [segment] = deriveSegmentsFromBeats(scene).segments
    expect(
      needsProductionDerive(scene, [
        segment,
        { ...segment, segmentId: 'seg_extra', dialoguePortion: { lineId: 'ln', partIndex: 1, partCount: 2, excerpt: 'x' } },
      ])
    ).toBe(true)
  })

  it('returns false when a beat already has a well-formed dialogue split', () => {
    const longLine =
      'This is a long spoken line that should exceed eight seconds of dialogue when read at a natural pace. '.repeat(
        4
      )
    const scene = approvedScene([
      {
        beatId: 'bt_split',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Alex',
        line: longLine,
        lineId: 'ln_split',
      },
    ])
    const segments = deriveSegmentsFromBeats(scene).segments
    expect(segments.length).toBeGreaterThan(1)
    expect(needsProductionDerive(scene, segments)).toBe(false)
  })

  it('returns false when clips are already one per beat', () => {
    const scene = approvedScene([
      { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Test' },
    ])
    expect(needsProductionDerive(scene, deriveSegmentsFromBeats(scene).segments)).toBe(false)
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

  it('restores an included beat missing from the stored segments', () => {
    const beats: SceneBeat[] = Array.from({ length: 6 }, (_, index) => ({
      beatId: `bt_${index + 1}`,
      sequenceIndex: index,
      kind: 'action' as const,
      actionDescription: `Beat ${index + 1}`,
    }))
    const scene = approvedScene(beats)
    const derived = deriveSegmentsFromBeats(scene).segments
    const stored = derived.slice(0, 5)
    const staleSixth = { ...derived[5], mixerBeatIncluded: false }

    expect(needsProductionDerive(scene, stored)).toBe(true)

    const merged = deriveSegmentsFromBeats(scene, {
      existingSegments: [...stored, staleSixth],
    }).segments
    expect(merged.map((segment) => segment.beatId)).toEqual(beats.map((beat) => beat.beatId))
    expect(merged[5].mixerBeatIncluded).not.toBe(false)

    const excluded = approvedScene(
      beats.map((beat, index) => (index === 5 ? { ...beat, excluded: true } : beat))
    )
    expect(productionDeriveAttemptKey('scene-1', scene)).not.toBe(
      productionDeriveAttemptKey('scene-1', excluded)
    )
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

  it('derives a segment for an included beat that has no still', () => {
    const scene = {
      storyboardStatus: 'approved' as const,
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'action' as const,
          actionDescription: 'Has a still',
          storyboardImageUrl: 'https://example.com/frame.jpg',
        },
        {
          beatId: 'bt_2',
          sequenceIndex: 1,
          kind: 'action' as const,
          actionDescription: 'Still missing',
        },
      ],
    }
    const result = deriveSegmentsFromBeats(scene)
    expect(result.errors).toHaveLength(0)
    expect(result.segments.map((segment) => segment.beatId)).toEqual(['bt_1', 'bt_2'])
    expect(result.warnings?.some((warning) => warning.includes('bt_2'))).toBe(true)
    expect(needsProductionDerive(scene, result.segments.slice(0, 1))).toBe(true)
  })

  it('keeps the stored clip for a beat that is excluded from the active list', () => {
    const beats: SceneBeat[] = [
      { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Stay' },
      { beatId: 'bt_6', sequenceIndex: 1, kind: 'action', actionDescription: 'Parked', excluded: true },
    ]
    const scene = approvedScene(beats)
    const stored = deriveSegmentsFromBeats(approvedScene(beats.map((beat) => ({ ...beat, excluded: false })))).segments
    const upload = {
      ...stored[1],
      activeAssetUrl: 'https://cdn.example/upload.mp4',
      assetType: 'video' as const,
      status: 'COMPLETE' as const,
    }
    const derived = deriveSegmentsFromBeats(scene, { existingSegments: [stored[0], upload] })
    expect(derived.segments.map((segment) => segment.beatId)).toEqual(['bt_1', 'bt_6'])
    expect(derived.segments[1].activeAssetUrl).toBe('https://cdn.example/upload.mp4')
  })

  it('buildStartFramePrompt and buildEndFramePrompt direct starting and ending action with consistent lighting and location', () => {
    const beat: SceneBeat = {
      beatId: 'bt_action_1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Marcus turns from the rain-streaked window toward the desk.',
      beatDirection: {
        shotType: 'Medium Shot',
        blocking: 'Marcus pivots from window to desk',
        frozenMoment: 'Marcus mid-turn toward the desk',
      },
    }
    const startPrompt = buildStartFramePrompt(beat)
    const endPrompt = buildEndFramePrompt(beat)
    expect(startPrompt).toMatch(/Initial opening posture and staging at the start of action/i)
    expect(startPrompt).toMatch(/consistent lighting, shadows, and location/i)
    expect(endPrompt).toMatch(/Concluding action state/i)
    expect(endPrompt).toMatch(/consistent lighting and location/i)
  })

  it('aligns start and end still frame prompts with the Episode 1 Clips prompt without character hallucinations or nested boilerplate', () => {
    const episode1ClipPrompt =
      'Twin horizontal beams of pale white light slice across an obsidian vault interior from screen-left to screen-right. Stationary particulate sits caught inside the parallel light shafts, suspended above pitch-black floor shadows. Centered prominently between the crossbeams, bold white typography displays "Episode 1: The White City Current". Coverage: Frame the primary episode title against an obsidian subterranean void cut by piercing crossbeams. Lens: Static, monumental presentation with subtle floating particle drift. Space: Episode title commands dead-center frame, bookended by horizontal light cuts piercing the deep vault. Shot: Extreme Wide Graphic Shot. Angle: eye-level. Camera: static. Blocking: Stationary dust clusters sit trapped in two parallel horizontal light beams stretching edge-to-edge across the obsidian void. Emotion: Stark grandeur and chilling finality. Gaze: N/A. Lighting: Narrow horizontal slits of razor-sharp white light puncturing an otherwise impenetrable black field. End on: Parallel horizontal light blades illuminate stationary particulate surrounding centered bold white lettering reading "Episode 1: The White City Current". Sound: low-frequency electrical thrum. Film Noir industrial subterranean low-key, fluid motion. Incoming continuity from Wide Corridor Tracking Shot. props remain: Suspended crystalline frost motes. No people in frame. The only action is: Twin horizontal beams of pale white light slice across an obsidian vault interior from screen-left to screen-right. Stationary particulate sits caught inside the parallel light shafts, suspended above pitch-black floor shadows. Centered prominently between the crossbeams, bold white typography displays "Episode 1: The White City Current". No spoken dialogue. photorealistic, cinematic motion, professional cinematography, natural lighting, shallow depth of field'

    const brokenStartPrompt =
      'Edit the reference shot still to illustrate the starting action of the shot (t=0s, the exact moment before the shot movement unfolds). Position the subject and camera at their initial opening pose and staging. DO NOT hallucinate new objects, DO NOT change the background or location architecture, and DO NOT alter character core appearance, wardrobe, or lighting. Maintain absolute physics and visual continuity with consistent lighting and location. Starting action direction (t=0s): Opening framing (Medium Shot, Eye-Level). Camera positioned at initial starting point before Hypnotic, micro-dolly forward maintaining pristine typographic alignment.. Initial opening posture and staging at the start of action: Horizontally bisected frame; pure negative shadow space in upper and lower thirds, bright volumetric light in mid-third.. initial Surgical coldness and mystery. expression, gaze directed Dead-center focal lock on the centered typography.. Consistent lighting and location (Twin volumetric white planes creating razor-edge contrast against surrounding black void.)'

    const brokenEndPrompt =
      'Edit the start frame image to reflect movement that aligns with the beat action and illustrates the ending action of the shot. DO NOT hallucinate new objects, DO NOT change the background, and DO NOT alter character core appearance. Maintain absolute physics and visual continuity with consistent lighting and location. Edit start frame: Edit the reference shot still to illustrate the starting action of the shot (t=0s, the exact moment before the shot movement unfolds)... Movement delta: Concluding action state: A horizontal slice of diamond-like stationary particulate caught in mid-air between two razor-sharp white light shafts.. Final blocking position: Horizontally bisected frame; pure negative shadow space in upper and lower thirds, bright volumetric light in mid-third.. Camera settles after Hypnotic, micro-dolly forward maintaining pristine typographic alignment.. expression shifts to Surgical coldness and mystery., gaze directed Dead-center focal lock on the centered typography.. Consistent lighting and location (Twin volumetric white planes creating razor-edge contrast against surrounding black void.)'

    const beat: SceneBeat = {
      beatId: 'bt_title_1',
      sequenceIndex: 0,
      kind: 'action',
      beatRole: 'title_reveal',
      actionDescription:
        'Twin horizontal beams of pale white light slice across an obsidian vault interior from screen-left to screen-right. Centered prominently between the crossbeams, bold white typography displays "Episode 1: The White City Current".',
      storyboardStartImagePrompt: brokenStartPrompt,
      storyboardEndImagePrompt: brokenEndPrompt,
      // Even if beatDirection was overwritten with stale Medium Shot / micro-dolly, scene.segments holds the Clips prompt
      beatDirection: {
        shotType: 'Medium Shot',
        cameraAngle: 'Eye-Level',
        cameraMovement: 'Hypnotic, micro-dolly forward maintaining pristine typographic alignment.',
        blocking:
          'Horizontally bisected frame; pure negative shadow space in upper and lower thirds, bright volumetric light in mid-third.',
        emotion: 'Surgical coldness and mystery.',
        gaze: 'Dead-center focal lock on the centered typography.',
        lightingAccent:
          'Twin volumetric white planes creating razor-edge contrast against surrounding black void.',
      },
    }

    const scene = {
      beats: [beat],
      segments: [
        {
          segmentId: 'seg_1',
          beatId: 'bt_title_1',
          generatedPrompt: episode1ClipPrompt,
        },
      ],
    }

    const facets = extractClipPromptFacets(episode1ClipPrompt)
    expect(facets.shot).toBe('Extreme Wide Graphic Shot')
    expect(facets.camera).toBe('static')
    expect(facets.gaze).toBeUndefined()
    expect(facets.noPeopleInFrame).toBe(true)

    expect(isStoredFrameBookendPromptAligned(brokenStartPrompt, beat, { scene })).toBe(false)
    expect(isStoredFrameBookendPromptAligned(brokenEndPrompt, beat, { scene })).toBe(false)

    const alignedStart = resolveAlignedStartFrameInstruction(beat, { scene })
    const alignedEnd = resolveAlignedEndFrameInstruction(beat, { scene })

    // Aligned with Clips prompt
    expect(alignedStart).toContain('Extreme Wide Graphic Shot')
    expect(alignedStart).toContain('Static camera lock')
    expect(alignedStart).toContain('Episode 1: The White City Current')
    expect(alignedStart).toContain('No people in frame')
    expect(alignedStart).not.toContain('Medium Shot')
    expect(alignedStart).not.toContain('micro-dolly')
    expect(alignedStart).not.toMatch(/\bexpression\b/i)
    expect(alignedStart).not.toMatch(/gaze directed/i)
    expect(alignedStart).not.toMatch(/\.\s*\./)

    expect(alignedEnd).toContain('Extreme Wide Graphic Shot')
    expect(alignedEnd).toContain('Episode 1: The White City Current')
    expect(alignedEnd).toContain('No people in frame')
    expect(alignedEnd).not.toContain('Edit start frame: Edit the reference shot still')
    expect(alignedEnd).not.toContain('Medium Shot')
    expect(alignedEnd).not.toContain('micro-dolly')
    expect(alignedEnd).not.toMatch(/\bexpression\b/i)
    expect(alignedEnd).not.toMatch(/gaze directed/i)
    expect(alignedEnd).not.toMatch(/\.\s*\./)

    // Verify LLM JSON parser for Clip Bookend Director
    const parsed = parseClipBookendDirectorResponse(
      JSON.stringify({
        startFramePrompt:
          'Extreme Wide Graphic Shot, eye-level, static camera at t=0s. Twin horizontal beams of pale white light slice across an obsidian vault interior with centered bold white typography reading "Episode 1: The White City Current" and stationary crystalline frost motes. No people in frame.',
        endFramePrompt:
          'Extreme Wide Graphic Shot, eye-level, static camera at end of shot. Parallel horizontal light blades illuminate stationary particulate surrounding centered bold white lettering reading "Episode 1: The White City Current". No people in frame.',
      }),
      { clipPrompt: episode1ClipPrompt, beat }
    )
    expect(parsed?.startFramePrompt).toContain('Episode 1: The White City Current')
    expect(parsed?.endFramePrompt).toContain('Episode 1: The White City Current')
  })

  it('replaces restrictive End Frame prompts ("DO NOT change the background" / "Edit start frame:") with F2V-progressed camera and motion direction', () => {
    const corridorClipPrompt =
      'A low angle medium wide shot down a desolate subterranean freight corridor where massive concrete walls and overhead iron girders converge toward a distant vanishing point. Crisp white typography spelling "The Secret Journals Series" floats precisely centered at the corridor focal midpoint. Shot: Medium Wide Shot. Angle: low angle. Camera: slow push-in down the subterranean freight corridor. Blocking: Uninhabited industrial corridor receding into deep vanishing point. Lighting: Harsh tungsten amber downlight casting geometric girder grid shadows across cracked floor plates and frosted copper turbine coils. End on: Deeper down the freight corridor after the push-in, framing the centered white typography "The Secret Journals Series" closer against the receding ironwork and amber shadow grid. No people in frame.'

    const legacyRestrictiveEndPrompt =
      "Edit the start frame image to reflect movement that aligns with the beat action and illustrates the ending action of the shot. DO NOT hallucinate new objects, DO NOT change the background, and DO NOT alter character core appearance. Maintain absolute physics and visual continuity with consistent lighting and location.\n\nEdit start frame: A low angle medium wide shot down a desolate subterranean freight corridor where massive concrete walls and overhead iron girders converge toward a distant vanishing point. Overhead, a single amber cage fixture casts deep geometric grid shadows diagonally across cracked industrial floor plates and frosted copper turbine coils along the walls. Crisp white typography spelling 'The Secret Journals Series' floats precisely centered at the corridor's focal midpoint. Harsh tungsten amber downlight rims the overhead pipe runs and floor fractures amidst deep noir chiaroscuro shadows and atmospheric subterranean haze. No people in frame.\n\nMovement delta: Settling closer after a slow push-in down the subterranean freight corridor, the low angle medium wide composition draws deeper into the architectural vanishing point."

    const beat: SceneBeat = {
      beatId: 'bt_corridor_1',
      sequenceIndex: 0,
      kind: 'action',
      beatRole: 'title_reveal',
      actionDescription:
        'Slow push-in down a desolate subterranean freight corridor toward centered white typography "The Secret Journals Series".',
      storyboardEndImagePrompt: legacyRestrictiveEndPrompt,
      beatDirection: {
        shotType: 'Medium Wide Shot',
        cameraAngle: 'low angle',
        cameraMovement: 'slow push-in down the subterranean freight corridor',
      },
    }

    const scene = {
      beats: [beat],
      segments: [
        {
          segmentId: 'seg_corridor_1',
          beatId: 'bt_corridor_1',
          generatedPrompt: corridorClipPrompt,
        },
      ],
    }

    expect(isStoredFrameBookendPromptAligned(legacyRestrictiveEndPrompt, beat, { scene })).toBe(
      false
    )

    const alignedEndInstruction = resolveAlignedEndFrameInstruction(beat, { scene })
    expect(alignedEndInstruction).not.toContain('DO NOT change the background')
    expect(alignedEndInstruction).not.toContain('DO NOT alter character core appearance')
    expect(alignedEndInstruction).not.toContain('Edit start frame:')
    expect(alignedEndInstruction).toContain('Frame-to-Video (F2V)')
    expect(alignedEndInstruction).toContain('Concluding end frame direction (t=T):')
    expect(alignedEndInstruction).toContain(
      'advancing deeper into the space with tighter terminal framing'
    )
    expect(alignedEndInstruction).toContain('near-field foreground elements from t=0s pass out')
    expect(alignedEndInstruction).toContain('The Secret Journals Series')
    expect(alignedEndInstruction).toContain('No people in frame')
  })
})
