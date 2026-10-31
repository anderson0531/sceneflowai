import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  applyShotDirectorRecommendationsToScenes,
  mergeShotDirectorPatches,
  normalizeRecommendationShotPatch,
  resolveBeatForRecommendation,
  type SceneVideoRecommendation,
} from '@/lib/intelligence/scene-video-reviewer-types'
import {
  buildShotContextLedger,
  normalizeReviewResult,
  selectRenderedStreamForReview,
  toVertexGcsUri,
} from '@/lib/intelligence/scene-video-reviewer'
import { getSceneBeats } from '@/lib/script/beatMigration'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Multimodal Scene Video Reviewer — Media & GCS Resolution', () => {
  it('converts gs:// URIs and GCS HTTPS URLs to canonical gs:// fileUris for Vertex AI', () => {
    expect(toVertexGcsUri('gs://sceneflow-assets/projects/p1/renders/scene-1.mp4')).toBe(
      'gs://sceneflow-assets/projects/p1/renders/scene-1.mp4'
    )
    expect(
      toVertexGcsUri(
        'https://storage.googleapis.com/sceneflow-assets/projects/p1/renders/scenes/clip%201.mp4?X-Goog-Signature=abc'
      )
    ).toBe('gs://sceneflow-assets/projects/p1/renders/scenes/clip 1.mp4')
    expect(toVertexGcsUri('https://example.com/video.mp4')).toBeNull()
  })

  it('prefers completed video streams over animatic streams when selecting a rendered MP4', () => {
    const chosen = selectRenderedStreamForReview(
      [
        {
          id: 'stream-anim-en',
          language: 'en',
          streamType: 'animatic',
          status: 'complete',
          mp4Url: 'https://storage.googleapis.com/sceneflow-assets/animatic.mp4',
        },
        {
          id: 'stream-vid-en',
          language: 'en',
          streamType: 'video',
          status: 'complete',
          mp4Url: 'https://storage.googleapis.com/sceneflow-assets/video-en.mp4',
        },
      ],
      null
    )
    expect(chosen).not.toBeNull()
    expect(chosen?.streamId).toBe('stream-vid-en')
    expect(chosen?.url).toContain('video-en.mp4')
    expect(chosen?.streamLabel).toBe('Video (EN)')
  })
})

