import { describe, expect, it } from 'vitest'
import {
  advanceSaveBaselineAfterPut,
  captureSaveBaselineFromMetadata,
  diffProjectPutAgainstBaseline,
  extractPublishingMetadataPatch,
  mergePublishingMetadataPatch,
} from '@/lib/projects/deltaProjectSave'
import { splitScriptPutIntoFittingBatches } from '@/lib/projects/slimProjectPutPayload'
import { mergeSceneArraysForPersistence } from '@/lib/storyboard/mergeSceneMedia'
import { buildOAuthPopupHtmlResponse } from '@/lib/publish/oauthPopupResponse'
import { upsertYoutubeBundle } from '@/lib/publish/publishingState'

function buildHeavyMetadata(sceneCount = 24) {
  const scenes = Array.from({ length: sceneCount }, (_, idx) => ({
    id: `scene-${idx + 1}`,
    sceneNumber: idx + 1,
    heading: `INT. LOCATION ${idx + 1} - NIGHT`,
    narration: `Narration text for scene ${idx + 1} `.repeat(20),
    beats: Array.from({ length: 6 }, (__, bIdx) => ({
      beatId: `bt_${idx + 1}_${bIdx + 1}`,
      kind: 'action',
      beatDirection: `Wide cinematic shot ${bIdx + 1} `.repeat(15),
      storyboardImageUrl: `https://blob.vercel-storage.com/scene-${idx + 1}-beat-${bIdx + 1}.jpg`,
    })),
  }))

  const productionScenes: Record<string, unknown> = {}
  for (let i = 0; i < sceneCount; i++) {
    productionScenes[`scene-${i + 1}`] = {
      segments: Array.from({ length: 6 }, (_, sIdx) => ({
        segmentId: `seg_${i + 1}_${sIdx + 1}`,
        activeAssetUrl: `https://blob.vercel-storage.com/video-${i + 1}-${sIdx + 1}.mp4`,
        prompt: 'Detailed video prompt '.repeat(30),
      })),
    }
  }

  return {
    imageQuality: 'high',
    visionPhase: {
      script: { script: { scenes } },
      scenes,
      scriptUpdatedAt: '2026-11-11T05:00:00.000Z',
      characters: [
        { id: 'char-1', name: 'Ava', referenceImage: 'https://blob.vercel-storage.com/ava.jpg' },
      ],
      references: {
        sceneReferences: [{ id: 'ref-1', imageUrl: 'https://blob.vercel-storage.com/ref1.jpg' }],
        objectReferences: [],
      },
      production: {
        scenes: productionScenes,
      },
      streams: [{ id: 'stream-en', language: 'en', format: 'video', status: 'ready', mp4Url: 'https://blob.vercel-storage.com/master-en.mp4' }],
      publishing: {
        streams: [{ id: 'stream-en', language: 'en', format: 'video', status: 'ready', mp4Url: 'https://blob.vercel-storage.com/master-en.mp4' }],
        youtubeByLanguage: {
          en: {
            language: 'en',
            title: 'Original Title',
            description: 'Original Description',
            privacyStatus: 'private' as const,
            status: 'draft' as const,
          },
        },
      },
    },
  }
}

describe('deltaProjectSave — Publishing & Streams lightweight PATCH', () => {
  it('extracts only publishing & stream fields without the heavy script/production payload', () => {
    const heavy = buildHeavyMetadata(24)
    const updated = upsertYoutubeBundle(heavy, 'es', {
      title: 'Título en Español',
      description: 'Descripción localizada',
      status: 'ready',
    })

    const fullBytes = JSON.stringify(updated).length
    const patch = extractPublishingMetadataPatch(updated)
    const patchBytes = JSON.stringify(patch).length

    expect(fullBytes).toBeGreaterThan(100_000)
    expect(patchBytes).toBeLessThan(2_500)
    expect((patch as Record<string, unknown>).visionPhase).toBeUndefined()
    expect(patch.publishing?.youtubeByLanguage.es?.title).toBe('Título en Español')
  })

  it('merges publishing patch onto stored project metadata without clobbering script, scenes, or production', () => {
    const stored = buildHeavyMetadata(12)
    const updatedClient = upsertYoutubeBundle(stored, 'fr', {
      title: 'Titre Français',
      description: 'Description',
      status: 'ready',
    })
    const patch = extractPublishingMetadataPatch(updatedClient)
    const merged = mergePublishingMetadataPatch(stored, patch)

    expect(merged.visionPhase.script.script.scenes).toHaveLength(12)
    expect(Object.keys(merged.visionPhase.production.scenes)).toHaveLength(12)
    expect(merged.visionPhase.characters).toHaveLength(1)
    expect(merged.visionPhase.publishing.youtubeByLanguage.en.title).toBe('Original Title')
    expect(merged.visionPhase.publishing.youtubeByLanguage.fr.title).toBe('Titre Français')
  })
})

