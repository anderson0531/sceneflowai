import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateSceneDirection } from '@/lib/sceneGeneration/generateDirection'
import {
  attachSceneDirectionsToScript,
  mergeSceneDirectionsOntoFresh,
  readScenesFromVisionMetadata,
  SCENE_DIRECTION_CONCURRENCY,
  writeScenesIntoVisionMetadata,
} from '@/lib/sceneGeneration/attachSceneDirectionsToScript'

vi.mock('@/lib/sceneGeneration/generateDirection', () => ({
  generateSceneDirection: vi.fn(),
}))

const mockDirection = {
  camera: { shots: [] },
  lighting: { overallMood: 'neutral' },
  scene: { location: 'ROOM' },
  talent: {},
  audio: {},
  segmentPromptBundle: [],
  generatedAt: '2026-01-01T00:00:00.000Z',
  basedOnContentHash: 'abc',
}

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('attachSceneDirectionsToScript', () => {
  beforeEach(() => {
    vi.mocked(generateSceneDirection).mockReset()
    vi.mocked(generateSceneDirection).mockResolvedValue({ sceneDirection: mockDirection as any })
  })

  it('generates direction for every scene missing sceneDirection', async () => {
    const scenes = [
      { heading: 'INT. A', action: 'One' },
      { heading: 'INT. B', action: 'Two' },
    ]
    const result = await attachSceneDirectionsToScript(scenes, { concurrency: 2 })

    expect(generateSceneDirection).toHaveBeenCalledTimes(2)
    expect(result.attachedCount).toBe(2)
    expect(result.skippedCount).toBe(0)
    expect(result.directionFailures).toEqual([])
    expect(result.directionsAttached).toBe(true)
    expect(result.scenes[0].sceneDirection).toEqual(mockDirection)
    expect(result.scenes[1].sceneDirection).toEqual(mockDirection)
  })

  it('skips scenes that already have sceneDirection', async () => {
    const existing = { camera: { shots: ['wide'] } }
    const scenes = [
      { heading: 'INT. A', action: 'One', sceneDirection: existing },
      { heading: 'INT. B', action: 'Two' },
    ]
    const result = await attachSceneDirectionsToScript(scenes)

    expect(generateSceneDirection).toHaveBeenCalledTimes(1)
    expect(result.skippedCount).toBe(1)
    expect(result.attachedCount).toBe(1)
    expect(result.scenes[0].sceneDirection).toBe(existing)
    expect(result.scenes[1].sceneDirection).toEqual(mockDirection)
  })

  it('preserves successes when one scene fails', async () => {
    vi.mocked(generateSceneDirection)
      .mockResolvedValueOnce({ sceneDirection: mockDirection as any })
      .mockRejectedValueOnce(new Error('quota'))
      .mockResolvedValueOnce({ sceneDirection: mockDirection as any })

    const scenes = [
      { heading: 'INT. A', action: 'One' },
      { heading: 'INT. B', action: 'Two' },
      { heading: 'INT. C', action: 'Three' },
    ]
    const result = await attachSceneDirectionsToScript(scenes, { concurrency: 1 })

    expect(result.attachedCount).toBe(2)
    expect(result.directionFailures).toEqual([1])
    expect(result.scenes[0].sceneDirection).toEqual(mockDirection)
    expect(result.scenes[1].sceneDirection).toBeUndefined()
    expect(result.scenes[2].sceneDirection).toEqual(mockDirection)
  })

  it('round-trips scenes through vision metadata helpers', () => {
    const scenes = [{ heading: 'INT. A', sceneDirection: mockDirection }]
    const written = writeScenesIntoVisionMetadata({}, scenes)
    expect(readScenesFromVisionMetadata(written)).toEqual(scenes)
    expect(written.visionPhase.script.script.scenes).toEqual(scenes)
  })

  it('stops starting scenes once the caller says to stop', async () => {
    let allow = true
    vi.mocked(generateSceneDirection).mockImplementation(async () => {
      allow = false
      return { sceneDirection: mockDirection } as Awaited<ReturnType<typeof generateSceneDirection>>
    })
    const scenes = [
      { heading: 'INT. A', action: 'One' },
      { heading: 'INT. B', action: 'Two' },
      { heading: 'INT. C', action: 'Three' },
    ]
    const result = await attachSceneDirectionsToScript(scenes, {
      concurrency: 1,
      shouldContinue: () => allow,
    })
    expect(result.attachedCount).toBe(1)
    expect(result.deferredCount).toBe(2)
    expect(result.scenes[0].sceneDirection).toEqual(mockDirection)
    expect(result.scenes[1].sceneDirection).toBeUndefined()
  })

  it('keeps a fresher scene direction when merging onto a re-read script', () => {
    const freshDirection = { camera: { shots: ['fresh'] } }
    const merged = mergeSceneDirectionsOntoFresh(
      [{ heading: 'INT. A', sceneDirection: freshDirection }, { heading: 'INT. B' }],
      [{ heading: 'INT. A', sceneDirection: mockDirection }, { heading: 'INT. B', sceneDirection: mockDirection }]
    )
    expect(merged[0].sceneDirection).toBe(freshDirection)
    expect(merged[1].sceneDirection).toEqual(mockDirection)
  })
})