describe('Multimodal Scene Video Reviewer — Shot Ledger & Result Normalization', () => {
  const sampleScene = {
    id: 'scene-1',
    sceneNumber: 1,
    heading: 'INT. OBSERVATORY - NIGHT',
    action: 'Elena inspects the brass astrolabe under moonlight.',
    beats: [
      {
        beatId: 'beat-1',
        sequenceIndex: 0,
        kind: 'action' as const,
        text: 'Elena steps up to the brass astrolabe.',
        actionDescription: 'Elena steps up to the brass astrolabe.',
        estimatedDuration: 4,
        storyboardImageUrl: 'https://storage.googleapis.com/sceneflow-assets/frame-1.jpg',
        beatDirection: {
          shotType: 'Medium Shot',
          cameraAngle: 'Eye-Level',
          cameraMovement: 'Static',
          castInFrame: ['Elena'],
          keyProps: ['Brass Astrolabe'],
        },
      },
      {
        beatId: 'beat-2',
        sequenceIndex: 1,
        kind: 'spoken' as const,
        speaker: 'ELENA',
        line: 'The coordinates are shifting.',
        text: 'ELENA: The coordinates are shifting.',
        actionDescription: 'Elena traces the engraved rings.',
        estimatedDuration: 5,
        beatDirection: {
          shotType: 'Close-Up',
          cameraAngle: 'High Angle',
        },
      },
    ],
    segments: [
      {
        segmentId: 'seg-1',
        beatId: 'beat-1',
        sequenceIndex: 0,
        startTime: 0,
        endTime: 4,
        status: 'COMPLETE',
        assetType: 'video' as const,
        activeAssetUrl: 'https://storage.googleapis.com/sceneflow-assets/clip-1.mp4',
        videoPrompt: 'Medium shot of Elena stepping up to the brass astrolabe.',
      },
      {
        segmentId: 'seg-2',
        beatId: 'beat-2',
        sequenceIndex: 1,
        startTime: 4,
        endTime: 9,
        status: 'COMPLETE',
        assetType: 'video' as const,
        activeAssetUrl: 'https://storage.googleapis.com/sceneflow-assets/clip-2.mp4',
        videoPrompt: 'Close-up of Elena tracing the engraved rings.',
      },
    ],
  }

  it('builds a shot-by-shot ledger pairing beats and segments with timecode ranges', () => {
    const ledger = buildShotContextLedger(sampleScene)
    expect(ledger).toHaveLength(2)
    expect(ledger[0]).toMatchObject({
      shotNumber: 1,
      beatId: 'beat-1',
      segmentId: 'seg-1',
      timecodeRange: '00:00 - 00:04',
      shotType: 'Medium Shot',
      videoClipUrl: 'https://storage.googleapis.com/sceneflow-assets/clip-1.mp4',
      startFrameUrl: 'https://storage.googleapis.com/sceneflow-assets/frame-1.jpg',
    })
    expect(ledger[1]).toMatchObject({
      shotNumber: 2,
      beatId: 'beat-2',
      segmentId: 'seg-2',
      timecodeRange: '00:04 - 00:09',
      kind: 'spoken',
      speaker: 'ELENA',
    })
  })

  it('normalizes raw Gemini JSON into a complete SceneVideoReviewResult with routed recommendations', () => {
    const shots = buildShotContextLedger(sampleScene)
    const rawJson = {
      arScore: 81,
      directorScore: 76,
      overallScore: 79,
      executiveSummary: 'Strong atmospheric opening, but Shot 2 loses prop continuity on the astrolabe.',
      audiencePerspective: {
        arScore: 81,
        summary: 'Compelling mystery tone with clear stakes.',
        emotionalArcAssessment: 'Tension builds effectively.',
        narrativeClarity: 'Clear focus on the astrolabe discovery.',
        pacingAndMomentum: 'Well-paced 9-second sequence.',
      },
      directorPerspective: {
        directorScore: 76,
        summary: 'Shot 1 matches script; Shot 2 exhibits minor hand morphing and missing prop detail.',
        scriptComplianceScore: 85,
        continuityScore: 70,
        technicalExecutionScore: 74,
      },
      anomalies: [
        {
          id: 'anom-1',
          shotNumber: 2,
          beatId: 'beat-2',
          category: 'prop_inconsistency',
          severity: 'major',
          origin: 'both',
          title: 'Brass Astrolabe Missing Engraved Rings',
          description: 'In Shot 2 close-up, the astrolabe morphs into a flat compass.',
          evidence: 'Visible between 00:05 and 00:08.',
        },
      ],
      recommendations: [
        {
          id: 'rec-shot-2',
          title: 'Lock Brass Astrolabe Prop & Stabilize Hand Interaction in Shot 2',
          description: 'Update Shot 2 direction with explicit prop interaction and macro framing.',
          rationale: 'Restores continuity with Shot 1 and prevents hand morphing.',
          priority: 'high',
          estimatedArImpact: 7,
          target: 'shot_director',
          category: 'continuity_fix',
          shotNumber: 2,
          beatId: 'beat-2',
          directorInstruction:
            'Frame a tight Medium Close-Up on Elena tracing the engraved brass rings of the Brass Astrolabe with steady hand placement.',
          shotPatch: {
            shotType: 'Medium Close-Up',
            cameraAngle: 'High Angle',
            cameraMovement: 'Slow Push-In',
            blocking: 'Elena holds her right index finger steadily against the outer brass ring',
            propInteraction: 'Elena traces the engraved rings of the Brass Astrolabe',
            keyProps: ['Brass Astrolabe'],
            castInFrame: ['Elena'],
          },
          negativePromptAdditions: 'morphing fingers, extra digits, flat compass',
          regenerateKeyframeRecommended: true,
        },
        {
          id: 'rec-scene-1',
          title: 'Sharpen Spoken Line Subtext',
          description: 'Refine Elena’s line to specify what the shifting coordinates point toward.',
          rationale: 'Increases narrative hook for the audience.',
          priority: 'medium',
          estimatedArImpact: 4,
          target: 'scene_director',
          category: 'dialogue_polish',
          directorInstruction:
            'Tighten Elena’s dialogue line to heighten urgency about the shifting celestial coordinates.',
          revisionDepth: 'light',
        },
      ],
    }

    const result = normalizeReviewResult(rawJson, {
      sceneId: 'scene-1',
      sceneNumber: 1,
      sceneHeading: 'INT. OBSERVATORY - NIGHT',
      reviewedSource: 'shot_clips',
      reviewedClipCount: 2,
      reviewedKeyframeCount: 1,
      referencePlateCount: 2,
      shots,
      modelId: 'gemini-3.8-flash',
      previousArScore: 74,
    })

    expect(result.arScore).toBe(81)
    expect(result.previousArScore).toBe(74)
    expect(result.directorScore).toBe(76)
    expect(result.shotBreakdown).toHaveLength(2)
    expect(result.shotBreakdown[0].status).toBe('pass')
    expect(result.shotBreakdown[1].status).toBe('warning')
    expect(result.shotBreakdown[1].anomalyIds).toContain('anom-1')
    expect(result.recommendations).toHaveLength(2)
    expect(result.recommendations[0].target).toBe('shot_director')
    expect(result.recommendations[0].beatId).toBe('beat-2')
    expect(result.recommendations[0].segmentId).toBe('seg-2')
    expect(result.recommendations[1].target).toBe('scene_director')
  })
})

