import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let directionCalls = 0
let audioCalls = 0
let imageCalls = 0
let concurrentDirections = 0
let peakConcurrentDirections = 0

vi.mock('@/lib/sceneGeneration/generateDirection', () => ({
  generateSceneDirection: vi.fn(async () => {
    directionCalls++
    concurrentDirections++
    peakConcurrentDirections = Math.max(peakConcurrentDirections, concurrentDirections)
    await new Promise((r) => setTimeout(r, 20))
    concurrentDirections--
    return { sceneDirection: { camera: {}, scene: {}, talent: {}, segmentPromptBundle: [] } }
  }),
}))

vi.mock('@/lib/sceneGeneration/generateAudio', () => ({
  generateSceneAudio: vi.fn(async () => {
    audioCalls++
    await new Promise((r) => setTimeout(r, 30))
    return { assets: [], counts: { narration: 0, dialogue: 1, music: 0, sfx: 0 } }
  }),
  applyAudioAssetsToScene: vi.fn(),
}))

vi.mock('@/lib/sceneGeneration/generateImage', () => ({
  generateSceneImage: vi.fn(async ({ beatIndex }: { beatIndex?: number }) => {
    imageCalls++
    await new Promise((r) => setTimeout(r, 15))
    return { imageUrl: `https://example.com/beat-${beatIndex ?? 0}.png` }
  }),
}))

vi.mock('@/lib/intelligence/beat-sequence-planner', () => ({
  planBeatSequence: vi.fn(async ({ beats }: { beats: unknown[] }) => ({
    plans: beats.map((_, beatIndex) => ({
      beatIndex,
      prompt: `prompt-${beatIndex}`,
      allowTypography: false,
    })),
    usedAI: false,
  })),
  applyBeatKeyframePlansToScene: vi.fn((scene: Record<string, unknown>) => scene),
  ensureSceneMusicFromDirection: vi.fn((scene: Record<string, unknown>) => scene),
  isTitleOrCinematicScene: () => false,
}))

import { runExpress } from '@/lib/sceneGeneration/expressOrchestrator'
import type { ExpressEvent, ExpressPhase } from '@/lib/sceneGeneration/types'

function buildProject(sceneCount: number) {
  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    heading: `Scene ${i + 1}`,
    action: 'Action',
    dialogue: [{ character: 'ALICE', line: 'Hello', characterId: 'c1' }],
    beats: [
      { kind: 'action', actionDescription: 'Beat A' },
      { kind: 'dialogue', line: 'Hello' },
      { kind: 'action', actionDescription: 'Beat C' },
    ],
  }))
  return {
    metadata: {
      visionPhase: {
        narrationVoice: { voiceId: 'v1', provider: 'google' },
        characters: [{ id: 'c1', name: 'ALICE', voiceConfig: { voiceId: 'v2', provider: 'google' } }],
        script: { script: { scenes } },
      },
    },
  }
}

function collectPhaseStarts(emit: (e: ExpressEvent) => void) {
  const starts: Array<{ sceneIndex: number; phase: ExpressPhase; t: number }> = []
  return {
    starts,
    emit: (e: ExpressEvent) => {
      if (e.type === 'phase-start') {
        starts.push({ sceneIndex: e.sceneIndex, phase: e.phase, t: Date.now() })
      }
      emit(e)
    },
  }
}

describe('runExpress', () => {
  const originalSceneConcurrency = process.env.EXPRESS_SCENE_CONCURRENCY

  beforeEach(() => {
    directionCalls = 0
    audioCalls = 0
    imageCalls = 0
    concurrentDirections = 0
    peakConcurrentDirections = 0
    process.env.EXPRESS_SCENE_CONCURRENCY = '2'
    process.env.EXPRESS_IMAGE_CONCURRENCY = '6'
    process.env.VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY = '2'
  })

  afterEach(() => {
    if (originalSceneConcurrency === undefined) {
      delete process.env.EXPRESS_SCENE_CONCURRENCY
    } else {
      process.env.EXPRESS_SCENE_CONCURRENCY = originalSceneConcurrency
    }
    vi.clearAllMocks()
  })

  it('runs audio and image phases in parallel after direction', async () => {
    const project = buildProject(1)
    const { starts, emit } = collectPhaseStarts(() => {})

    await runExpress({
      project,
      options: { projectId: 'p1', mode: 'batch', regenerate: true },
      baseUrl: 'http://localhost',
      emit,
    })

    expect(audioCalls).toBeGreaterThan(0)
    expect(imageCalls).toBeGreaterThan(0)

    const scene0 = starts.filter((s) => s.sceneIndex === 0)
    const directionStart = scene0.find((s) => s.phase === 'direction')?.t
    const audioStart = scene0.find((s) => s.phase === 'audio')?.t
    const imageStart = scene0.find((s) => s.phase === 'image')?.t

    expect(directionStart).toBeDefined()
    expect(audioStart).toBeDefined()
    expect(imageStart).toBeDefined()
    expect((directionStart ?? 0)).toBeLessThan(audioStart ?? 0)
    expect((directionStart ?? 0)).toBeLessThan(imageStart ?? 0)
    expect(Math.abs((audioStart ?? 0) - (imageStart ?? 0))).toBeLessThan(50)
  })

  it('processes multiple scenes concurrently per EXPRESS_SCENE_CONCURRENCY', async () => {
    const project = buildProject(3)

    await runExpress({
      project,
      options: { projectId: 'p1', mode: 'batch', regenerate: true },
      baseUrl: 'http://localhost',
      emit: () => {},
    })

    expect(directionCalls).toBe(3)
    expect(peakConcurrentDirections).toBeGreaterThanOrEqual(2)
  })

  it('uses concurrent beat image generation for batch mode', async () => {
    const project = buildProject(1)

    await runExpress({
      project,
      options: { projectId: 'p1', mode: 'batch', regenerate: true },
      baseUrl: 'http://localhost',
      emit: () => {},
    })

    expect(imageCalls).toBe(3)
  })
})
