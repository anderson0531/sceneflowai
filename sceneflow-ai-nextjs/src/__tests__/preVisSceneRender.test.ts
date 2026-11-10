import { describe, expect, it } from 'vitest'
import { resolveScreeningVideoStreamUrl } from '@/lib/final-cut/resolveScreeningVideoStreamUrl'
import { collectPublishScenes } from '@/lib/publish/publishUnits'
import {
  buildMultiScenePreVisRenderPlan,
  buildPreVisSceneRenderPlan,
  collectPreVisLanguages,
  collectScenePreVisAudioUrls,
  getPreVisSceneSummary,
  resolvePreVisSceneId,
} from '@/lib/storyboard/preVisSceneRender'

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
    expect(plan.segments[0].videoUrl).toBe('https://cdn.example.com/beat-1.jpg')
    expect(plan.segments[0].kenBurns).toMatchObject({
      enabled: true,
      direction: 'left',
      intensity: 'medium',
    })
    expect(plan.segments[0].fadeOutSec).toBeGreaterThan(0)

    const seg0End = plan.segments[0].startTime + plan.segments[0].duration
    expect(plan.segments[1].startTime).toBeCloseTo(seg0End, 4)
    // Beat 2 had no dedicated image, so it falls back without dropping the beat window
    expect(plan.segments[1].videoUrl).toBeTruthy()
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
})
