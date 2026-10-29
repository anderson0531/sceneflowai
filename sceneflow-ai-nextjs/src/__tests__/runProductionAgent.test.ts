import { describe, it, expect, vi } from 'vitest'
import {
  groupScenesIntoChapters,
  summarizeProductionScenes,
  estimateProductionAgentRun,
  isPolicyViolationError,
  shouldEmitProductionNotification,
  normalizeProductionStages,
  runProductionAgent,
  type ProductionBuilderOptions,
  type ProductionAgentDeps,
  type ProductionAgentShotDescriptor,
} from '@/lib/production/runProductionAgent'

const MOCK_SCENES = [
  {
    id: 'scene-1',
    heading: 'INT. ANCIENT TEMPLE - NIGHT',
    act: 1,
    visualDescription: 'A torchlit chamber with carved monoliths.',
    dialogue: [{ character: 'ELENA', text: 'Look at the inscription.' }],
    beats: [
      { beatId: 'b-1a', storyboardImageUrl: 'https://example.com/s1a-start.jpg' },
      { beatId: 'b-1b', storyboardImageUrl: 'https://example.com/s1b-start.jpg' },
      { beatId: 'b-1c', storyboardImageUrl: 'https://example.com/s1c-start.jpg' },
    ],
    productionData: {
      segments: [
        {
          segmentId: 'seg-1a',
          beatId: 'b-1a',
          sequenceIndex: 0,
          duration: 5,
          references: { startFrameUrl: 'https://example.com/s1a-start.jpg', endFrameUrl: 'https://example.com/s1a-end.jpg' },
        },
        {
          segmentId: 'seg-1b',
          beatId: 'b-1b',
          sequenceIndex: 1,
          duration: 5,
          references: { startFrameUrl: 'https://example.com/s1b-start.jpg', endFrameUrl: 'https://example.com/s1b-end.jpg' },
        },
        {
          segmentId: 'seg-1c',
          beatId: 'b-1c',
          sequenceIndex: 2,
          duration: 5,
          references: { startFrameUrl: 'https://example.com/s1c-start.jpg', endFrameUrl: 'https://example.com/s1c-end.jpg' },
        },
      ],
    },
  },
  {
    id: 'scene-2',
    heading: 'EXT. DESERT RIDGE - DAWN',
    act: 2,
    visualDescription: 'Wind sweeps across the canyon.',
    narrationAudioUrl: 'https://example.com/s2-narration.mp3',
    beats: [{ beatId: 'b-2a', storyboardImageUrl: 'https://example.com/s2a-start.jpg' }],
    productionData: {
      segments: [
        {
          segmentId: 'seg-2a',
          beatId: 'b-2a',
          sequenceIndex: 0,
          duration: 5,
          activeAssetUrl: 'https://example.com/s2a.mp4',
          references: { startFrameUrl: 'https://example.com/s2a-start.jpg', endFrameUrl: 'https://example.com/s2a-end.jpg' },
        },
      ],
    },
  },
]

