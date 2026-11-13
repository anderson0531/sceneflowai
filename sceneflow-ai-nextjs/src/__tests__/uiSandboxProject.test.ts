import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEMO_MEMOIR_PROJECT_ID,
  DEMO_PROJECT_ID,
  DEMO_SILT_LINE_PROJECT_ID,
  DEMO_WHITE_CITY_PROJECT_ID,
  SANDBOX_CREDITS,
  directSandboxBeatStillsFallback,
  getAllUiSandboxProjectSummaries,
  getAllUiSandboxProjects,
  getUiSandboxProject,
  getUiSandboxProjectSummary,
  isDemoProjectId,
  isDemoShareToken,
} from '@/lib/demo/uiSandboxProject'
import {
  DEMO_ANIMATED_SERIES_ID,
  DEMO_SERIES_ID,
  getAllUiSandboxSeries,
  getUiSandboxSeries,
  getUiSandboxSeriesProductionReferences,
  isDemoSeriesId,
} from '@/lib/demo/uiSandboxSeries'
import {
  applyOptimizedShotPatches,
  runShotDirectionChunks,
  shotDirectionCatalogFromPhase,
} from '@/lib/vision/shotDirectionBatch'
import { pendingPolishRecommendations } from '@/lib/script/scenePolish/formatPolishBeats'
import {
  isDatabaseUnavailableError,
  isGcpAuthOrProjectAccessError,
} from '@/lib/database/connectionDiagnostics'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PUBLIC_DIR = path.resolve(__dirname, '../../public')

