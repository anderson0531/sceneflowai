import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { GLOSSARY_TERMS, protectGlossary } from '@/lib/i18n/glossary'
import { resolvePromoBeatMedia } from '@/lib/publish/promoBeatMedia'
import { PROMO_AUDIO_MIX, promoPreviewMusicVolume } from '@/lib/publish/promoAudioMix'
import {
  directShotNumber,
  resolveDirectShotTarget,
  segmentWasPolicyBlocked,
} from '@/lib/vision/directShotTarget'
import { saveDirectorPatchToScenes } from '@/lib/vision/saveBeatDirection'
import {
  requestOptimizedShotDirection,
  runShotDirectionAgent,
  shotsForDirectionAgent,
} from '@/lib/vision/shotDirectionAgent'

function read(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), 'utf8')
}

function beat(beatId: string, sequenceIndex: number, overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId,
    sequenceIndex,
    kind: 'action',
    actionDescription: `Elara stands at the window in shot ${sequenceIndex + 1}.`,
    beatDirection: { shotType: 'Medium Shot', frozenMoment: 'Elara at the window' },
    ...overrides,
  }
}

const noSelection = { characterIds: [], objectRefIds: [], locationRefId: null, source: 'auto' as const }

describe('resolveDirectShotTarget', () => {
  const scenes = [
    { id: 'scene-a', beats: [beat('a1', 0), beat('a2', 1)] },
    { id: 'scene-b', beats: [beat('b1', 0), beat('b2', 1), beat('b3', 2)] },
  ]

  it('follows the scene id when scenes were reordered after planning', () => {
    expect(
      resolveDirectShotTarget(scenes, { sceneId: 'scene-b', sceneIndex: 0, beatId: 'b2' })
    ).toEqual({ sceneIndex: 1, beatId: 'b2' })
  })

  it('falls back to the planned index, then to any scene holding the shot', () => {
    expect(resolveDirectShotTarget(scenes, { sceneIndex: 1, beatId: 'b3' })).toEqual({
      sceneIndex: 1,
      beatId: 'b3',
    })
    expect(
      resolveDirectShotTarget(scenes, { sceneId: 'gone', sceneIndex: 0, beatId: 'b1' })
    ).toEqual({ sceneIndex: 1, beatId: 'b1' })
  })

  it('returns null when the shot is no longer in the script', () => {
    expect(resolveDirectShotTarget(scenes, { sceneIndex: 0, beatId: 'missing' })).toBeNull()
  })

  it('carries Safety only when asked', () => {
    expect(
      resolveDirectShotTarget(scenes, { sceneIndex: 0, beatId: 'a2', safety: true })
    ).toEqual({ sceneIndex: 0, beatId: 'a2', safety: true })
  })

  it('numbers the shot the way the Direct Shot title does', () => {
    expect(directShotNumber(scenes[1], 'b3')).toBe(3)
    expect(directShotNumber(scenes[1], 'missing')).toBeNull()
  })
})

