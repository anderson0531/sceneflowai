import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/vertexai/gemini', () => ({
  generateWithVision: vi.fn(),
  generateText: vi.fn(),
}))

import { generateWithVision } from '@/lib/vertexai/gemini'
import {
  applyEditorialJLCuts,
  buildSceneRoomToneBed,
  computeNarrativeClipTrim,
} from '@/lib/scene/longformEditorialStitcher'
import {
  buildSceneStateLedger,
  compileSceneStateContinuityClause,
  resolvePrecedingShotContinuityAnchor,
} from '@/lib/scene/sceneStateLedger'
import { compileBeatVideoPrompt } from '@/lib/scene/beatVideoPromptCompiler'
import {
  evaluatePostVideoClipGate,
  evaluatePreVideoKeyframeGate,
  parsePreVideoKeyframeGateResponse,
} from '@/lib/intelligence/autonomousCriticAgent'
import {
  computeSceneRenderSourceHash,
  planHierarchicalEpisodeRender,
} from '@/lib/video/hierarchicalEpisodeRenderer'
import {
  buildFcpxmlDocument,
  toFcpxmlRationalTime,
} from '@/lib/export/fcpxmlExport'
import { computeEpisodeProductionTelemetry } from '@/lib/production/episodeTelemetryHud'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('1. Long-Form Editorial Stitcher (Dynamic Cut Trimming, J/L-Cuts & Room Tone)', () => {
  it('trims dead tail off a 10s raw clip when spoken dialogue is 5.2s', () => {
    const res = computeNarrativeClipTrim({
      rawDurationSec: 10,
      spokenDurationSec: 5.2,
    })
    expect(res.wasAutoTrimmed).toBe(true)
    expect(res.trimReason).toBe('dialogue_paced')
    // 5.2s speech + 0.25s lead-in + 0.65s reaction = 6.1s
    expect(res.effectiveDurationSec).toBeCloseTo(6.1, 2)
    expect(res.trimInSec).toBe(0)
    expect(res.trimOutSec).toBeCloseTo(6.1, 2)
  })

  it('preserves full 10s clip when it feeds an EXT continuation part', () => {
    const res = computeNarrativeClipTrim({
      rawDurationSec: 10,
      spokenDurationSec: 5.0,
      continuesIntoNextPart: true,
    })
    expect(res.wasAutoTrimmed).toBe(false)
    expect(res.trimReason).toBe('ext_chain_locked')
    expect(res.effectiveDurationSec).toBe(10)
  })

  it('applies J-cut pre-roll when incoming dialogue starts at a visual cut with headroom', () => {
    const segments = [
      { segmentId: 'seg-1', sequenceIndex: 0, startTime: 0, duration: 6 },
      { segmentId: 'seg-2', sequenceIndex: 1, startTime: 6, duration: 6 },
    ]
    const audioClips = [
      {
        id: 'd1',
        url: 'https://cdn.example.com/d1.mp3',
        type: 'dialogue' as const,
        startTime: 0.2,
        duration: 4.5,
        volume: 1,
        segmentId: 'seg-1',
      },
      {
        id: 'd2',
        url: 'https://cdn.example.com/d2.mp3',
        type: 'dialogue' as const,
        startTime: 6.0,
        duration: 4.0,
        volume: 1,
        segmentId: 'seg-2',
      },
    ]

    const edited = applyEditorialJLCuts(segments, audioClips, { jCutPreRollSec: 0.25 })
    expect(edited[1].editorialCutType).toBe('j_cut')
    expect(edited[1].startTime).toBeCloseTo(5.75, 2)
    expect(edited[1].editorialOffsetSec).toBeCloseTo(-0.25, 2)
  })

  it('builds a continuous low-floor scene room-tone bed', () => {
    const bed = buildSceneRoomToneBed({
      sceneId: 'scene-4',
      sceneDurationSec: 94.5,
      roomToneUrl: 'https://cdn.example.com/room-tone.mp3',
    })
    expect(bed).not.toBeNull()
    expect(bed?.duration).toBe(94.5)
    expect(bed?.volume).toBeCloseTo(0.08, 2)
  })
})

