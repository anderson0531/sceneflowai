import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveScreeningVideoStreamUrl } from '@/lib/final-cut/resolveScreeningVideoStreamUrl'
import { collectPublishScenes } from '@/lib/publish/publishUnits'
import * as stitchFinalCutMasterModule from '@/lib/streams/stitchFinalCutMaster'
import {
  PREVIS_MULTI_SCENE_MAX_DURATION_SEC,
  buildMultiScenePreVisRenderPlan,
  buildPreVisSceneRenderPlan,
  collectPreVisLanguages,
  collectScenePreVisAudioUrls,
  getPreVisSceneSummary,
  resolvePreVisSceneId,
  stitchPreVisSceneOutputs,
  type StitchablePreVisSceneClip,
} from '@/lib/storyboard/preVisSceneRender'
import { computeAnimaticStillTransform } from '@/lib/video/LocalRenderService'

function createSampleScene(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'scene-alpha',
    sceneNumber: 1,
    heading: 'INT. OBSERVATORY - NIGHT',
    imageUrl: 'https://cdn.example.com/establishing.jpg',
    transitionToNext: 'FADE',
    dialogue: [
      { character: 'ARIA', text: 'The signal is getting stronger.' },
      { character: 'KAEL', text: 'Lock onto the frequency.' },
    ],
    dialogueAudio: {
      en: [
        {
          audioUrl: 'https://cdn.example.com/en-line-1.mp3',
          duration: 3.5,
          dialogueIndex: 0,
          character: 'ARIA',
        },
        {
          audioUrl: 'https://cdn.example.com/en-line-2.mp3',
          duration: 2.5,
          dialogueIndex: 1,
          character: 'KAEL',
        },
      ],
      es: [
        {
          audioUrl: 'https://cdn.example.com/es-line-1.mp3',
          duration: 4.0,
          dialogueIndex: 0,
          character: 'ARIA',
        },
        {
          audioUrl: 'https://cdn.example.com/es-line-2.mp3',
          duration: 3.0,
          dialogueIndex: 1,
          character: 'KAEL',
        },
      ],
    },
    musicAudio: 'https://cdn.example.com/score.mp3',
    sfxAudio: [{ url: 'https://cdn.example.com/telemetry-beep.mp3', duration: 1.2 }],
    translations: {
      es: {
        heading: 'INT. OBSERVATORIO - NOCHE',
        beatsByBeatId: {
          'beat-1': { overlayText: 'OBSERVATORIO CENTRAL', overlayEdited: true },
        },
      },
    },
    beats: [
      {
        beatId: 'beat-1',
        kind: 'dialogue',
        character: 'ARIA',
        line: 'The signal is getting stronger.',
        dialogueIndex: 0,
        storyboardImageUrl: 'https://cdn.example.com/beat-1.jpg',
        musicEnabled: true,
        overlayText: 'CENTRAL OBSERVATORY',
        overlayType: 'lower_third',
        kenBurns: {
          enabled: true,
          direction: 'left',
          intensity: 'medium',
        },
        beatDirection: {
          transition: 'FADE',
        },
      },
      {
        beatId: 'beat-2',
        kind: 'dialogue',
        character: 'KAEL',
        line: 'Lock onto the frequency.',
        dialogueIndex: 1,
        // Intentionally omit storyboardImageUrl to verify fallback continuity
        beatDirection: {
          transition: 'CUT',
        },
      },
    ],
    ...overrides,
  }
}