describe('deltaProjectSave — Dirty scene & slice diffing', () => {
  it('peels persistProduction out of PUT body into changedProductionScenes and sends only dirty script scenes', () => {
    const loaded = buildHeavyMetadata(24)
    const baseline = captureSaveBaselineFromMetadata(loaded)

    // Simulate loadProject-migration modifying only 2 scenes + 1 production scene
    const cloned = JSON.parse(JSON.stringify(loaded))
    cloned.visionPhase.script.script.scenes[3].heading = 'INT. LAB - UPDATED'
    cloned.visionPhase.script.script.scenes[23].heading = 'EXT. PROMO - UPDATED'
    cloned.visionPhase.production.scenes['scene-4'].migrated = true

    const diff = diffProjectPutAgainstBaseline(
      { metadata: cloned, persistProduction: true },
      baseline
    )

    expect(diff.noOp).toBe(false)
    expect(diff.body.persistProduction).toBeUndefined()
    expect(diff.body.metadata.visionPhase.production).toBeUndefined()
    expect(diff.body.metadata.visionPhase.characters).toBeUndefined()
    expect(diff.body.metadata.visionPhase.references).toBeUndefined()
    expect(diff.changedProductionScenes).toHaveLength(1)
    expect(diff.changedProductionScenes[0].sceneId).toBe('scene-4')
    expect(diff.dirtySceneIds).toEqual(['scene-4', 'scene-24'])
    expect(diff.omittedUnchangedScenes).toBe(22)
    expect(diff.body.partialSceneBatch).toBe(true)
    expect(diff.body.metadata.visionPhase.script.script.scenes).toHaveLength(2)
  })

  it('drops unchanged 24-scene script completely when saving only character changes', () => {
    const loaded = buildHeavyMetadata(24)
    const baseline = captureSaveBaselineFromMetadata(loaded)

    const cloned = JSON.parse(JSON.stringify(loaded))
    cloned.visionPhase.characters[0].role = 'protagonist'

    const diff = diffProjectPutAgainstBaseline({ metadata: cloned }, baseline)

    expect(diff.noOp).toBe(false)
    expect(diff.body.metadata.visionPhase.script).toBeUndefined()
    expect(diff.body.metadata.visionPhase.characters).toHaveLength(1)
    expect(diff.omittedUnchangedScenes).toBe(24)
  })

  it('marks save as noOp when nothing changed relative to baseline', () => {
    const loaded = buildHeavyMetadata(10)
    const baseline = captureSaveBaselineFromMetadata(loaded)
    const cloned = JSON.parse(JSON.stringify(loaded))

    const diff = diffProjectPutAgainstBaseline({ metadata: cloned }, baseline)
    expect(diff.noOp).toBe(true)
  })

  it('advances baseline after a partial scene PUT so a repeat save becomes noOp', () => {
    const loaded = buildHeavyMetadata(8)
    const baseline = captureSaveBaselineFromMetadata(loaded)

    const cloned = JSON.parse(JSON.stringify(loaded))
    cloned.visionPhase.script.script.scenes[2].narration = 'Updated scene 3 narration'

    const firstDiff = diffProjectPutAgainstBaseline({ metadata: cloned }, baseline)
    expect(firstDiff.noOp).toBe(false)
    expect(firstDiff.dirtySceneIds).toEqual(['scene-3'])

    advanceSaveBaselineAfterPut(
      baseline,
      firstDiff.body,
      cloned.visionPhase.script.script.scenes
    )

    const secondDiff = diffProjectPutAgainstBaseline({ metadata: cloned }, baseline)
    expect(secondDiff.noOp).toBe(true)
  })

  it('preserves Promo scenes without sceneNumber in-place during partial scene merges', () => {
    const existing = [
      { id: 'scene-1', sceneNumber: 1, heading: 'SCENE 1' },
      { id: 'scene-2', sceneNumber: 2, heading: 'SCENE 2' },
      { id: 'promo-1791551192964', heading: 'PROMO TRAILER', cinematicType: 'promo' },
    ]
    const incomingPartial = [{ id: 'scene-2', sceneNumber: 2, heading: 'SCENE 2 EDITED' }]

    const merged = mergeSceneArraysForPersistence(existing, incomingPartial, {
      partialSceneBatch: true,
    })

    expect(merged.map((s) => s.id)).toEqual([
      'scene-1',
      'scene-2',
      'promo-1791551192964',
    ])
    expect(merged[1].heading).toBe('SCENE 2 EDITED')
  })
})

describe('splitScriptPutIntoFittingBatches — non-script stripping across batches', () => {
  it('strips characters & references from subsequent scene batches so non-script fields are sent once', () => {
    const scenes = Array.from({ length: 6 }, (_, i) => ({
      id: `sc-${i + 1}`,
      sceneNumber: i + 1,
      prose: 'X'.repeat(4_000),
    }))
    const body = {
      metadata: {
        visionPhase: {
          characters: [{ id: 'c1', bio: 'Y'.repeat(3_000) }],
          script: { script: { scenes } },
          scriptUpdatedAt: '2026-11-11T06:00:00.000Z',
        },
      },
    }

    const batches = splitScriptPutIntoFittingBatches(body, { budgetBytes: 12_000 })
    expect(batches).not.toBeNull()
    expect(batches!.length).toBeGreaterThan(1)
    expect(batches![0].metadata?.visionPhase?.characters).toBeDefined()
    for (let i = 1; i < batches!.length; i++) {
      expect(batches![i].metadata?.visionPhase?.characters).toBeUndefined()
      expect(batches![i].partialSceneBatch).toBe(true)
    }
  })
})

describe('buildOAuthPopupHtmlResponse', () => {
  it('renders self-closing popup HTML with BroadcastChannel, localStorage, and postMessage bridges', async () => {
    const res = buildOAuthPopupHtmlResponse({
      platform: 'youtube',
      status: 'connected',
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    expect(res.headers.get('Cache-Control')).toContain('no-store')
    const html = await res.text()
    expect(html).toContain('YouTube Authorized')
    expect(html).toContain("BroadcastChannel('sceneflow-social-oauth')")
    expect(html).toContain("localStorage.setItem('sceneflow:social-oauth'")
    expect(html).toContain('window.opener.postMessage')
  })
})
