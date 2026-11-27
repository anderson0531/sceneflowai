import { describe, it, expect, vi } from 'vitest'
import {
  runProductionAgent,
  type ProductionBuilderOptions,
  type ProductionAgentDeps,
  type ProductionAgentShotDescriptor,
  type StageStepResult,
} from '@/lib/production/runProductionAgent'
import { buildKlingAuthHeader } from '@/lib/kling/klingDirectClient'

function createBaseOptions(overrides: Partial<ProductionBuilderOptions> = {}): ProductionBuilderOptions {
  return {
    scopeMode: 'custom',
    selectedSceneIndices: [0, 1],
    stages: ['previs'],
    quality: 'draft',
    language: 'en',
    missingOnly: false,
    optimizeShotDirection: true,
    autoRerunFailedShots: true,
    creativeClipPolicyFallback: true,
    checkpointMode: 'autonomous',
    notificationFrequency: 'completion_only',
    mintScreeningLink: false,
    ...overrides,
  }
}

function createBaseDeps(overrides: Partial<ProductionAgentDeps> = {}): ProductionAgentDeps {
  return {
    projectId: 'proj-429-test',
    projectTitle: 'Rate Limit Recovery Film',
    ensureSceneDirection: async () => {},
    ensureSceneReferences: async () => {},
    runSceneAudio: async () => ({ count: 1 }),
    runSceneStills: async () => ({ count: 1 }),
    ensureSceneSegments: async () => [],
    optimizeShotDirection: async () => {},
    generateSegmentClip: async () => {},
    renderSceneMp4: async () => undefined,
    assembleMasterStream: async () => undefined,
    mintScreeningLink: async () => undefined,
    runPromoStage: async () => undefined,
    onNotify: async () => {},
    onProgress: () => {},
    ...overrides,
  }
}