describe('runProductionAgent — Autonomous Walk-Away Production Engine', () => {
  it('groups scenes into explicit acts or automatic chapter chunks', () => {
    const explicitChapters = groupScenesIntoChapters(MOCK_SCENES)
    expect(explicitChapters).toHaveLength(2)
    expect(explicitChapters[0].label).toContain('Act 1')
    expect(explicitChapters[0].sceneIndices).toEqual([0])
    expect(explicitChapters[1].label).toContain('Act 2')
    expect(explicitChapters[1].sceneIndices).toEqual([1])

    const untaggedScenes = Array.from({ length: 8 }, (_, idx) => ({
      id: `s-${idx + 1}`,
      heading: `SCENE ${idx + 1}`,
    }))
    const chunkedChapters = groupScenesIntoChapters(untaggedScenes)
    expect(chunkedChapters).toHaveLength(2)
    expect(chunkedChapters[0].sceneIndices).toEqual([0, 1, 2, 3])
    expect(chunkedChapters[1].sceneIndices).toEqual([4, 5, 6, 7])
  })

  it('normalizes production stages in canonical pipeline order', () => {
    expect(normalizeProductionStages(['master', 'previs', 'clips', 'previs'])).toEqual([
      'previs',
      'clips',
      'master',
    ])
  })

  it('detects Google content policy / safety errors accurately', () => {
    expect(
      isPolicyViolationError('Video generation blocked by Google safety policy (RAI sensitive content)')
    ).toBe(true)
    expect(isPolicyViolationError(new Error('PROHIBITED_CONTENT: violence filter triggered'))).toBe(
      true
    )
    expect(isPolicyViolationError('Network timeout after 30000ms')).toBe(false)
  })

  it('filters notification events according to user notification frequency', () => {
    expect(shouldEmitProductionNotification('every_scene', 'scene_completed')).toBe(true)
    expect(shouldEmitProductionNotification('phase_milestones', 'scene_completed')).toBe(false)
    expect(shouldEmitProductionNotification('phase_milestones', 'stage_completed')).toBe(true)
    expect(shouldEmitProductionNotification('checkpoints_and_completion', 'stage_completed')).toBe(
      false
    )
    expect(
      shouldEmitProductionNotification('checkpoints_and_completion', 'checkpoint_reached')
    ).toBe(true)
    expect(shouldEmitProductionNotification('checkpoints_and_completion', 'policy_escalated')).toBe(
      true
    )
    expect(shouldEmitProductionNotification('completion_only', 'checkpoint_reached')).toBe(true)
    expect(shouldEmitProductionNotification('completion_only', 'run_completed')).toBe(true)
  })

  it('summarizes scene readiness and estimates credits + hours saved', () => {
    const summaries = summarizeProductionScenes(MOCK_SCENES)
    expect(summaries).toHaveLength(2)
    expect(summaries[0].completedClipsCount).toBe(0)
    expect(summaries[0].totalClipsCount).toBe(3)
    expect(summaries[1].completedClipsCount).toBe(1)

    const estimate = estimateProductionAgentRun(summaries, {
      scopeMode: 'all',
      selectedSceneIndices: [0, 1],
      stages: ['previs', 'clips', 'scenes', 'master', 'promo'],
      quality: 'final',
      language: 'en',
      missingOnly: true,
      optimizeShotDirection: true,
      autoRerunFailedShots: true,
      creativeClipPolicyFallback: true,
      checkpointMode: 'previs_checkpoint',
      notificationFrequency: 'checkpoints_and_completion',
      mintScreeningLink: true,
    })
    expect(estimate.sceneCount).toBe(2)
    expect(estimate.clipsToGenerate).toBe(3)
    expect(estimate.credits.total).toBeGreaterThan(100)
    expect(estimate.estimatedDirectorHoursSaved).toBeGreaterThanOrEqual(0.5)
  })

  it('executes the 3-step self-healing policy ladder (Standard -> Optimize Shot Direction -> Creative Clips)', async () => {
    let seg1bAttempts = 0
    let seg1cStandardAttempts = 0

    const mockShots: ProductionAgentShotDescriptor[] = [
      {
        segmentId: 'seg-1a',
        beatId: 'b-1a',
        sequenceIndex: 0,
        label: 'Shot 1',
        durationSec: 5,
        hasClip: false,
        hasStartFrame: true,
        hasEndFrame: true,
        startFrameUrl: 'https://example.com/s1a-start.jpg',
        endFrameUrl: 'https://example.com/s1a-end.jpg',
      },
      {
        segmentId: 'seg-1b',
        beatId: 'b-1b',
        sequenceIndex: 1,
        label: 'Shot 2 (recovers after policy direction optimization)',
        durationSec: 5,
        hasClip: false,
        hasStartFrame: true,
        hasEndFrame: true,
        startFrameUrl: 'https://example.com/s1b-start.jpg',
        endFrameUrl: 'https://example.com/s1b-end.jpg',
      },
      {
        segmentId: 'seg-1c',
        beatId: 'b-1c',
        sequenceIndex: 2,
        label: 'Shot 3 (escalates to Creative Clips after policy rewrite still blocks)',
        durationSec: 5,
        hasClip: false,
        hasStartFrame: true,
        hasEndFrame: true,
        startFrameUrl: 'https://example.com/s1c-start.jpg',
        endFrameUrl: 'https://example.com/s1c-end.jpg',
      },
    ]

    const generateSegmentClip = vi.fn(async (input) => {
      if (input.segmentId === 'seg-1a') {
        return
      }
      if (input.segmentId === 'seg-1b') {
        seg1bAttempts += 1
        if (seg1bAttempts === 1) {
          throw new Error('Request blocked by Google content safety policy (RAI filter)')
        }
        return
      }
      if (input.segmentId === 'seg-1c') {
        if (input.mode === 'standard') {
          seg1cStandardAttempts += 1
          throw new Error('PROHIBITED_CONTENT: Google safety filter rejected prompt even after rewrite')
        }
        // Creative mode succeeds!
        expect(input.mode).toBe('creative')
        expect(input.sourceMethod).toBe('frame')
        return
      }
    })

    const optimizeShotDirection = vi.fn(async () => {})
    const notifications: Array<{ kind: string; title: string; screeningUrl?: string }> = []

    const options: ProductionBuilderOptions = {
      scopeMode: 'custom',
      selectedSceneIndices: [0],
      stages: ['previs', 'clips', 'scenes', 'master'],
      quality: 'draft',
      language: 'en',
      missingOnly: false,
      optimizeShotDirection: true,
      autoRerunFailedShots: true,
      creativeClipPolicyFallback: true,
      checkpointMode: 'autonomous',
      notificationFrequency: 'phase_milestones',
      mintScreeningLink: true,
    }

    const deps: ProductionAgentDeps = {
      projectId: 'proj-1',
      projectTitle: 'Ancient Aliens Search',
      ensureSceneDirection: async () => {},
      ensureSceneReferences: async () => {},
      runSceneAudio: async () => 2,
      runSceneStills: async () => 3,
      ensureSceneSegments: async () => mockShots,
      optimizeShotDirection,
      generateSegmentClip,
      renderSceneMp4: async () => 'https://example.com/scene-1-master.mp4',
      assembleMasterStream: async () => 'https://example.com/master.mp4',
      mintScreeningLink: async () => 'https://sceneflowai.studio/s/ancient-aliens-cut',
      runPromoStage: async () => undefined,
      onNotify: async (n) => {
        notifications.push({ kind: n.kind, title: n.title, screeningUrl: n.screeningUrl })
      },
      onProgress: () => {},
    }

    const telemetry = await runProductionAgent(options, deps)

    expect(telemetry.errors).toHaveLength(0)
    expect(telemetry.clipsGenerated).toBe(3)
    expect(telemetry.creativeFallbacksUsed).toBe(1)
    expect(telemetry.failedShotsRerun).toBe(2)
    expect(telemetry.shotsOptimized).toBeGreaterThanOrEqual(4)
    expect(telemetry.screeningUrl).toBe('https://sceneflowai.studio/s/ancient-aliens-cut')
    expect(seg1cStandardAttempts).toBe(2)
    expect(notifications.some((n) => n.kind === 'policy_escalated')).toBe(true)
    expect(
      notifications.some(
        (n) =>
          n.kind === 'run_completed' &&
          n.screeningUrl === 'https://sceneflowai.studio/s/ancient-aliens-cut'
      )
    ).toBe(true)
  })

  it('pauses at Pre-Vis Director Checkpoint and respects Director stop decision', async () => {
    const awaitCheckpoint = vi.fn(async (gate) => {
      expect(gate.type).toBe('previs')
      expect(gate.screeningUrl).toBe('https://sceneflowai.studio/s/previs-review')
      return false
    })

    const generateSegmentClip = vi.fn(async () => {})

    const options: ProductionBuilderOptions = {
      scopeMode: 'all',
      selectedSceneIndices: [0],
      stages: ['previs', 'clips', 'master'],
      quality: 'draft',
      language: 'en',
      missingOnly: true,
      optimizeShotDirection: true,
      autoRerunFailedShots: true,
      creativeClipPolicyFallback: true,
      checkpointMode: 'previs_checkpoint',
      notificationFrequency: 'checkpoints_and_completion',
      mintScreeningLink: true,
    }

    const telemetry = await runProductionAgent(options, {
      projectId: 'proj-1',
      projectTitle: 'Pre-Vis Checkpoint Film',
      ensureSceneDirection: async () => {},
      ensureSceneReferences: async () => {},
      runSceneAudio: async () => 1,
      runSceneStills: async () => 2,
      ensureSceneSegments: async () => [],
      optimizeShotDirection: async () => {},
      generateSegmentClip,
      renderSceneMp4: async () => undefined,
      assembleMasterStream: async () => undefined,
      mintScreeningLink: async () => 'https://sceneflowai.studio/s/previs-review',
      runPromoStage: async () => undefined,
      onNotify: async () => {},
      onProgress: () => {},
      awaitCheckpoint,
    })

    expect(awaitCheckpoint).toHaveBeenCalledTimes(1)
    expect(generateSegmentClip).not.toHaveBeenCalled()
    expect(telemetry.screeningUrl).toBe('https://sceneflowai.studio/s/previs-review')
  })
})