describe('Multimodal Scene Video Reviewer — Applying Shot Director Recommendations Updates Prompts', () => {
  it('updates beatDirection, recomposes storyboardImagePrompt (framePrompt), updates segment videoPrompt, and merges negativePromptAdditions', () => {
    const initialScenes = [
      {
        id: 'scene-1',
        sceneNumber: 1,
        heading: 'INT. OBSERVATORY - NIGHT',
        beats: [
          {
            beatId: 'beat-1',
            sequenceIndex: 0,
            kind: 'action' as const,
            text: 'Elena steps up to the brass astrolabe.',
            actionDescription: 'Elena steps up to the brass astrolabe.',
            storyboardImagePrompt: 'Old frame prompt for beat 1',
            beatDirection: {
              shotType: 'Wide Shot',
              cameraAngle: 'Eye-Level',
              cameraMovement: 'Static',
              blocking: 'Elena stands near doorway',
            },
          },
        ],
        segments: [
          {
            segmentId: 'seg-1',
            beatId: 'beat-1',
            sequenceIndex: 0,
            videoPrompt: 'Old video prompt for seg 1',
            negativePrompt: 'blurry',
          },
        ],
      },
    ]

    const shotRec: SceneVideoRecommendation = {
      id: 'rec-1',
      title: 'Switch to Medium Close-Up with Slow Push-In and Prop Lock',
      description: 'Bring camera closer to Elena and lock Brass Astrolabe interaction.',
      rationale: 'Improves emotional connection and prop continuity.',
      priority: 'high',
      estimatedArImpact: 6,
      target: 'shot_director',
      category: 'camera_blocking',
      shotNumber: 1,
      beatId: 'beat-1',
      segmentId: 'seg-1',
      directorInstruction:
        'Use a Medium Close-Up at Low Angle with a Slow Push-In as Elena examines the Brass Astrolabe under warm amber rim light.',
      shotPatch: {
        shotType: 'Medium Close-Up',
        cameraAngle: 'Low Angle',
        cameraMovement: 'Slow Push-In',
        blocking: 'Elena leans over the pedestal examining the Brass Astrolabe',
        lightingAccent: 'Warm amber rim light on brass rings',
        castInFrame: ['Elena'],
        keyProps: ['Brass Astrolabe'],
      },
      negativePromptAdditions: 'morphing hands, extra fingers',
    }

    const res = applyShotDirectorRecommendationsToScenes({
      scenes: initialScenes,
      sceneIdx: 0,
      recommendations: [{ recommendation: shotRec }],
      characters: [{ id: 'char-elena', name: 'Elena', referenceImage: 'https://example.com/elena.png' }],
      locationReferences: [{ id: 'loc-obs' }],
      objectReferences: [{ id: 'obj-astro', name: 'Brass Astrolabe' }],
    })

    expect(res.appliedIds).toEqual(['rec-1'])
    expect(res.updatedBeatIds).toEqual(['beat-1'])

    const updatedScene = res.scenes[0]
    const updatedBeat = getSceneBeats(updatedScene)[0]

    // 1. Verify Shot Direction was updated
    expect(updatedBeat.beatDirection?.shotType).toBe('Medium Close-Up')
    expect(updatedBeat.beatDirection?.cameraAngle).toBe('Low Angle')
    expect(updatedBeat.beatDirection?.cameraMovement).toBe('Slow Push-In')
    expect(updatedBeat.beatDirection?.lightingAccent).toBe('Warm amber rim light on brass rings')
    expect(updatedBeat.beatDirection?.generatedBy).toBe('director')

    // 2. Verify Still Prompt (storyboardImagePrompt / framePrompt) was automatically recomposed
    expect(updatedBeat.storyboardImagePrompt).not.toBe('Old frame prompt for beat 1')
    expect(updatedBeat.storyboardImagePrompt).toContain('Medium Close-Up')
    expect(updatedBeat.storyboardImagePrompt).toContain(
      'Elena leans over the pedestal examining the Brass Astrolabe'
    )

    // 3. Verify Segment Video Prompt and Negative Prompt were updated
    const updatedSegment = updatedScene.segments[0]
    expect(updatedSegment.videoPrompt).not.toBe('Old video prompt for seg 1')
    expect(updatedSegment.videoPrompt).toContain('Slow Push-In')
    expect(updatedSegment.negativePrompt).toBe('blurry, morphing hands, extra fingers')
    expect(res.segmentPromptUpdates).toHaveLength(1)
    expect(res.segmentPromptUpdates[0].negativePrompt).toBe('blurry, morphing hands, extra fingers')
  })

  it('merges AI-refined StillDirectorPatch over baseline recommendation shotPatch cleanly', () => {
    const base = normalizeRecommendationShotPatch({
      shotType: 'Medium Shot',
      blocking: 'Baseline blocking',
    })
    const refined = normalizeRecommendationShotPatch({
      shotType: 'Close-Up',
      lightingAccent: 'Cold moonlight key',
    })
    const merged = mergeShotDirectorPatches(base, refined)
    expect(merged).toEqual({
      shotType: 'Close-Up',
      blocking: 'Baseline blocking',
      lightingAccent: 'Cold moonlight key',
    })
  })

  it('resolves target beat by beatId, segmentId, or 1-based shotNumber', () => {
    const scene = {
      beats: [
        { beatId: 'b-1', sequenceIndex: 0, kind: 'action', text: 'One' },
        { beatId: 'b-2', sequenceIndex: 1, kind: 'action', text: 'Two' },
      ],
    }
    expect(resolveBeatForRecommendation(scene, { beatId: 'b-2' })?.beat.beatId).toBe('b-2')
    expect(
      resolveBeatForRecommendation(
        scene,
        { segmentId: 'seg-2' },
        [{ segmentId: 'seg-2', beatId: 'b-2' }]
      )?.beat.beatId
    ).toBe('b-2')
    expect(resolveBeatForRecommendation(scene, { shotNumber: 1 })?.beat.beatId).toBe('b-1')
  })
})

