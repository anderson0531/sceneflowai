import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  applyShotDirectorRecommendationsToScenes,
  getSceneVideoReviewForLanguage,
  getSceneVideoReviewsMap,
  mergeShotDirectorPatches,
  normalizeRecommendationShotPatch,
  resolveBeatForRecommendation,
  setSceneVideoReviewForLanguage,
  type SceneVideoRecommendation,
  type SceneVideoReviewResult,
} from '@/lib/intelligence/scene-video-reviewer-types'
import {
  buildSceneTextPrompt,
  buildShotContextLedger,
  calibrateSceneReviewScores,
  normalizeReviewResult,
  resolveMediaInclusionForSourceMode,
  selectRenderedStreamForReview,
  toVertexGcsUri,
} from '@/lib/intelligence/scene-video-reviewer'
import { mergeScenePreservingMedia } from '@/lib/storyboard/mergeSceneMedia'
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

  it('separates Stills, Clips, and Scene analysis modes cleanly without conflating Stills and Clips', () => {
    const stillsOnly = resolveMediaInclusionForSourceMode({
      sourceMode: 'stills',
      hasRenderedStream: true,
      hasShotClips: true,
      hasKeyframes: true,
    })
    expect(stillsOnly).toEqual({
      effectiveMode: 'stills',
      includeRenderedMp4: false,
      includeShotClips: false,
      includeKeyframes: true,
    })

    const clipsOnly = resolveMediaInclusionForSourceMode({
      sourceMode: 'shot_clips',
      hasRenderedStream: true,
      hasShotClips: true,
      hasKeyframes: true,
    })
    expect(clipsOnly).toEqual({
      effectiveMode: 'shot_clips',
      includeRenderedMp4: false,
      includeShotClips: true,
      includeKeyframes: false,
    })

    const sceneOnly = resolveMediaInclusionForSourceMode({
      sourceMode: 'rendered_mp4',
      hasRenderedStream: true,
      hasShotClips: true,
      hasKeyframes: true,
    })
    expect(sceneOnly).toEqual({
      effectiveMode: 'rendered_mp4',
      includeRenderedMp4: true,
      includeShotClips: false,
      includeKeyframes: false,
    })
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

  it('prevents a single minor anomaly on 1 of 4 shots from causing a 22-point cliff drop (88 -> 66)', () => {
    const fourShotScene = {
      id: 'scene-4shots',
      sceneNumber: 2,
      heading: 'INT. LAB - NIGHT',
      beats: [
        { beatId: 'b-1', sequenceIndex: 0, kind: 'action' as const, text: 'Shot 1' },
        { beatId: 'b-2', sequenceIndex: 1, kind: 'action' as const, text: 'Shot 2' },
        { beatId: 'b-3', sequenceIndex: 2, kind: 'action' as const, text: 'Shot 3' },
        { beatId: 'b-4', sequenceIndex: 3, kind: 'action' as const, text: 'Shot 4' },
      ],
    }
    const shots = buildShotContextLedger(fourShotScene)
    expect(shots).toHaveLength(4)

    // Simulate LLM over-penalizing the scene from 88 down to 66 for 1 minor anomaly on Shot 1 of 4
    const rawOverPenalized = {
      arScore: 66,
      directorScore: 62,
      overallScore: 64,
      anomalies: [
        {
          id: 'anom-shot-1',
          shotNumber: 1,
          beatId: 'b-1',
          category: 'prop_inconsistency',
          severity: 'minor',
          origin: 'frame',
          title: 'Slight clipboard angle shift in Shot 1',
          description: 'Clipboard is held slightly lower than reference.',
          evidence: 'Shot 1 start frame',
        },
      ],
      recommendations: [
        {
          id: 'rec-1',
          title: 'Adjust clipboard height in Shot 1',
          target: 'shot_director',
          category: 'continuity_fix',
          shotNumber: 1,
          beatId: 'b-1',
          directorInstruction: 'Raise clipboard to chest level in Shot 1.',
        },
      ],
    }

    const result = normalizeReviewResult(rawOverPenalized, {
      sceneId: 'scene-4shots',
      sceneNumber: 2,
      sceneHeading: 'INT. LAB - NIGHT',
      reviewedSource: 'shot_clips',
      reviewedClipCount: 4,
      reviewedKeyframeCount: 4,
      referencePlateCount: 2,
      shots,
      modelId: 'gemini-3.8-flash',
      previousArScore: 88,
    })

    // 1 minor anomaly on 1 of 4 shots should only dip AR score by ~3 points (88 -> 85), never 66!
    expect(result.arScore).toBeGreaterThanOrEqual(84)
    expect(result.arScore).toBeLessThanOrEqual(87)
    // Director score must be more critical than Audience score, but also proportional
    expect(result.directorScore).toBeLessThan(result.arScore)
    expect(result.directorScore).toBeGreaterThanOrEqual(78)
  })

  it('calibrates Director Score to always be more critical than Audience Score (never 91 Director vs 88 Audience)', () => {
    const fourShotScene = {
      id: 'scene-4shots',
      sceneNumber: 2,
      heading: 'INT. LAB - NIGHT',
      beats: [
        { beatId: 'b-1', sequenceIndex: 0, kind: 'action' as const, text: 'Shot 1' },
        { beatId: 'b-2', sequenceIndex: 1, kind: 'action' as const, text: 'Shot 2' },
        { beatId: 'b-3', sequenceIndex: 2, kind: 'action' as const, text: 'Shot 3' },
        { beatId: 'b-4', sequenceIndex: 3, kind: 'action' as const, text: 'Shot 4' },
      ],
    }
    const shots = buildShotContextLedger(fourShotScene)

    // Simulate LLM returning arScore: 88 and directorScore: 91 after applying the fix
    const rawInverted = {
      arScore: 88,
      directorScore: 91,
      overallScore: 90,
      directorPerspective: {
        directorScore: 91,
        scriptComplianceScore: 92,
        continuityScore: 91,
        technicalExecutionScore: 90,
      },
      anomalies: [],
      recommendations: [],
    }

    const result = normalizeReviewResult(rawInverted, {
      sceneId: 'scene-4shots',
      sceneNumber: 2,
      sceneHeading: 'INT. LAB - NIGHT',
      reviewedSource: 'shot_clips',
      reviewedClipCount: 4,
      reviewedKeyframeCount: 4,
      referencePlateCount: 2,
      shots,
      modelId: 'gemini-3.8-flash',
      previousArScore: 85,
    })

    expect(result.arScore).toBe(88)
    expect(result.directorScore).toBeLessThan(result.arScore)
    expect(result.directorScore).toBe(86)
    expect(result.directorPerspective.directorScore).toBe(result.directorScore)
    expect(result.directorPerspective.scriptComplianceScore).toBeLessThanOrEqual(result.arScore)

    // Also verify direct calibrateSceneReviewScores helper
    const directCalibrated = calibrateSceneReviewScores({
      rawArScore: 88,
      rawDirectorScore: 91,
      totalShots: 4,
      shotBreakdown: result.shotBreakdown,
      anomalies: [],
      recommendationsCount: 1,
    })
    expect(directCalibrated.arScore).toBe(88)
    expect(directCalibrated.directorScore).toBe(85)
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

  it('wires SceneVideoReviewerPanel (FlowDirector) into ScriptPanel right after Clips and before Mixer', () => {
    const scriptPanel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(scriptPanel).toContain('SceneVideoReviewerPanel')
    expect(scriptPanel).toContain('value="review"')
    expect(scriptPanel).toContain("'video',\n      'review',\n      'mixer',\n      'streams'")
    expect(scriptPanel).toContain('FlowDirector')
    expect(scriptPanel).toContain('onOpenDirectShotWithRecommendation')

    const videoTriggerIdx = scriptPanel.indexOf('<TabsTrigger value="video"')
    const reviewTriggerIdx = scriptPanel.indexOf('<TabsTrigger value="review"')
    const mixerTriggerIdx = scriptPanel.indexOf('<TabsTrigger value="mixer"')
    expect(videoTriggerIdx).toBeGreaterThan(0)
    expect(reviewTriggerIdx).toBeGreaterThan(videoTriggerIdx)
    expect(mixerTriggerIdx).toBeGreaterThan(reviewTriggerIdx)

    const reviewerPanel = readSource(
      'src/components/vision/scene-production/SceneVideoReviewerPanel.tsx'
    )
    expect(reviewerPanel).toContain('FlowDirector · Scene')
    expect(reviewerPanel).toContain('Run FlowDirector')
    expect(reviewerPanel).toContain("from '@/components/ui/Button'")
    expect(reviewerPanel).not.toContain("from '@/components/ui/button'")
    expect(reviewerPanel).toContain('toast.loading(')
    expect(reviewerPanel).toContain('Applying Shot Director fix')
    expect(reviewerPanel).toContain('Updating Shot Direction &amp; Prompts...')
    expect(reviewerPanel).toContain("from '@/components/ui/tooltip'")
    expect(reviewerPanel).toContain('<TooltipProvider delayDuration={200}>')
    expect(reviewerPanel).toContain('title={shot.scriptComplianceNote}')
    expect(reviewerPanel).toContain("handleSelectSourceMode('stills')")
    expect(reviewerPanel).toContain("handleSelectSourceMode('shot_clips')")
    expect(reviewerPanel).toContain("handleSelectSourceMode('rendered_mp4')")
    expect(reviewerPanel).toContain("setMonitorMode('stills')")
    expect(reviewerPanel).toContain("setMonitorMode('clips')")
    expect(reviewerPanel).toContain("setMonitorMode('scene')")

    const reviewerLib = readSource('src/lib/intelligence/scene-video-reviewer.ts')
    expect(reviewerLib).toContain("from '@/lib/safeJson'")
    expect(reviewerLib).not.toContain("from '@/lib/utils/safeParseJson'")

    const beatDirectorDialog = readSource('src/components/vision/BeatDirectorDialog.tsx')
    expect(beatDirectorDialog).toContain('initialInstruction')
    expect(beatDirectorDialog).toContain('initialPatch')
  })
})

describe('Multimodal Scene Video Reviewer — Language-Distinctive Analysis & Saved Scores', () => {
  it('resolves localized clips, localized prompts, and translated dialogue lines per language in buildShotContextLedger', () => {
    const multilingualScene = {
      id: 'scene-multi-1',
      sceneNumber: 1,
      heading: 'INT. BUNKER - NIGHT',
      dialogue: [
        {
          character: 'GIDEON CROFT',
          line: '[fragile, weeping] She knew I would run... She knew I would invent a thousand mathematical excuses just to stay alive down in the dark.',
        },
      ],
      beats: [
        {
          beatId: 'beat-1',
          sequenceIndex: 0,
          kind: 'dialogue' as const,
          character: 'GIDEON CROFT',
          line: '[fragile, weeping] She knew I would run... She knew I would invent a thousand mathematical excuses just to stay alive down in the dark.',
          text: 'GIDEON CROFT: [fragile, weeping] She knew I would run...',
          estimatedDuration: 10,
        },
        {
          beatId: 'beat-2',
          sequenceIndex: 1,
          kind: 'action' as const,
          text: 'Gideon stares at the flickering monitor.',
          estimatedDuration: 4,
        },
      ],
      segments: [
        {
          segmentId: 'seg-1',
          beatId: 'beat-1',
          sequenceIndex: 0,
          startTime: 0,
          endTime: 10,
          status: 'COMPLETE',
          assetType: 'video' as const,
          activeAssetUrl: 'https://storage.googleapis.com/sceneflow-assets/clip-1-en.mp4',
          videoPrompt: 'English master prompt for shot 1',
          dialogueLines: [
            {
              character: 'GIDEON CROFT',
              line: '[fragile, weeping] She knew I would run... She knew I would invent a thousand mathematical excuses just to stay alive down in the dark.',
            },
          ],
          languageVersions: {
            es: {
              currentTakeId: 'take-es-1',
              takes: [
                {
                  id: 'take-es-1',
                  assetUrl: 'https://storage.googleapis.com/sceneflow-assets/clip-1-es.mp4',
                  prompt: 'Spanish localized prompt for shot 1 with Spanish dialogue',
                  createdAt: '2026-04-19T12:00:00.000Z',
                },
              ],
            },
          },
        },
        {
          segmentId: 'seg-2',
          beatId: 'beat-2',
          sequenceIndex: 1,
          startTime: 10,
          endTime: 14,
          status: 'COMPLETE',
          assetType: 'video' as const,
          activeAssetUrl: 'https://storage.googleapis.com/sceneflow-assets/clip-2-en.mp4',
          videoPrompt: 'English master prompt for shot 2',
        },
      ],
    }

    const enLedger = buildShotContextLedger(multilingualScene, undefined, { language: 'en' })
    expect(enLedger[0].videoClipUrl).toBe(
      'https://storage.googleapis.com/sceneflow-assets/clip-1-en.mp4'
    )
    expect(enLedger[0].usingMasterClipFallback).toBe(false)
    expect(enLedger[0].localizedScriptText).toBeUndefined()

    const esLedger = buildShotContextLedger(multilingualScene, undefined, {
      language: 'es',
      sceneTranslation: {
        dialogue: [
          '[fragile, weeping] Ella sabía que yo huiría... que inventaría mil cálculos solo para sobrevivir en la oscuridad.',
        ],
      },
    })
    // Shot 1 has a dedicated Spanish clip in segment.languageVersions.es
    expect(esLedger[0].videoClipUrl).toBe(
      'https://storage.googleapis.com/sceneflow-assets/clip-1-es.mp4'
    )
    expect(esLedger[0].usingMasterClipFallback).toBe(false)
    expect(esLedger[0].videoPrompt).toBe(
      'Spanish localized prompt for shot 1 with Spanish dialogue'
    )
    expect(esLedger[0].localizedScriptText).toContain(
      'Ella sabía que yo huiría... que inventaría mil cálculos solo para sobrevivir en la oscuridad.'
    )
    // Shot 2 has no dedicated Spanish clip, so it falls back to master clip and flags usingMasterClipFallback
    expect(esLedger[1].videoClipUrl).toBe(
      'https://storage.googleapis.com/sceneflow-assets/clip-2-en.mp4'
    )
    expect(esLedger[1].usingMasterClipFallback).toBe(true)

    // Verify prompt includes Spanish localization criteria and translated dialogue
    const esPrompt = buildSceneTextPrompt({
      scene: multilingualScene,
      sceneNumber: 1,
      sceneHeading: 'INT. BUNKER - NIGHT',
      reviewedSource: 'shot_clips',
      shots: esLedger,
      references: {},
      language: 'es',
      sceneTranslation: {
        dialogue: [
          '[fragile, weeping] Ella sabía que yo huiría... que inventaría mil cálculos solo para sobrevivir en la oscuridad.',
        ],
      },
    })
    expect(esPrompt).toContain('Target Review Language: Spanish (ES)')
    expect(esPrompt).toContain('TARGET LANGUAGE VERSION EVALUATION: SPANISH (ES)')
    expect(esPrompt).toContain(
      'Ella sabía que yo huiría... que inventaría mil cálculos solo para sobrevivir en la oscuridad.'
    )
    expect(esPrompt).toContain('clipLanguageSource="LOCALIZED_ES"')
    expect(esPrompt).toContain('clipLanguageSource="SHARED_MASTER_ACTION_CLIP"')
  })

  it('selects rendered streams matching the requested language and avoids cross-language stream fallback', () => {
    const streams = [
      {
        id: 'stream-en',
        language: 'en',
        streamType: 'video',
        status: 'complete',
        mp4Url: 'https://storage.googleapis.com/sceneflow-assets/scene-en.mp4',
      },
      {
        id: 'stream-es',
        language: 'es',
        streamType: 'video',
        status: 'complete',
        mp4Url: 'https://storage.googleapis.com/sceneflow-assets/scene-es.mp4',
      },
    ]

    const chosenEs = selectRenderedStreamForReview(
      streams,
      'https://storage.googleapis.com/sceneflow-assets/legacy-en.mp4',
      undefined,
      'es'
    )
    expect(chosenEs?.streamId).toBe('stream-es')
    expect(chosenEs?.url).toContain('scene-es.mp4')
    expect(chosenEs?.language).toBe('es')

    // Requesting French ('fr') when only EN and ES streams exist should return null, NOT the English stream
    const chosenFr = selectRenderedStreamForReview(
      streams,
      'https://storage.googleapis.com/sceneflow-assets/legacy-en.mp4',
      undefined,
      'fr'
    )
    expect(chosenFr).toBeNull()
  })

  it('persists and merges distinct FlowDirector reviews and scores per language without overwriting other languages', () => {
    const enReview = {
      sceneId: 'scene-1',
      sceneNumber: 1,
      generatedAt: '2026-04-19T10:00:00.000Z',
      modelId: 'gemini-2.5-flash',
      reviewedSource: 'shot_clips',
      reviewedLanguage: 'en',
      reviewedLanguageLabel: 'English',
      arScore: 91,
      directorScore: 87,
      overallScore: 89,
    } as SceneVideoReviewResult

    const esReview = {
      sceneId: 'scene-1',
      sceneNumber: 1,
      generatedAt: '2026-04-19T10:05:00.000Z',
      modelId: 'gemini-2.5-flash',
      reviewedSource: 'shot_clips',
      reviewedLanguage: 'es',
      reviewedLanguageLabel: 'Spanish',
      arScore: 83,
      directorScore: 78,
      overallScore: 81,
    } as SceneVideoReviewResult

    let scene: Record<string, unknown> = { id: 'scene-1', sceneNumber: 1 }
    scene = setSceneVideoReviewForLanguage(scene, 'en', enReview)
    scene = setSceneVideoReviewForLanguage(scene, 'es', esReview)

    expect(getSceneVideoReviewForLanguage(scene, 'en')?.arScore).toBe(91)
    expect(getSceneVideoReviewForLanguage(scene, 'es')?.arScore).toBe(83)
    expect(getSceneVideoReviewForLanguage(scene, 'fr')).toBeNull()

    const map = getSceneVideoReviewsMap(scene)
    expect(Object.keys(map).sort()).toEqual(['en', 'es'])

    // Verify mergeScenePreservingMedia preserves both language reviews across concurrent saves
    const merged = mergeScenePreservingMedia(
      {
        id: 'scene-1',
        videoReviewsByLanguage: { en: enReview },
      } as any,
      {
        id: 'scene-1',
        videoReviewsByLanguage: { es: esReview },
      } as any
    ) as unknown as Record<string, unknown>

    expect(getSceneVideoReviewForLanguage(merged, 'en')?.arScore).toBe(91)
    expect(getSceneVideoReviewForLanguage(merged, 'es')?.arScore).toBe(83)
  })
})
