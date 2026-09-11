import { describe, expect, it } from 'vitest'
import {
  applyAudioSlotToScene,
  applySceneEditAudioPolicy,
  clearAllSceneAudio,
  mergeScenePreservingAudio,
  removeStaleAudioUrlFromScene,
  sceneHasAudioRefs,
} from '@/lib/audio/cleanupAudio'

const CUE_URL = 'https://blob/cue-dread.wav'
const NEW_CUE_URL = 'https://blob/cue-dread-v2.wav'

function sceneWithCues(overrides: Record<string, unknown> = {}) {
  return {
    heading: 'INT. CONTROL ROOM - NIGHT',
    music: { description: 'Cinematic orchestral score, ominous mood, slow tempo' },
    sceneMusicCues: [
      {
        cueId: 'cue-0-2',
        beatStart: 0,
        beatEnd: 2,
        description: 'Cinematic orchestral score, ominous mood, slow tempo',
        intent: 'rising dread',
        url: CUE_URL,
        duration: 12,
        fileDuration: 30,
      },
      {
        cueId: 'cue-4-5',
        beatStart: 4,
        beatEnd: 5,
        description: 'Cinematic orchestral score, aggressive mood, driving tempo',
        intent: 'the turn into violence',
      },
    ],
    ...overrides,
  }
}

describe('applyAudioSlotToScene for a music cue', () => {
  it('writes the generated track onto the cue that asked for it', () => {
    const updated = applyAudioSlotToScene(sceneWithCues(), {
      sceneIndex: 0,
      audioType: 'music',
      audioUrl: 'https://blob/cue-violence.wav',
      musicCueId: 'cue-4-5',
      musicDuration: 8,
      musicFileDuration: 30,
    })

    expect(updated.sceneMusicCues[1].url).toBe('https://blob/cue-violence.wav')
    expect(updated.sceneMusicCues[1].duration).toBe(8)
    expect(updated.sceneMusicCues[1].fileDuration).toBe(30)
    expect(updated.sceneMusicCues[1].updatedAt).toBeTruthy()
  })

  it('leaves the other cues and the scene track untouched', () => {
    const updated = applyAudioSlotToScene(sceneWithCues({ musicAudio: 'https://blob/scene.wav' }), {
      sceneIndex: 0,
      audioType: 'music',
      audioUrl: NEW_CUE_URL,
      musicCueId: 'cue-0-2',
    })

    expect(updated.sceneMusicCues[0].url).toBe(NEW_CUE_URL)
    expect(updated.sceneMusicCues[1].url).toBeUndefined()
    expect(updated.musicAudio).toBe('https://blob/scene.wav')
  })

  it('still writes the scene track when the save names no cue', () => {
    const updated = applyAudioSlotToScene(sceneWithCues(), {
      sceneIndex: 0,
      audioType: 'music',
      audioUrl: 'https://blob/scene.wav',
      musicFileDuration: 30,
    })

    expect(updated.musicAudio).toBe('https://blob/scene.wav')
    expect(updated.sceneMusicCues[0].url).toBe(CUE_URL)
  })
})

describe('cue tracks in the scene audio lifecycle', () => {
  it('counts a cue track as generated audio the scene holds', () => {
    expect(sceneHasAudioRefs(sceneWithCues())).toBe(true)
    expect(
      sceneHasAudioRefs({
        sceneMusicCues: [{ cueId: 'cue-0-1', beatStart: 0, beatEnd: 1, description: 'x' }],
      })
    ).toBe(false)
  })

  it('keeps cue tracks when an edit is overlaid with audio preserved', () => {
    const merged = mergeScenePreservingAudio(sceneWithCues(), {
      heading: 'INT. CONTROL ROOM - DAY',
      sceneMusicCues: [],
    })

    expect(merged.heading).toBe('INT. CONTROL ROOM - DAY')
    expect(merged.sceneMusicCues[0].url).toBe(CUE_URL)
  })

  it('collects cue blobs for deletion when the music spec is rewritten', () => {
    const result = applySceneEditAudioPolicy(sceneWithCues(), {
      music: { description: 'Cinematic score, triumphant mood, bright brass, upbeat tempo' },
    })

    expect(result.deletedUrls).toContain(CUE_URL)
    expect(result.cleanedScene.sceneMusicCues[0].url).toBeUndefined()
    // The plan survives the track: the cue is still there to regenerate.
    expect(result.cleanedScene.sceneMusicCues[0].intent).toBe('rising dread')
  })

  it('keeps cue tracks when the music spec is unchanged', () => {
    const result = applySceneEditAudioPolicy(sceneWithCues(), { heading: 'INT. ROOM - DAY' })
    expect(result.deletedUrls).not.toContain(CUE_URL)
    expect(result.cleanedScene.sceneMusicCues[0].url).toBe(CUE_URL)
  })

  it('clears cue tracks along with the rest of the scene audio', () => {
    const result = clearAllSceneAudio(sceneWithCues({ musicAudio: 'https://blob/scene.wav' }))

    expect(result.deletedUrls).toEqual(
      expect.arrayContaining([CUE_URL, 'https://blob/scene.wav'])
    )
    expect(result.cleanedScene.sceneMusicCues[0].url).toBeUndefined()
  })

  it('drops a cue track that 404s without touching the cue itself', () => {
    const { cleanedScene, changed } = removeStaleAudioUrlFromScene(sceneWithCues(), CUE_URL)

    expect(changed).toBe(true)
    expect(cleanedScene.sceneMusicCues[0].url).toBeUndefined()
    expect(cleanedScene.sceneMusicCues[0].fileDuration).toBeUndefined()
    expect(cleanedScene.sceneMusicCues[0].cueId).toBe('cue-0-2')
  })
})