describe('Multimodal Scene Video Reviewer — Source & UI Wiring', () => {
  it('supports fileData and videoMetadata in Vertex AI VisionPart', () => {
    const geminiSource = readSource('src/lib/vertexai/gemini.ts')
    expect(geminiSource).toContain('fileData?: {')
    expect(geminiSource).toContain('fileUri: string')
    expect(geminiSource).toContain('videoMetadata?: {')
  })

  it('wires SceneVideoReviewerPanel (FlowDirector) into ScriptPanel and BeatDirectorDialog', () => {
    const scriptPanel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(scriptPanel).toContain('SceneVideoReviewerPanel')
    expect(scriptPanel).toContain('value="review"')
    expect(scriptPanel).toContain("'streams',\n      'review'")
    expect(scriptPanel).toContain('FlowDirector')
    expect(scriptPanel).toContain('onOpenDirectShotWithRecommendation')

    const reviewerPanel = readSource(
      'src/components/vision/scene-production/SceneVideoReviewerPanel.tsx'
    )
    expect(reviewerPanel).toContain('FlowDirector · Scene')
    expect(reviewerPanel).toContain('Run FlowDirector')
    expect(reviewerPanel).toContain("from '@/components/ui/Button'")
    expect(reviewerPanel).not.toContain("from '@/components/ui/button'")

    const reviewerLib = readSource('src/lib/intelligence/scene-video-reviewer.ts')
    expect(reviewerLib).toContain("from '@/lib/safeJson'")
    expect(reviewerLib).not.toContain("from '@/lib/utils/safeParseJson'")

    const beatDirectorDialog = readSource('src/components/vision/BeatDirectorDialog.tsx')
    expect(beatDirectorDialog).toContain('initialInstruction')
    expect(beatDirectorDialog).toContain('initialPatch')
  })
})