describe('Production Agent 429 Two-Phase Sequential Recovery', () => {
  it('runs Pre-Vis stills and audio coordinated sequentially per scene by default (no simultaneous double storm)', async () => {
    const events: string[] = []
    let activeCount = 0
    let maxConcurrent = 0

    const runSceneStills = vi.fn(async (sceneIndex: number) => {
      activeCount += 1
      maxConcurrent = Math.max(maxConcurrent, activeCount)
      events.push(`stills:start:${sceneIndex}`)
      await new Promise((r) => setTimeout(r, 15))
      events.push(`stills:end:${sceneIndex}`)
      activeCount -= 1
      return 2
    })

    const runSceneAudio = vi.fn(async (sceneIndex: number) => {
      activeCount += 1
      maxConcurrent = Math.max(maxConcurrent, activeCount)
      events.push(`audio:start:${sceneIndex}`)
      await new Promise((r) => setTimeout(r, 15))
      events.push(`audio:end:${sceneIndex}`)
      activeCount -= 1
      return 1
    })

    const telemetry = await runProductionAgent(
      createBaseOptions({ selectedSceneIndices: [0], stages: ['previs'] }),
      createBaseDeps({ runSceneStills, runSceneAudio })
    )

    expect(maxConcurrent).toBe(1)
    expect(events).toEqual([
      'stills:start:0',
      'stills:end:0',
      'audio:start:0',
      'audio:end:0',
    ])
    expect(telemetry.stillsGenerated).toBe(2)
    expect(telemetry.audioTracksGenerated).toBe(1)
  })

  it('captures Pre-Vis 429s and automatically recovers them in Phase 2 strictly sequential pass (concurrencyOverride: 1, failFastOnRateLimit: false)', async () => {
    const stillsCalls: Array<{
      sceneIndex: number
      concurrencyOverride?: number
      failFastOnRateLimit?: boolean
      onlyKeys?: string[]
    }> = []
    const audioCalls: Array<{
      sceneIndex: number
      concurrencyOverride?: number
      failFastOnRateLimit?: boolean
      onlyKeys?: string[]
    }> = []

    const runSceneStills = vi.fn(async (sceneIndex, opts): Promise<StageStepResult> => {
      stillsCalls.push({
        sceneIndex,
        concurrencyOverride: opts.concurrencyOverride,
        failFastOnRateLimit: opts.failFastOnRateLimit,
        onlyKeys: opts.onlyKeys,
      })
      if (!opts.onlyKeys) {
        return {
          count: 1,
          rateLimitedItems: [
            {
              kind: 'still',
              sceneIndex,
              key: `beat-${sceneIndex}-2:start`,
              retryAfterSec: 30,
              message: 'HTTP 429 RESOURCE_EXHAUSTED',
            },
          ],
        }
      }
      // Phase 2 recovery succeeds
      return { count: 1 }
    })

    const runSceneAudio = vi.fn(async (sceneIndex, opts): Promise<StageStepResult> => {
      audioCalls.push({
        sceneIndex,
        concurrencyOverride: opts.concurrencyOverride,
        failFastOnRateLimit: opts.failFastOnRateLimit,
        onlyKeys: opts.onlyKeys,
      })
      if (!opts.onlyKeys) {
        return {
          count: 1,
          rateLimitedItems: [
            {
              kind: 'audio',
              sceneIndex,
              key: 'dialogue:1',
              retryAfterSec: 15,
              message: '429 rate limit exceeded',
            },
          ],
        }
      }
      return { count: 1 }
    })

    const telemetry = await runProductionAgent(
      createBaseOptions({ selectedSceneIndices: [0], stages: ['previs'] }),
      createBaseDeps({ runSceneStills, runSceneAudio })
    )

    expect(telemetry.errors).toHaveLength(0)
    expect(telemetry.rateLimitedEvents).toBe(2)
    expect(telemetry.sequentialRecoveryPasses).toBe(1)
    expect(telemetry.recoveredAfterRateLimit).toBe(2)
    expect(telemetry.stillsGenerated).toBe(2)
    expect(telemetry.audioTracksGenerated).toBe(2)

    // Verify Phase 2 recovery invoked strictly sequentially with targeted onlyKeys
    expect(stillsCalls).toHaveLength(2)
    expect(stillsCalls[1]).toEqual({
      sceneIndex: 0,
      concurrencyOverride: 1,
      failFastOnRateLimit: false,
      onlyKeys: ['beat-0-2:start'],
    })

    expect(audioCalls).toHaveLength(2)
    expect(audioCalls[1]).toEqual({
      sceneIndex: 0,
      concurrencyOverride: 1,
      failFastOnRateLimit: false,
      onlyKeys: ['dialogue:1'],
    })
  })

  it('auto-downgrades remaining scenes to sequential mode mid-run after >= 2 rate-limit events', async () => {
    const observedStillsOpts: Array<{
      sceneIndex: number
      concurrencyOverride?: number
      failFastOnRateLimit?: boolean
      onlyKeys?: string[]
    }> = []

    const runSceneStills = vi.fn(async (sceneIndex, opts): Promise<StageStepResult> => {
      observedStillsOpts.push({
        sceneIndex,
        concurrencyOverride: opts.concurrencyOverride,
        failFastOnRateLimit: opts.failFastOnRateLimit,
        onlyKeys: opts.onlyKeys,
      })
      // Scene 0 triggers 2 rate-limited items -> crosses >= 2 threshold
      if (sceneIndex === 0 && !opts.onlyKeys) {
        return {
          count: 1,
          rateLimitedItems: [
            { kind: 'still', sceneIndex: 0, key: 'b0-1:start', message: '429' },
            { kind: 'still', sceneIndex: 0, key: 'b0-2:start', message: '429' },
          ],
        }
      }
      return { count: 1 }
    })

    const telemetry = await runProductionAgent(
      createBaseOptions({
        selectedSceneIndices: [0, 1, 2],
        stages: ['previs'],
        previsIncludeAudio: false,
      }),
      createBaseDeps({ runSceneStills })
    )

    expect(telemetry.downgradedToSequential).toBe(true)
    expect(telemetry.rateLimitedEvents).toBe(2)
    expect(telemetry.recoveredAfterRateLimit).toBe(2)

    // Scene 0 ran adaptive (no override), Scene 1 & Scene 2 automatically downgraded to sequential!
    const primaryCalls = observedStillsOpts.filter((c) => !c.onlyKeys)
    expect(primaryCalls[0]).toMatchObject({ sceneIndex: 0, concurrencyOverride: undefined })
    expect(primaryCalls[1]).toMatchObject({
      sceneIndex: 1,
      concurrencyOverride: 1,
      failFastOnRateLimit: false,
    })
    expect(primaryCalls[2]).toMatchObject({
      sceneIndex: 2,
      concurrencyOverride: 1,
      failFastOnRateLimit: false,
    })
  })

  it('NEVER escalates Clips 429 rate-limit errors to Kling Creative Clips even when autoRerunFailedShots is false and creativeClipPolicyFallback is true', async () => {
    const shot: ProductionAgentShotDescriptor = {
      segmentId: 'seg-429-only',
      beatId: 'beat-1',
      sequenceIndex: 0,
      label: 'Hero Shot',
      durationSec: 6,
      hasClip: false,
      hasStartFrame: true,
      hasEndFrame: true,
      startFrameUrl: 'https://example.com/start.jpg',
      endFrameUrl: 'https://example.com/end.jpg',
    }

    const modesCalled: string[] = []
    const generateSegmentClip = vi.fn(async (input) => {
      modesCalled.push(input.mode)
      throw new Error('Vertex AI error 429: RESOURCE_EXHAUSTED — retry after 45 seconds')
    })

    const telemetry = await runProductionAgent(
      createBaseOptions({
        selectedSceneIndices: [0],
        stages: ['clips'],
        autoRerunFailedShots: false,
        creativeClipPolicyFallback: true,
        optimizeShotDirection: false,
        maxRateLimitRecoveryPasses: 2,
      }),
      createBaseDeps({
        ensureSceneSegments: async () => [shot],
        generateSegmentClip,
      })
    )

    // Attempt 1 + 2 sequential recovery passes = 3 calls, ALL standard, ZERO creative!
    expect(modesCalled).toEqual(['standard', 'standard', 'standard'])
    expect(telemetry.creativeFallbacksUsed).toBe(0)
    expect(telemetry.clipsGenerated).toBe(0)
    expect(telemetry.sequentialRecoveryPasses).toBe(2)
    expect(telemetry.errors).toHaveLength(1)
    expect(telemetry.errors[0]).toMatch(/Rate limited after 2 sequential recovery pass/i)
  })

  it('recovers Clips 429 cleanly during Phase 2 sequential recovery pass and surfaces unrecoverable clips in telemetry.errors', async () => {
    const shots: ProductionAgentShotDescriptor[] = [
      {
        segmentId: 'seg-recovers',
        beatId: 'beat-1',
        sequenceIndex: 0,
        label: 'Shot 1 (recovers in pass 2)',
        durationSec: 5,
        hasClip: false,
        hasStartFrame: true,
        hasEndFrame: false,
        startFrameUrl: 'https://example.com/1.jpg',
      },
      {
        segmentId: 'seg-permanent-429',
        beatId: 'beat-2',
        sequenceIndex: 1,
        label: 'Shot 2 (never recovers)',
        durationSec: 5,
        hasClip: false,
        hasStartFrame: true,
        hasEndFrame: false,
        startFrameUrl: 'https://example.com/2.jpg',
      },
    ]

    const attempts: Record<string, number> = {}
    const generateSegmentClip = vi.fn(async (input) => {
      expect(input.mode).toBe('standard')
      attempts[input.segmentId] = (attempts[input.segmentId] ?? 0) + 1
      if (input.segmentId === 'seg-recovers') {
        // Attempt 1 + auto-rerun fail with 429; Phase 2 pass 1 succeeds!
        if (attempts[input.segmentId] <= 2) {
          throw new Error('429 rate limit exceeded — retry after 30 seconds')
        }
        return
      }
      throw new Error('429 RESOURCE_EXHAUSTED persistent quota saturation')
    })

    const telemetry = await runProductionAgent(
      createBaseOptions({
        selectedSceneIndices: [0],
        stages: ['clips'],
        autoRerunFailedShots: true,
        creativeClipPolicyFallback: true,
        optimizeShotDirection: false,
        maxRateLimitRecoveryPasses: 2,
      }),
      createBaseDeps({
        ensureSceneSegments: async () => shots,
        generateSegmentClip,
      })
    )

    expect(telemetry.clipsGenerated).toBe(1)
    expect(telemetry.creativeFallbacksUsed).toBe(0)
    expect(telemetry.recoveredAfterRateLimit).toBe(1)
    expect(telemetry.sequentialRecoveryPasses).toBe(2)
    expect(telemetry.downgradedToSequential).toBe(true)
    expect(telemetry.errors).toHaveLength(1)
    expect(telemetry.errors[0]).toContain('Shot 2')
    expect(telemetry.errors[0]).toMatch(/Rate limited after 2 sequential recovery pass/i)
  })
})

describe('BYOK Kling credential wiring', () => {
  it('builds auth header from BYOK Kling apiKey instead of platform env vars', () => {
    const prevKey = process.env.KLING_API_KEY
    process.env.KLING_API_KEY = 'platform-kling-secret'
    try {
      const header = buildKlingAuthHeader({
        source: 'byok',
        bucketNamespace: 'byok:abc123456789',
        apiKey: 'user-byok-kling-key-9999',
        recommendedConcurrency: 1,
      })
      expect(header).toBe('Bearer user-byok-kling-key-9999')
    } finally {
      if (prevKey === undefined) delete process.env.KLING_API_KEY
      else process.env.KLING_API_KEY = prevKey
    }
  })
})