function assertPublicAssetExists(assetUrl: string) {
  if (assetUrl.startsWith('data:')) return
  expect(assetUrl.startsWith('/')).toBe(true)
  const diskPath = path.join(PUBLIC_DIR, assetUrl.replace(/^\//, ''))
  expect(fs.existsSync(diskPath), `Missing public asset on disk: ${assetUrl}`).toBe(true)
}

describe('uiSandboxProject & uiSandboxSeries', () => {
  it('uses valid UUID v4s for all showcase projects & series and detects aliases', () => {
    for (const id of [
      DEMO_PROJECT_ID,
      DEMO_MEMOIR_PROJECT_ID,
      DEMO_WHITE_CITY_PROJECT_ID,
      DEMO_SILT_LINE_PROJECT_ID,
    ]) {
      expect(UUID_REGEX.test(id)).toBe(true)
      expect(isDemoProjectId(id)).toBe(true)
    }
    expect(isDemoProjectId('demo-production-sandbox')).toBe(true)
    expect(isDemoProjectId('ui-sandbox')).toBe(true)
    expect(isDemoProjectId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false)

    expect(UUID_REGEX.test(DEMO_SERIES_ID)).toBe(true)
    expect(UUID_REGEX.test(DEMO_ANIMATED_SERIES_ID)).toBe(true)
    expect(isDemoSeriesId(DEMO_SERIES_ID)).toBe(true)
    expect(isDemoSeriesId(DEMO_ANIMATED_SERIES_ID)).toBe(true)
    expect(isDemoShareToken('glass-ledger-screening')).toBe(true)
  })

  it('contains zero GCS URLs, clean presentation titles, and verified on-disk cinema media', () => {
    const allProjects = getAllUiSandboxProjects()
    expect(allProjects).toHaveLength(4)

    for (const proj of allProjects) {
      const serialized = JSON.stringify(proj)
      expect(serialized).not.toContain('storage.googleapis.com')
      expect(serialized).not.toContain('gs://')
      expect(proj.title).not.toContain('UI Sandbox')
      assertPublicAssetExists(proj.metadata.thumbnailUrl)
      assertPublicAssetExists(proj.metadata.posterUrl)
      expect(proj.metadata.blueprintAudienceResonance?.analysis?.version).toBe(3)
      expect(proj.metadata.blueprintAudienceResonance?.analysis?.overallScore).toBeGreaterThanOrEqual(90)
    }

    const project = getUiSandboxProject(DEMO_PROJECT_ID)
    const visionPhase = project.metadata.visionPhase
    const scenes = visionPhase.script.script.scenes
    expect(scenes).toHaveLength(3)

    // Verify Cast, Locations, and Props use bespoke public cinema plates that exist on disk
    for (const char of visionPhase.characters) {
      if (char.referenceImage) assertPublicAssetExists(char.referenceImage)
    }
    for (const loc of visionPhase.references.locationReferences) {
      assertPublicAssetExists(loc.imageUrl)
    }
    for (const prop of visionPhase.references.objectReferences) {
      assertPublicAssetExists(prop.imageUrl)
    }

    // Verify 7-locale Screening Room master streams exist on disk
    expect(visionPhase.streams).toHaveLength(7)
    for (const stream of visionPhase.streams) {
      expect(stream.status).toBe('ready')
      expect(stream.mp4Url).toMatch(/\.mp4$/)
      assertPublicAssetExists(stream.mp4Url)
    }

    // Verify every scene has sceneDirection, movements, beatCoverage, v1/v2 stills, and audio
    for (const scene of scenes) {
      expect(scene.sceneDirection?.movements?.length).toBeGreaterThanOrEqual(2)
      expect(scene.sceneDirection?.beatCoverage?.length).toBeGreaterThanOrEqual(2)
      assertPublicAssetExists(scene.imageUrl)
      expect(scene.narrationAudioUrl).toMatch(/^data:audio\/wav;base64,/)
      expect(scene.musicAudio).toMatch(/^data:audio\/wav;base64,/)
      expect(scene.dialogueAudio?.en?.length).toBeGreaterThan(0)
      expect(scene.dialogueAudio?.es?.length).toBeGreaterThan(0)
      for (const beat of scene.beats) {
        assertPublicAssetExists(beat.storyboardImageUrl)
        assertPublicAssetExists(beat.endFrameImageUrl)
        expect(beat.storyboardImageVersions?.length).toBeGreaterThanOrEqual(1)
        expect(beat.storyboardImagePrompt.length).toBeGreaterThan(40)
        expect(beat.videoPrompt.length).toBeGreaterThan(40)
      }
      if ((scene as any).polishAnalysis) {
        const recs = pendingPolishRecommendations((scene as any).polishAnalysis)
        expect(recs.length).toBeGreaterThan(0)
        expect(typeof recs[0]?.text).toBe('string')
        expect(Array.isArray(recs[0]?.beatIndices)).toBe(true)
        expect(recs[0]?.beatIndices.map((n) => n)).toEqual([2, 4])
      }
    }

    // Verify beat 1 of Scene 1 has 2 selectable still versions and 2 video takes
    expect(scenes[0].beats[0].storyboardImageVersions).toHaveLength(2)
    const firstSeg = visionPhase.production.scenes['scene-demo-1'].segments[0]
    expect(firstSeg.assetType).toBe('video')
    expect(firstSeg.takes).toHaveLength(2)
    assertPublicAssetExists(firstSeg.takes[0].assetUrl)
    assertPublicAssetExists(firstSeg.takes[1].assetUrl)

    expect(Object.keys(visionPhase.production.scenes)).toEqual([
      'scene-demo-1',
      'scene-demo-2',
      'scene-demo-3',
    ])
  })

  it('populates both flagship Sandbox Series with on-disk Continuity Reference assets', () => {
    const allSeries = getAllUiSandboxSeries()
    expect(allSeries).toHaveLength(2)

    for (const s of allSeries) {
      const full = getUiSandboxSeries(s.id)
      expect(full.episodeBlueprints.length).toBeGreaterThanOrEqual(6)
      const resonance = (full.metadata as any)?.resonance_analysis
      expect(resonance?.greenlightScore?.score).toBeGreaterThanOrEqual(90)
      const narrationUrl = (full.metadata as any)?.narration?.overview?.audioUrl
      if (narrationUrl) assertPublicAssetExists(narrationUrl)
      for (const ch of full.productionBible.characters) {
        if (ch.referenceImageUrl) assertPublicAssetExists(ch.referenceImageUrl)
      }
      for (const loc of full.productionBible.locations) {
        if (loc.referenceImageUrl) assertPublicAssetExists(loc.referenceImageUrl)
      }
      const refs = getUiSandboxSeriesProductionReferences(s.id)
      expect(refs.library.characters.length).toBeGreaterThan(0)
    }
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

  it('builds valid project summaries for all 4 showcase projects and preserves 1M project credits', () => {
    const project = getUiSandboxProject()
    expect(SANDBOX_CREDITS).toBe(1_000_000)
    expect(project.metadata.credits).toBe(1_000_000)
    const summary = getUiSandboxProjectSummary()
    expect(summary.id).toBe(DEMO_PROJECT_ID)
    assertPublicAssetExists(summary.metadata.thumbnailUrl)

    const summaries = getAllUiSandboxProjectSummaries()
    expect(summaries).toHaveLength(4)
    expect(summaries.map((s) => s.id)).toEqual([
      DEMO_PROJECT_ID,
      DEMO_MEMOIR_PROJECT_ID,
      DEMO_WHITE_CITY_PROJECT_ID,
      DEMO_SILT_LINE_PROJECT_ID,
    ])
  })

  it('classifies GCP auth/IAM/billing revocation and circuit-breaker errors as database unavailable', () => {
    expect(isGcpAuthOrProjectAccessError(new Error('invalid_grant: account disabled'))).toBe(true)
    expect(
      isDatabaseUnavailableError(
        Object.assign(new Error('Caller does not have permission on sqladmin instance'), { code: '403' })
      )
    ).toBe(true)
    expect(
      isDatabaseUnavailableError(new Error('Database circuit breaker open (cooldown 29s remaining)'))
    ).toBe(true)
    expect(isDatabaseUnavailableError(new Error('Validation failed: title is required'))).toBe(false)
  })
})