describe('script inception direction wiring', () => {
  it('generate-script-v2 persists the script without inlining scene direction', () => {
    const source = readSource('src/app/api/vision/generate-script-v2/route.ts')
    expect(source).not.toContain('attachSceneDirectionsToScript')
    expect(source).not.toContain('migrateProjectBeatDirection')
    expect(source).not.toContain('directionDeadlineMs')
    expect(source).toContain('await project.update({')
  })

  it('scene-direction pass attaches, then backfills beat direction, at concurrency 4', () => {
    const source = readSource('src/app/api/vision/attach-scene-directions/route.ts')
    const attachIdx = source.indexOf('await attachSceneDirectionsToScript')
    const migrateIdx = source.indexOf('migrateProjectBeatDirection(metadata)')
    const setContextIdx = source.indexOf('migrateProjectBeatSetContext(metadata)')
    expect(attachIdx).toBeGreaterThan(-1)
    expect(migrateIdx).toBeGreaterThan(attachIdx)
    expect(setContextIdx).toBeGreaterThan(migrateIdx)
    expect(source).toContain('SCENE_DIRECTION_CONCURRENCY')
    expect(source).toContain('maxDuration = 600')
    expect(SCENE_DIRECTION_CONCURRENCY).toBe(4)
  })

  it('generate-script v1 also attaches directions at inception', () => {
    const source = readSource('src/app/api/vision/generate-script/route.ts')
    expect(source).toContain('attachSceneDirectionsToScript')
    expect(source).toContain('directionsAttached')
  })

  it('script completion chains scene direction then shot direction', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    const followups = readSource('src/lib/vision/scriptInceptionFollowups.ts')
    expect(page).toContain('startScriptInceptionFollowups(data.totalScenes)')
    expect(page).not.toContain('staggerIdx * 2000')
    expect(page).not.toContain('skipping client backfill')
    expect(page).not.toContain('Generating scene directions for new script...')
    expect(followups).toContain('/api/vision/attach-scene-directions')
    expect(followups).toContain('/api/vision/direct-scene-shots')
    const followupFn = followups.slice(followups.indexOf('export async function runScriptInceptionFollowups'))
    expect(followupFn.indexOf('requestSceneShotDirection')).toBeGreaterThan(
      followupFn.indexOf('/api/vision/attach-scene-directions')
    )
  })

  it('pending banner no longer claims direction is always post-script', () => {
    const banner = readSource('src/components/vision/WorkflowNextStepBanner.tsx')
    expect(banner).toContain('usually included when the script is generated')
    expect(banner).not.toContain(
      'Direction is generated automatically after script generation or when you edit the scene.'
    )
  })
})