describe('2. Scene State Ledger & Preceding-Shot Continuity Anchor', () => {
  const beats: SceneBeat[] = [
    {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      character: 'ELENA',
      actionDescription: 'Elena puts on her dark trenchcoat as the overhead lights turn red.',
      beatDirection: {
        shotType: 'Medium Shot',
        cameraAngle: 'Eye-level',
        lightingAccent: 'Crimson emergency glow',
        spatialRelationship: 'Elena on camera-left facing console on camera-right',
        castInFrame: ['ELENA'],
        keyProps: ['Encrypted Drive'],
      },
    },
    {
      beatId: 'b2',
      sequenceIndex: 1,
      kind: 'dialogue',
      character: 'ELENA',
      line: 'The containment seal is failing.',
      beatDirection: {
        shotType: 'Close-Up',
        cameraAngle: 'Low angle',
        castInFrame: ['ELENA'],
      },
    },
  ]

  it('accumulates wardrobe, lighting, axis, and environment mutations across beats', () => {
    const ledger = buildSceneStateLedger(beats, {
      visualFrameByBeatId: {
        b1: { lastFrameUrl: 'https://cdn.example.com/b1-last.png' },
      },
    })

    expect(ledger).toHaveLength(2)
    const stateAtBeat2 = ledger[1]
    expect(stateAtBeat2.activeLighting).toBe('Crimson emergency glow')
    expect(stateAtBeat2.wardrobeByCharacter.ELENA).toContain('puts on her dark trenchcoat')
    expect(stateAtBeat2.environmentNotes[0]).toContain('lights turn red')
    expect(stateAtBeat2.precedingVisualAnchorUrl).toBe('https://cdn.example.com/b1-last.png')

    const clause = compileSceneStateContinuityClause(stateAtBeat2)
    expect(clause).toContain('Shot continuity from preceding Medium Shot')
    expect(clause).toContain('Maintain 180-degree axis')
    expect(clause).toContain('Crimson emergency glow')
    expect(clause).toContain('puts on her dark trenchcoat')

    const anchor = resolvePrecedingShotContinuityAnchor(beats[1], stateAtBeat2)
    expect(anchor?.anchorImageUrl).toBe('https://cdn.example.com/b1-last.png')
    expect(anchor?.promptContinuityDirective).toContain('Close-Up (Low angle)')

    const compiled = compileBeatVideoPrompt(beats[1], {
      previousBeat: beats[0],
      sceneState: stateAtBeat2,
    })
    expect(compiled.prompt).toContain('Crimson emergency glow')
    expect(compiled.prompt).toContain('puts on her dark trenchcoat')
  })
})