describe('preVisSceneRender', () => {
  it('resolves canonical scene IDs consistently with Screening Room and Publishing', () => {
    expect(resolvePreVisSceneId({ id: 'custom-id' }, 0)).toBe('custom-id')
    expect(resolvePreVisSceneId({ sceneId: 'legacy-id' }, 2)).toBe('legacy-id')
    expect(resolvePreVisSceneId({}, 3)).toBe('scene-3')
  })

  it('discovers all playable and translated languages with English first', () => {
    const scenes = [
      createSampleScene(),
      createSampleScene({
        id: 'scene-beta',
        narrationAudio: { fr: { url: 'https://cdn.example.com/fr-narr.mp3' } },
      }),
    ]
    const langs = collectPreVisLanguages(scenes, ['ja'])
    expect(langs[0]).toBe('en')
    expect(langs).toEqual(['en', 'es', 'fr', 'ja'])
  })

  it('collects all voice, music, and SFX URLs for a scene and language', () => {
    const scene = createSampleScene()
    const urls = collectScenePreVisAudioUrls(scene, 'es')
    expect(urls).toContain('https://cdn.example.com/es-line-1.mp3')
    expect(urls).toContain('https://cdn.example.com/es-line-2.mp3')
    expect(urls).toContain('https://cdn.example.com/score.mp3')
    expect(urls).toContain('https://cdn.example.com/telemetry-beep.mp3')
  })

  it('builds a contiguous visual & audio render plan in sync with Screening Room', () => {
    const scene = createSampleScene()
    const plan = buildPreVisSceneRenderPlan(
      scene,
      0,
      'es',
      {
        'https://cdn.example.com/es-line-1.mp3': 4.2,
        'https://cdn.example.com/es-line-2.mp3': 3.1,
      },
      {
        resolution: '1080p',
        includeCaptions: true,
        tailHoldSec: 1.5,
      }
    )

    expect(plan.sceneId).toBe('scene-alpha')
    expect(plan.heading).toBe('INT. OBSERVATORIO - NOCHE')
    expect(plan.segments.length).toBe(2)

    // Verify visual segments are 100% contiguous from t=0 to totalDuration
    expect(plan.segments[0].startTime).toBe(0)
    expect(plan.segments[0].assetUrl).toBe('https://cdn.example.com/beat-1.jpg')
    expect(plan.segments[0].assetType).toBe('image')
    expect(plan.segments[0].kenBurns).toMatchObject({
      enabled: true,
      direction: 'left',
      intensity: 'medium',
    })
    expect(plan.segments[0].fadeOutSec).toBeGreaterThan(0)

    const seg0End = plan.segments[0].startTime + plan.segments[0].duration
    expect(plan.segments[1].startTime).toBeCloseTo(seg0End, 4)
    // Beat 2 had no dedicated image, so it falls back without dropping the beat window
    expect(plan.segments[1].assetUrl).toBeTruthy()
    const seg1End = plan.segments[1].startTime + plan.segments[1].duration
    expect(seg1End).toBeCloseTo(plan.totalDuration, 4)

    // Verify dialogue, music, and sfx clips are present
    const dialogueClips = plan.audioClips.filter((c) => c.type === 'dialogue')
    const musicClips = plan.audioClips.filter((c) => c.type === 'music')
    const sfxClips = plan.audioClips.filter((c) => c.type === 'sfx')

    expect(dialogueClips).toHaveLength(2)
    expect(dialogueClips[0].url).toBe('https://cdn.example.com/es-line-1.mp3')
    expect(dialogueClips[1].url).toBe('https://cdn.example.com/es-line-2.mp3')
    expect(musicClips.length).toBeGreaterThanOrEqual(1)
    expect(sfxClips.length).toBeGreaterThanOrEqual(1)

    // Verify translated beat caption overlay
    expect(plan.textOverlays).toHaveLength(1)
    expect(plan.textOverlays[0].text).toBe('OBSERVATORIO CENTRAL')
  })

  it('summarizes scene readiness and detects existing animatic stream renders', () => {
    const scene = createSampleScene()
    const unrendered = getPreVisSceneSummary(scene, 0, 'en', undefined)
    expect(unrendered.isPlayable).toBe(true)
    expect(unrendered.hasExistingAnimaticRender).toBe(false)

    const rendered = getPreVisSceneSummary(scene, 0, 'en', {
      isSegmented: false,
      targetSegmentDuration: 8,
      segments: [],
      productionStreams: [
        {
          id: 'anim-1',
          language: 'en',
          languageLabel: 'English',
          streamType: 'animatic',
          status: 'complete',
          mp4Url: 'https://cdn.example.com/scene-alpha-en-animatic.mp4',
        },
      ],
    })
    expect(rendered.hasExistingAnimaticRender).toBe(true)
    expect(rendered.existingAnimaticUrl).toBe(
      'https://cdn.example.com/scene-alpha-en-animatic.mp4'
    )
  })

  it('combines multiple scenes with cumulative offsets in buildMultiScenePreVisRenderPlan', () => {
    const scene1 = createSampleScene({ id: 'scene-1', sceneNumber: 1 })
    const scene2 = createSampleScene({ id: 'scene-2', sceneNumber: 2 })

    const multi = buildMultiScenePreVisRenderPlan(
      [
        { scene: scene1, sceneIndex: 0 },
        { scene: scene2, sceneIndex: 1 },
      ],
      'en'
    )

    expect(multi.scenePlans).toHaveLength(2)
    expect(multi.totalDuration).toBeCloseTo(
      multi.scenePlans[0].totalDuration + multi.scenePlans[1].totalDuration,
      4
    )
    const scene2FirstSeg = multi.config.segments.find((s) =>
      s.segmentId.startsWith('scene-2-')
    )
    expect(scene2FirstSeg?.startTime).toBeCloseTo(multi.scenePlans[0].totalDuration, 4)
  })

  it('unlocks Screening Room Scene/Chapter playback and Publishing units when an animatic stream is complete', () => {
    const prodState = {
      'scene-alpha': {
        productionStreams: [
          {
            id: 'previs-stream-1',
            streamType: 'animatic' as const,
            language: 'es',
            languageLabel: 'Spanish',
            status: 'complete' as const,
            mp4Url: 'https://cdn.example.com/previs-es.mp4',
            duration: 12,
          },
        ],
      },
    }

    expect(resolveScreeningVideoStreamUrl('scene-alpha', prodState, 'es', null)).toBe(
      'https://cdn.example.com/previs-es.mp4'
    )

    const publishScenes = collectPublishScenes(
      [createSampleScene()],
      prodState,
      'es'
    )
    expect(publishScenes).toHaveLength(1)
    expect(publishScenes[0].mp4Url).toBe('https://cdn.example.com/previs-es.mp4')
  })

  it('includes default Ken Burns motion on un-authored beats and renders pan+zoom in LocalRenderService', () => {
    const scene = createSampleScene({
      beats: [
        {
          beatId: 'beat-a',
          kind: 'action',
          actionDescription: 'Wide shot of the observatory dome opening.',
          storyboardImageUrl: 'https://cdn.example.com/dome-1.jpg',
          beatDirection: { transition: 'DISSOLVE' },
        },
        {
          beatId: 'beat-b',
          kind: 'action',
          actionDescription: 'Starlight floods the main console.',
          storyboardImageUrl: 'https://cdn.example.com/dome-2.jpg',
          beatDirection: { transition: 'CUT' },
        },
      ],
    })

    const plan = buildPreVisSceneRenderPlan(scene, 0, 'en')
    expect(plan.segments).toHaveLength(2)

    // Both un-authored beats receive active, distinct Ken Burns motion by default
    expect(plan.segments[0].kenBurns?.enabled).toBe(true)
    expect(plan.segments[1].kenBurns?.enabled).toBe(true)
    expect(plan.segments[0].kenBurns).not.toEqual(plan.segments[1].kenBurns)

    // DISSOLVE transition onto beat-b populates dissolveInSec
    expect(plan.segments[1].dissolveInSec).toBeGreaterThan(0)

    // LocalRenderService transform actually moves (scale + pan) across 0 -> 1 progress
    const tStart = computeAnimaticStillTransform(plan.segments[0].kenBurns, 0, 1920, 1080)
    const tEnd = computeAnimaticStillTransform(plan.segments[0].kenBurns, 1, 1920, 1080)
    const moved =
      Math.abs(tEnd.scalePush - tStart.scalePush) > 0.04 ||
      Math.abs(tEnd.translateX - tStart.translateX) > 20 ||
      Math.abs(tEnd.translateY - tStart.translateY) > 10
    expect(moved).toBe(true)
  })

  it('supports lineZoom, crossfade, fit, and static (off) motion preferences in Pre-Vis render plans', () => {
    const scene = createSampleScene({
      beats: [
        {
          beatId: 'beat-1',
          kind: 'action',
          actionDescription: 'Shot one.',
          storyboardImageUrl: 'https://cdn.example.com/shot-1.jpg',
          beatDirection: { transition: 'CUT' },
        },
        {
          beatId: 'beat-2',
          kind: 'action',
          actionDescription: 'Shot two.',
          storyboardImageUrl: 'https://cdn.example.com/shot-2.jpg',
          beatDirection: { transition: 'CUT' },
        },
      ],
    })

    const lineZoomPlan = buildPreVisSceneRenderPlan(
      scene,
      0,
      'en',
      {},
      { imageEffectPrefs: { mode: 'lineZoom', kenBurnsIntensity: 'medium' } }
    )
    const lzStart = computeAnimaticStillTransform(lineZoomPlan.segments[0].kenBurns, 0, 1920, 1080)
    const lzEnd = computeAnimaticStillTransform(lineZoomPlan.segments[0].kenBurns, 1, 1920, 1080)
    expect(lzStart.scalePush).toBeCloseTo(1, 4)
    expect(lzEnd.scalePush).toBeCloseTo(1.06, 3)
    expect(lzEnd.translateX).toBeCloseTo(0, 3)

    const crossfadePlan = buildPreVisSceneRenderPlan(
      scene,
      0,
      'en',
      {},
      { imageEffectPrefs: { mode: 'crossfade', kenBurnsIntensity: 'medium' } }
    )
    expect(crossfadePlan.segments[1].dissolveInSec).toBeCloseTo(0.4, 3)

    const fitPlan = buildPreVisSceneRenderPlan(
      scene,
      0,
      'en',
      {},
      { imageEffectPrefs: { mode: 'fit', kenBurnsIntensity: 'medium' } }
    )
    expect(fitPlan.config.frameFit).toBe('contain')

    const staticPlan = buildPreVisSceneRenderPlan(
      scene,
      0,
      'en',
      {},
      { imageEffectPrefs: { mode: 'off', kenBurnsIntensity: 'medium' } }
    )
    const stEnd = computeAnimaticStillTransform(staticPlan.segments[0].kenBurns, 1, 1920, 1080)
    expect(stEnd).toEqual({ scalePush: 1, translateX: 0, translateY: 0 })
  })

  describe('16-scene combined Pre-Vis stitching & stream parity', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('enables ensureAudioTrack and raises maxDurationSec above 300s for 16-scene Pre-Vis plans', () => {
      const sixteenScenes = Array.from({ length: 16 }, (_, idx) => ({
        scene: createSampleScene({
          id: `scene-${idx + 1}`,
          sceneNumber: idx + 1,
          dialogue: [
            { character: 'ARIA', text: 'Long exposition line one.' },
            { character: 'KAEL', text: 'Long exposition line two.' },
          ],
          dialogueAudio: {
            en: [
              {
                audioUrl: `https://cdn.example.com/s${idx + 1}-1.mp3`,
                duration: 12,
                dialogueIndex: 0,
                character: 'ARIA',
              },
              {
                audioUrl: `https://cdn.example.com/s${idx + 1}-2.mp3`,
                duration: 12,
                dialogueIndex: 1,
                character: 'KAEL',
              },
            ],
          },
        }),
        sceneIndex: idx,
      }))

      const singleSilentPlan = buildPreVisSceneRenderPlan(
        createSampleScene({ dialogue: [], dialogueAudio: {} }),
        0,
        'en'
      )
      expect(singleSilentPlan.config.ensureAudioTrack).toBe(true)
      expect(singleSilentPlan.config.trustSegmentDurations).toBe(true)

      const multi = buildMultiScenePreVisRenderPlan(sixteenScenes, 'en')
      expect(multi.scenePlans).toHaveLength(16)
      expect(multi.totalDuration).toBeGreaterThan(300)
      expect(multi.config.ensureAudioTrack).toBe(true)
      expect(multi.config.trustSegmentDurations).toBe(true)
      expect(multi.config.maxDurationSec).toBe(PREVIS_MULTI_SCENE_MAX_DURATION_SEC)
      expect(multi.config.maxDurationSec!).toBeGreaterThan(multi.totalDuration)
    })

    it('stitches 16 rendered scene clips in scene order via /api/export/previs-stitch', async () => {
      const clips: StitchablePreVisSceneClip[] = Array.from({ length: 16 }, (_, idx) => ({
        sceneId: `scene-${idx + 1}`,
        sceneIndex: idx,
        sceneNumber: idx + 1,
        duration: 24,
        uploadedUrl: `https://demo.public.blob.vercel-storage.com/renders/previs/scene-${idx + 1}.mp4`,
        mimeType: 'video/mp4',
      }))

      // Shuffle input order to verify sceneIndex sorting
      const reversedClips = [...clips].reverse()

      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url === '/api/export/previs-stitch') {
          const body = JSON.parse(String(init?.body ?? '{}')) as {
            urls: string[]
            durations: number[]
            container: string
            resolution?: string
          }
          expect(body.urls).toHaveLength(16)
          expect(body.urls[0]).toContain('scene-1.mp4')
          expect(body.urls[15]).toContain('scene-16.mp4')
          expect(body.durations).toHaveLength(16)
          expect(body.durations[0]).toBe(24)
          expect(body.container).toBe('mp4')
          expect(body.resolution).toBe('1080p')
          return new Response(
            JSON.stringify({
              success: true,
              url: 'https://demo.public.blob.vercel-storage.com/renders/previs/combined-en.mp4',
              downloadUrl:
                'https://demo.public.blob.vercel-storage.com/renders/previs/combined-en.mp4?download=1',
              mimeType: 'video/mp4',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response('mp4-bytes', {
          status: 200,
          headers: { 'Content-Type': 'video/mp4' },
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await stitchPreVisSceneOutputs(reversedClips, {
        projectId: 'proj-16',
        projectTitle: 'Starlight',
        language: 'en',
        resolution: '1080p',
      })

      expect(result.strategy).toBe('server-ffmpeg')
      expect(result.sceneCount).toBe(16)
      expect(result.totalDuration).toBe(16 * 24)
      expect(result.cloudUrl).toBe(
        'https://demo.public.blob.vercel-storage.com/renders/previs/combined-en.mp4'
      )
      expect(result.downloadUrl).toBeTruthy()
      expect(result.mimeType).toBe('video/mp4')
    })

    it('falls back to Cloud Run stitchFinalCutClips with forceCloudRun=true when /api/export/previs-stitch fails', async () => {
      // Total duration is 35s (< 300s): forceCloudRun=true ensures we never fall into browser
      // HTMLVideoElement seeking on unindexed MediaRecorder fragmented MP4s.
      const clips: StitchablePreVisSceneClip[] = [
        {
          sceneId: 'scene-1',
          sceneIndex: 0,
          sceneNumber: 1,
          duration: 15,
          uploadedUrl: 'https://demo.public.blob.vercel-storage.com/s1.mp4',
          mimeType: 'video/mp4',
        },
        {
          sceneId: 'scene-2',
          sceneIndex: 1,
          sceneNumber: 2,
          duration: 20,
          uploadedUrl: 'https://demo.public.blob.vercel-storage.com/s2.mp4',
          mimeType: 'video/mp4',
        },
      ]

      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input)
          if (url === '/api/export/previs-stitch') {
            return new Response(JSON.stringify({ error: 'Temporary server error' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          }
          return new Response('cloud-mp4-bytes', {
            status: 200,
            headers: { 'Content-Type': 'video/mp4' },
          })
        })
      )

      const cloudSpy = vi
        .spyOn(stitchFinalCutMasterModule, 'stitchFinalCutClips')
        .mockResolvedValue('https://demo.public.blob.vercel-storage.com/cloud-master.mp4')

      const result = await stitchPreVisSceneOutputs(clips, {
        projectId: 'proj-fallback',
        projectTitle: 'Fallback Film',
        language: 'en',
        resolution: '1080p',
      })

      expect(cloudSpy).toHaveBeenCalledTimes(1)
      expect(cloudSpy.mock.calls[0][0]).toMatchObject({
        projectId: 'proj-fallback',
        forceCloudRun: true,
      })
      expect(result.strategy).toBe('cloud-run')
      expect(result.cloudUrl).toBe(
        'https://demo.public.blob.vercel-storage.com/cloud-master.mp4'
      )
      expect(result.sceneCount).toBe(2)
      expect(result.totalDuration).toBe(35)
    })

    it('rejects when fewer than 2 rendered scene clips are provided', async () => {
      await expect(
        stitchPreVisSceneOutputs(
          [
            {
              sceneId: 'scene-1',
              sceneIndex: 0,
              sceneNumber: 1,
              duration: 15,
              uploadedUrl: 'https://demo.public.blob.vercel-storage.com/s1.mp4',
            },
          ],
          { language: 'en' }
        )
      ).rejects.toThrow(/At least 2 rendered scenes/)
    })
  })
})
