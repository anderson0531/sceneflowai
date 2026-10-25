import { describe, expect, it } from 'vitest'
import {
  DEMO_PROJECT_ID,
  directSandboxBeatStillsFallback,
  getUiSandboxProject,
  getUiSandboxProjectSummary,
  isDemoProjectId,
} from '@/lib/demo/uiSandboxProject'
import {
  applyOptimizedShotPatches,
  runShotDirectionChunks,
  shotDirectionCatalogFromPhase,
} from '@/lib/vision/shotDirectionBatch'
import { pendingPolishRecommendations } from '@/lib/script/scenePolish/formatPolishBeats'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('uiSandboxProject', () => {
  it('uses a valid UUID v4 for DEMO_PROJECT_ID and detects demo aliases', () => {
    expect(UUID_REGEX.test(DEMO_PROJECT_ID)).toBe(true)
    expect(isDemoProjectId(DEMO_PROJECT_ID)).toBe(true)
    expect(isDemoProjectId('demo-production-sandbox')).toBe(true)
    expect(isDemoProjectId('ui-sandbox')).toBe(true)
    expect(isDemoProjectId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false)
  })

  it('contains zero GCS URLs and uses self-contained SVG and WAV data URIs', () => {
    const project = getUiSandboxProject()
    const serialized = JSON.stringify(project)

    expect(serialized).not.toContain('storage.googleapis.com')
    expect(serialized).not.toContain('gs://')

    const visionPhase = project.metadata.visionPhase
    const scenes = visionPhase.script.script.scenes
    expect(scenes).toHaveLength(3)

    // Verify every scene has sceneDirection, movements, beatCoverage, and inline media
    for (const scene of scenes) {
      expect(scene.sceneDirection?.movements?.length).toBeGreaterThanOrEqual(2)
      expect(scene.sceneDirection?.beatCoverage?.length).toBeGreaterThanOrEqual(2)
      expect(scene.imageUrl).toMatch(/^data:image\/svg\+xml;utf8,/)
      expect(scene.narrationAudioUrl).toMatch(/^data:audio\/wav;base64,/)
      expect(scene.musicAudio).toMatch(/^data:audio\/wav;base64,/)
      expect(scene.dialogueAudio?.en?.length).toBeGreaterThan(0)
      expect(scene.dialogueAudio?.es?.length).toBeGreaterThan(0)
      for (const beat of scene.beats) {
        expect(beat.endFrameImageUrl).toMatch(/^data:image\/svg\+xml;utf8,/)
        expect(beat.storyboardImagePrompt.length).toBeGreaterThan(40)
        expect(beat.videoPrompt.length).toBeGreaterThan(40)
      }
      if ((scene as any).polishAnalysis) {
        const recs = pendingPolishRecommendations((scene as any).polishAnalysis)
        expect(recs.length).toBeGreaterThan(0)
        expect(typeof recs[0]?.text).toBe('string')
      }
    }

    // Verify production segments exist for all 3 scenes
    expect(Object.keys(visionPhase.production.scenes)).toEqual([
      'scene-demo-1',
      'scene-demo-2',
      'scene-demo-3',
    ])
  })

  it('supports running Shot Direction Agent on Scene 1 offline via deterministic fallback', async () => {
    const project = getUiSandboxProject()
    const visionPhase = project.metadata.visionPhase
    const scenes = visionPhase.script.script.scenes
    const scene0 = scenes[0]

    const directed = await runShotDirectionChunks({
      scene: scene0 as unknown as Record<string, unknown>,
      catalog: shotDirectionCatalogFromPhase(visionPhase),
      concurrency: 2,
      force: false,
      direct: async (req) => directSandboxBeatStillsFallback(req as any),
    })

    // Scene 1 has 3 director beats and 1 llm beat (bt_s1_4), so non-force directs 1 beat
    expect(directed.requested).toBe(1)
    expect(directed.patches).toHaveLength(1)
    expect(directed.patches[0]?.beatId).toBe('bt_s1_4')

    const applied = applyOptimizedShotPatches({
      scenes: scenes as unknown as Array<Record<string, any>>,
      sceneIdx: 0,
      patches: directed.patches,
      characters: visionPhase.characters,
      locationReferences: visionPhase.references.locationReferences,
      objectReferences: visionPhase.references.objectReferences,
      force: false,
    })

    expect(applied.optimized).toBe(1)
    const updatedBeat4 = applied.scenes[0]?.beats?.[3]
    expect(updatedBeat4?.beatDirection?.generatedBy).toBe('director')
  })

  it('builds a valid project summary for dashboard list fallback', () => {
    const summary = getUiSandboxProjectSummary()
    expect(summary.id).toBe(DEMO_PROJECT_ID)
    expect(summary.metadata.thumbnailUrl).toMatch(/^data:image\/svg\+xml;utf8,/)
  })
})