describe('3. Autonomous Two-Stage Critic Agent (Pre-Video & Post-Video Gates)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Stage 1 Pre-Video Keyframe Gate catches gibberish text and routes to inpaint_frame', async () => {
    vi.mocked(generateWithVision).mockResolvedValueOnce({
      text: JSON.stringify({
        score: 62,
        defectCategory: 'gibberish_text',
        recommendedAction: 'inpaint_frame',
        issues: ['Garbled signage letters above doorway'],
        frameEditInstruction: 'Remove the garbled letters on the wall plaque above the door.',
      }),
    })

    const res = await evaluatePreVideoKeyframeGate({
      beatId: 'beat-7',
      stillPrompt: 'Medium shot of Marcus at the bulkhead door.',
      generatedFrame: { base64: 'AAA' },
      estimatedVideoClipCostUsd: 1.5,
    })

    expect(res.passed).toBe(false)
    expect(res.defectCategory).toBe('gibberish_text')
    expect(res.recommendedAction).toBe('inpaint_frame')
    expect(res.frameEditInstruction).toContain('Remove the garbled letters')
    expect(res.estimatedVideoCreditSavedUsd).toBe(1.5)
  })

  it('Stage 2 Post-Video 3-Frame Gate synthesizes an executable RetakePlan when morphing occurs', async () => {
    vi.mocked(generateWithVision).mockResolvedValueOnce({
      text: JSON.stringify({
        temporalScore: 54,
        motionStability: 'morphing',
        issues: ['Right hand morphs into console at t=5s'],
        anomalyOrigin: 'motion',
        revisedPrompt: 'Marcus stands steady beside the console with hands at his sides.',
        negativePromptAdditions: 'hand morphing, melting fingers',
        frameEditRecommended: false,
        changesSummary: [
          {
            category: 'Motion',
            change: 'Stabilized hand placement',
            rationale: 'Prevent mid-clip hand morphing',
          },
        ],
        retakeSummary: 'Stabilize hand blocking and add negative morphing terms.',
      }),
    })

    const res = await evaluatePostVideoClipGate({
      segmentId: 'seg-12',
      videoPrompt: 'Marcus reaches across the console.',
      negativePrompt: 'blurry, watermark',
      sampledFrames: {
        startFrame: { base64: 'F1' },
        midFrame: { base64: 'F2' },
        endFrame: { base64: 'F3' },
      },
    })

    expect(res.passed).toBe(false)
    expect(res.motionStability).toBe('morphing')
    expect(res.autoRetakePlan).not.toBeNull()
    expect(res.autoRetakePlan?.anomalyOrigin).toBe('motion')
    expect(res.mergedNegativePrompt).toContain('hand morphing')
  })

  it('parsePreVideoKeyframeGateResponse passes high-scoring clean frames', () => {
    const res = parsePreVideoKeyframeGateResponse(
      JSON.stringify({
        score: 92,
        defectCategory: 'none',
        recommendedAction: 'pass',
        issues: [],
      }),
      { beatId: 'b1', stillPrompt: 'Clean frame' }
    )
    expect(res.passed).toBe(true)
    expect(res.estimatedVideoCreditSavedUsd).toBe(0)
  })
})

describe('4. Hierarchical Episode Renderer (Scene Sub-Masters -> Episode Stream-Copy Master)', () => {
  it('reuses cached Scene Sub-Masters and only marks changed scenes as needs_render', () => {
    const scene1 = {
      sceneId: 'sc-1',
      sceneNumber: 1,
      segments: [
        {
          segmentId: 's1',
          videoUrl: 'https://storage.googleapis.com/b/clip1.mp4',
          startTime: 0,
          duration: 8,
        },
      ],
      audioClips: [],
    }
    const scene2 = {
      sceneId: 'sc-2',
      sceneNumber: 2,
      segments: [
        {
          segmentId: 's2',
          videoUrl: 'https://storage.googleapis.com/b/clip2.mp4',
          startTime: 0,
          duration: 10,
        },
      ],
      audioClips: [],
    }

    const sc1Hash = computeSceneRenderSourceHash(scene1, {
      resolution: '1080p',
      fps: 24,
      aspectRatio: '16:9',
      language: 'en',
    })

    const plan = planHierarchicalEpisodeRender({
      projectId: 'proj-ep1',
      episodeTitle: 'Episode 1: Deep Horizon',
      language: 'en',
      resolution: '1080p',
      scenes: [scene1, scene2],
      cachedSubMasters: {
        'sc-1': {
          sceneId: 'sc-1',
          sourceHash: sc1Hash,
          gcsUrl: `gs://sceneflow-render-jobs/scene-masters/proj-ep1/sc-1-${sc1Hash}.mp4`,
          durationSec: 8,
        },
      },
    })

    expect(plan.totalScenes).toBe(2)
    expect(plan.cacheHitCount).toBe(1)
    expect(plan.dirtySceneCount).toBe(1)
    expect(plan.dirtyScenePlans[0].sceneId).toBe('sc-2')
    expect(plan.estimatedEpisodeDurationSec).toBe(18)
    expect(plan.episodeMasterJobSpec.segments).toHaveLength(2)
    expect(plan.episodeMasterJobSpec.segments[0].videoUrl).toContain(`sc-1-${sc1Hash}.mp4`)
  })
})

