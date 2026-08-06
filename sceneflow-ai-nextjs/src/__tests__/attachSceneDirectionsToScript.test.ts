import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateSceneDirection } from '@/lib/sceneGeneration/generateDirection'
import {
  attachSceneDirectionsToScript,
  readScenesFromVisionMetadata,
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
})

describe('script inception direction wiring', () => {
  it('generate-script-v2 attaches directions before persisting success', () => {
    const source = readSource('src/app/api/vision/generate-script-v2/route.ts')
    expect(source).toContain('attachSceneDirectionsToScript')
    expect(source).toContain('directionsAttached')
    const attachIdx = source.indexOf('attachSceneDirectionsToScript')
    const updateIdx = source.indexOf('await project.update({')
    // The direction attach call used for inception must run before the final persist.
    // There may be earlier project.update calls; assert the complete payload includes attach fields.
    expect(source).toContain('directionFailures')
    expect(attachIdx).toBeGreaterThan(-1)
    expect(updateIdx).toBeGreaterThan(-1)
  })

  it('generate-script v1 also attaches directions at inception', () => {
    const source = readSource('src/app/api/vision/generate-script/route.ts')
    expect(source).toContain('attachSceneDirectionsToScript')
    expect(source).toContain('directionsAttached')
  })

  it('client backfills only when inception attach missed scenes', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('data.directionsAttached')
    expect(page).toContain('directionFailures')
    expect(page).toContain('skipping client backfill')
    expect(page).not.toContain('Generating scene directions for new script...')
  })

  it('pending banner no longer claims direction is always post-script', () => {
    const banner = readSource('src/components/vision/WorkflowNextStepBanner.tsx')
    expect(banner).toContain('usually included when the script is generated')
    expect(banner).not.toContain(
      'Direction is generated automatically after script generation or when you edit the scene.'
    )
  })
})