describe('policy-blocked promo shots', () => {
  it('reads a policy block from the stored failure or the error text', () => {
    expect(segmentWasPolicyBlocked({ status: 'ERROR', lastContentPolicyFailure: {} })).toBe(true)
    expect(
      segmentWasPolicyBlocked({ status: 'ERROR', errorMessage: 'Omni returned content_blocked' })
    ).toBe(true)
    expect(
      segmentWasPolicyBlocked({ status: 'ERROR', errorMessage: 'Blocked by content policy.' })
    ).toBe(true)
    expect(segmentWasPolicyBlocked({ status: 'ERROR', errorMessage: 'Timed out' })).toBe(false)
    expect(segmentWasPolicyBlocked({ status: 'COMPLETE', lastContentPolicyFailure: {} })).toBe(false)
  })

  it('flags a promo beat whose clip was blocked', () => {
    const media = resolvePromoBeatMedia(
      {
        sceneId: 'scene-6',
        beatId: 'b12',
        sceneIndex: 6,
        startSec: 0,
        endSec: 6,
        durationSec: 6,
        score: 80,
      },
      {
        'scene-6': {
          segments: [
            {
              segmentId: 'seg-12',
              beatId: 'b12',
              status: 'ERROR',
              errorMessage: 'content_blocked',
            },
          ],
        },
      }
    )
    expect(media.hasClip).toBe(false)
    expect(media.policyBlocked).toBe(true)
  })

  it('wires the promo row to the scene card through the vision page', () => {
    const tab = read('src/components/publishing/PublishingPromoTab.tsx')
    expect(tab).toContain('onOpenDirectShot')
    expect(tab).toContain('Direct Shot')
    const page = read('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('setPendingDirectShot(target)')
    expect(page).toContain("setProductionViewWithUrl('studio')")
    const panel = read('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain('setDirectBeatId(pendingDirectShot.beatId)')
    expect(panel).toContain('setDirectBeatSafety(pendingDirectShot.safety === true)')
  })
})

describe('Shot Direction Agent', () => {
  it('skips excluded shots', () => {
    const scene = { beats: [beat('s1', 0), beat('s2', 1, { excluded: true }), beat('s3', 2)] }
    expect(shotsForDirectionAgent(scene).map((shot) => shot.beatId)).toEqual(['s1', 's3'])
  })

  it('sends the Direct Shot optimize request and returns the rewrite', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ usedAI: true, patch: { frozenMoment: 'Elara grips the sill' } }))
    )
    const patch = await requestOptimizedShotDirection({
      projectId: 'p1',
      sceneIndex: 6,
      beatId: 'b12',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(patch).toEqual({ frozenMoment: 'Elara grips the sill' })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/scene/direct-beat-still')
    expect(JSON.parse(String(init.body))).toEqual({
      projectId: 'p1',
      sceneIndex: 6,
      beatId: 'b12',
      mode: 'optimize',
    })
  })

  it('refuses a fallback response that carries no rewrite', async () => {
    const fallback = vi.fn(async () =>
      new Response(JSON.stringify({ usedAI: false, fallbackReason: 'Gemini down', patch: {} }))
    )
    await expect(
      requestOptimizedShotDirection({
        projectId: 'p1',
        sceneIndex: 0,
        beatId: 'b1',
        fetchImpl: fallback as unknown as typeof fetch,
      })
    ).rejects.toThrow('Gemini down')

    const failed = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Beat not found' }), { status: 404 })
    )
    await expect(
      requestOptimizedShotDirection({
        projectId: 'p1',
        sceneIndex: 0,
        beatId: 'b1',
        fetchImpl: failed as unknown as typeof fetch,
      })
    ).rejects.toThrow('Beat not found')
  })

  it('saves in shot order even when requests finish out of order, and counts failures', async () => {
    const shots = [beat('s1', 0), beat('s2', 1), beat('s3', 2), beat('s4', 3)]
    const delays: Record<string, number> = { s1: 30, s2: 5, s3: 15, s4: 1 }
    const saved: string[] = []
    const progress: number[] = []
    const result = await runShotDirectionAgent({
      shots,
      concurrency: 3,
      requestPatch: (shot) =>
        new Promise((resolve, reject) =>
          setTimeout(
            () =>
              shot.beatId === 's3'
                ? reject(new Error('blocked'))
                : resolve({ frozenMoment: `${shot.beatId} rewritten` }),
            delays[shot.beatId]
          )
        ),
      savePatch: (shot) => saved.push(shot.beatId),
      onProgress: (done) => progress.push(done),
    })
    expect(saved).toEqual(['s1', 's2', 's4'])
    expect(result).toEqual({ optimized: 3, failed: 1, cancelled: false })
    expect(progress).toEqual([1, 2, 3, 4])
  })

  it('stops saving once cancelled', async () => {
    const controller = new AbortController()
    const saved: string[] = []
    const result = await runShotDirectionAgent({
      shots: [beat('s1', 0), beat('s2', 1), beat('s3', 2)],
      concurrency: 1,
      signal: controller.signal,
      requestPatch: async (shot) => {
        if (shot.beatId === 's2') controller.abort()
        return { frozenMoment: 'x' }
      },
      savePatch: (shot) => saved.push(shot.beatId),
    })
    expect(saved).toEqual(['s1'])
    expect(result.cancelled).toBe(true)
  })

  it('saves through the Direct Shot save and recomputes the still prompt', () => {
    const scenes = [{ id: 'scene-a', beats: [beat('a1', 0), beat('a2', 1)] }]
    const next = saveDirectorPatchToScenes({
      scenes,
      sceneIdx: 0,
      beatId: 'a2',
      patch: {
        shotType: 'Close-Up',
        frozenMoment: 'Elara presses her palm flat against the cold glass',
        actionDescription: 'Elara steps to the window. She presses her palm flat against the glass.',
      },
      referenceSelection: noSelection,
      objectReferences: [],
    })
    const [first, second] = getSceneBeats(next[0])
    expect(first.beatDirection?.shotType).toBe('Medium Shot')
    expect(second.beatDirection).toMatchObject({
      shotType: 'Close-Up',
      frozenMoment: 'Elara presses her palm flat against the cold glass',
      generatedBy: 'user',
    })
    expect(second.actionDescription).toContain('presses her palm flat')
    expect(second.storyboardImagePrompt).toContain('palm flat against the cold glass')
    expect(scenes[0].beats[1].beatDirection?.shotType).toBe('Medium Shot')
  })

  it('is the save the Direct Shot dialog uses', () => {
    expect(read('src/components/vision/BeatDirectionEditor.tsx')).toContain(
      'saveDirectorPatchToScenes({'
    )
    const panel = read('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain('saveDirectorPatchToScenes({')
    expect(panel).toContain('Shot Direction Agent')
  })

  it('keeps its name out of machine translation', () => {
    expect(GLOSSARY_TERMS).toContain('Shot Direction Agent')
    const { protectedText } = protectGlossary('Run Shot Direction Agent before Stills Agent.')
    expect(protectedText).not.toContain('Shot Direction Agent')
    expect(protectedText).not.toContain('Stills Agent')
  })
})

describe('promo audio mix', () => {
  it('keeps the music bed under the clip and ducks it further for spoken shots', () => {
    expect(PROMO_AUDIO_MIX.clip).toBeGreaterThan(PROMO_AUDIO_MIX.music)
    expect(PROMO_AUDIO_MIX.narration).toBe(1.5)
    expect(PROMO_AUDIO_MIX.narration).toBeGreaterThan(PROMO_AUDIO_MIX.clip)
    expect(PROMO_AUDIO_MIX.music).toBeLessThanOrEqual(0.25)
    expect(PROMO_AUDIO_MIX.musicDucked).toBeLessThan(PROMO_AUDIO_MIX.music)
  })

  it('plays clip sound in the preview with no caption over the frame', () => {
    const source = read('src/components/publishing/PromoCutPreview.tsx')
    const video = source.slice(source.indexOf('<video'), source.indexOf('/>', source.indexOf('<video')))
    expect(video).not.toMatch(/\bmuted\b/)
    expect(source).toContain('video.volume = PROMO_AUDIO_MIX.clip')
    expect(source).toContain('promoPreviewMusicVolume')
    expect(source).toContain("shelf.type = 'lowshelf'")
    expect(source).toContain('shelf.frequency.value = PROMO_NARRATION_BASS_HZ')
    expect(source).toContain('shelf.gain.value = PROMO_NARRATION_BASS_DB')
    expect(source).toContain('gain.gain.value = PROMO_AUDIO_MIX.narration')
    expect(source).toContain('crossOrigin="anonymous"')
    expect(source).toContain('narration.volume = 1')
    const resumeAt = source.indexOf('context.resume()')
    const connectAt = source.indexOf('createMediaElementSource')
    expect(resumeAt).toBeGreaterThan(-1)
    expect(connectAt).toBeGreaterThan(resumeAt)
    expect(source).not.toMatch(
      /useEffect\(\(\) => \{[\s\S]*?createMediaElementSource[\s\S]*?\}, \[narrationUrl\]\)/
    )
    const tab = read('src/components/publishing/PublishingPromoTab.tsx')
    expect(tab).toContain('previewRef.current?.start()')
    expect(promoPreviewMusicVolume({ beatKind: 'dialogue' })).toBe(PROMO_AUDIO_MIX.musicDucked)
    expect(promoPreviewMusicVolume({ beatKind: 'narration' })).toBe(PROMO_AUDIO_MIX.musicDucked)
    expect(promoPreviewMusicVolume({ beatKind: 'action' })).toBe(PROMO_AUDIO_MIX.music)
    expect(source).not.toContain('{index + 1}/{shots.length}')
  })

  it('renders the trailer with the same mix and clip audio on', () => {
    const route = read('src/app/api/publish/trailer/render/route.ts')
    expect(route).toContain('includeSegmentAudio: true')
    expect(route).toContain('segmentAudioVolume: PROMO_AUDIO_MIX.clip')
    expect(route).toContain('audioVolume: PROMO_AUDIO_MIX.clip')
    expect(route).toContain('musicVolume: PROMO_AUDIO_MIX.music')
    expect(route).toContain('narrationVolume: PROMO_AUDIO_MIX.narration')
    expect(route).toContain('textOverlays: []')
    expect(route).not.toContain('0.35')
  })

  it('keeps the shot list thumbnails muted', () => {
    expect(read('src/components/publishing/PublishingPromoTab.tsx')).toMatch(/<video[\s\S]*?muted/)
  })
})