describe('5. FCPXML v1.10 Timeline Exporter (DaVinci Resolve / Final Cut Pro / Premiere)', () => {
  it('generates valid FCPXML v1.10 with non-destructive trims, alternate takes, and 4 audio stem lanes', () => {
    expect(toFcpxmlRationalTime(6.5, 24)).toBe('156/24s')

    const xml = buildFcpxmlDocument({
      projectTitle: 'Episode 01 Master',
      resolution: '1080p',
      fps: 24,
      videoClips: [
        {
          segmentId: 'seg-1',
          name: 'Shot_001',
          assetUrl: 'https://storage.googleapis.com/b/shot1-take1.mp4',
          sourceDurationSec: 10,
          trimInSec: 0.5,
          timelineDurationSec: 6.5,
          alternateTakeUrls: ['https://storage.googleapis.com/b/shot1-take2.mp4'],
          shotNote: 'Match-on-action cut',
        },
      ],
      audioClips: [
        {
          id: 'a-dlg',
          name: 'Elena Line 1',
          url: 'https://storage.googleapis.com/b/dlg1.mp3',
          type: 'dialogue',
          startTimeSec: 0.25,
          durationSec: 5.0,
          volume: 1.0,
        },
        {
          id: 'a-score',
          name: 'Tension Cue',
          url: 'https://storage.googleapis.com/b/score1.mp3',
          type: 'music',
          startTimeSec: 0,
          durationSec: 6.5,
          volume: 0.5,
        },
      ],
    })

    expect(xml).toContain('<!DOCTYPE fcpxml>')
    expect(xml).toContain('<fcpxml version="1.10">')
    expect(xml).toContain('FFVideoFormat1080p24')
    expect(xml).toContain('start="12/24s" duration="156/24s"')
    expect(xml).toContain('lane="1"')
    expect(xml).toContain('enabled="0"')
    expect(xml).toContain('role="dialogue"')
    expect(xml).toContain('role="music"')
    expect(xml).toContain('<adjust-volume amount="-6.0dB"/>')
  })
})

describe('6. Investor Production Telemetry HUD Calculator', () => {
  it('computes active cut telemetry and 45-minute episode unit economics', () => {
    const telemetry = computeEpisodeProductionTelemetry(
      [
        {
          segmentId: 'seg-1',
          beatId: 'beat-alpha-01',
          assetType: 'video',
          generationMethod: 'REF',
          sourceDurationSec: 10,
          editedDurationSec: 6.4,
          isTrimmed: true,
          referenceCount: 3,
          shotJoin: 'cut',
        },
        {
          segmentId: 'seg-2',
          beatId: 'beat-alpha-02',
          assetType: 'video',
          generationMethod: 'EXT',
          sourceDurationSec: 10,
          editedDurationSec: 8.0,
          hasVeoChainRef: true,
          shotJoin: 'dissolve',
        },
      ],
      0
    )

    expect(telemetry.activeCut?.methodBadge).toBe('REF')
    expect(telemetry.activeCut?.isPacedTrim).toBe(true)
    expect(telemetry.activeCut?.continuitySourceLabel).toContain('3 Locked Reference Plate(s)')
    expect(telemetry.rollup.continuityCoveragePct).toBe(100)
    expect(telemetry.rollup.projected45MinPreVisUsd).toBeGreaterThan(15)
    expect(telemetry.rollup.projected45MinPreVisUsd).toBeLessThan(40)
    expect(telemetry.rollup.projected45MinMotionUsd).toBeGreaterThan(350)
  })
})
