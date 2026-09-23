import { describe, it, expect } from 'vitest'
import { applyAudioAssetsToScene } from '@/lib/sceneGeneration/generateAudio'
import type { SceneAudioResult } from '@/lib/sceneGeneration/types'
import {
  DEFAULT_REQUESTED_DURATION_SEC,
  LYRIA_3_PRO_MODEL,
  resolveMusicRequestDuration,
  selectLyriaModel,
} from '@/lib/audio/lyriaClient'
import {
  deriveSceneMusicCues,
  estimateSceneBeatDuration,
} from '@/lib/script/sceneMusicCues'
import {
  buildBeatAlignedMusicClips,
  resolveSceneMusicFileDuration,
} from '@/lib/storyboard/musicPlayback'
import { buildBeatFirstPlaybackTimeline } from '@/lib/storyboard/types'
import {
  mergeSceneTrustingIncomingAudio,
  mergeScenePreservingAudio,
} from '@/lib/audio/cleanupAudio'
import type { SceneBeat, SceneMovement } from '@/lib/script/segmentTypes'

const MUSIC_URL = 'https://blob.example.com/scene-music.mp3'

function musicResult(
  overrides: Partial<{ durationSeconds: number | null; requestedDurationSeconds: number }> = {}
): SceneAudioResult {
  return {
    assets: [
      {
        audioType: 'music',
        audioUrl: MUSIC_URL,
        durationSeconds: 184,
        requestedDurationSeconds: 184,
        ...overrides,
      },
    ],
    counts: { narration: 0, dialogue: 0, music: 1, sfx: 0 },
  }
}

describe('a generated music track records how long it is', () => {
  it('persists the probed file length and the play span it was built for', () => {
    const scene: Record<string, unknown> = {}

    applyAudioAssetsToScene(scene, 'en', musicResult())

    expect(scene.musicAudio).toBe(MUSIC_URL)
    expect(scene.musicFileDuration).toBe(184)
    expect(scene.musicDuration).toBe(184)
  })

  it('leaves the file length unset when the probe came back empty', () => {
    const scene: Record<string, unknown> = {}

    applyAudioAssetsToScene(scene, 'en', musicResult({ durationSeconds: null }))

    expect(scene.musicAudio).toBe(MUSIC_URL)
    expect(scene.musicFileDuration).toBeUndefined()
  })

  it('stops the mixer looping a track that already covers the scene', () => {
    const scene: Record<string, unknown> = {}
    applyAudioAssetsToScene(scene, 'en', musicResult({ durationSeconds: 150 }))

    expect(resolveSceneMusicFileDuration(scene)).toBe(150)

    const clips = buildBeatAlignedMusicClips(scene, [], {
      musicUrl: MUSIC_URL,
      sceneDuration: 120,
      musicFileDuration: resolveSceneMusicFileDuration(scene),
    })

    expect(clips[0].loop).toBe(false)
  })

  it('still loops when the track really is shorter than the scene', () => {
    const scene: Record<string, unknown> = {}
    applyAudioAssetsToScene(scene, 'en', musicResult({ durationSeconds: 30 }))

    const clips = buildBeatAlignedMusicClips(scene, [], {
      musicUrl: MUSIC_URL,
      sceneDuration: 120,
      musicFileDuration: resolveSceneMusicFileDuration(scene),
    })

    expect(clips[0].loop).toBe(true)
  })

  it('keeps the file length attached to the URL across an audio merge', () => {
    const canonical = { musicAudio: MUSIC_URL, musicFileDuration: 184, musicDuration: 184 }

    expect(mergeScenePreservingAudio(canonical, { heading: 'INT. VAULT - NIGHT' })).toMatchObject({
      musicAudio: MUSIC_URL,
      musicFileDuration: 184,
    })
    expect(mergeSceneTrustingIncomingAudio(canonical, { heading: 'INT. VAULT - NIGHT' })).toMatchObject(
      { musicAudio: MUSIC_URL, musicFileDuration: 184 }
    )
  })
})

describe('the requested music length follows the beat timeline', () => {
  function timedBeats(count: number, seconds: number): SceneBeat[] {
    return Array.from({ length: count }, (_, index) => ({
      beatId: `b${index}`,
      sequenceIndex: index,
      kind: 'action' as const,
      actionDescription: `Beat ${index + 1}`,
      durationSeconds: seconds,
    }))
  }

  it('sums measured beats, assuming the animatic hold for unmeasured ones', () => {
    expect(estimateSceneBeatDuration(timedBeats(15, 8))).toBe(155)
    expect(estimateSceneBeatDuration([])).toBe(0)
    expect(
      estimateSceneBeatDuration([
        { beatId: 'b0', sequenceIndex: 0, kind: 'action', durationSeconds: 10 },
        { beatId: 'b1', sequenceIndex: 1, kind: 'action' },
      ])
    ).toBe(21)
  })

  it('prefers the beat timeline over the script’s own duration estimate', () => {
    expect(resolveMusicRequestDuration({ duration: 40, beats: timedBeats(15, 8) })).toBe(155)
  })

  it('does not let a stored 30-second musicDuration override the beat span', () => {
    const beats = timedBeats(10, 8)
    const span = resolveMusicRequestDuration({
      musicDuration: 30,
      duration: 40,
      beats,
    })
    expect(span).toBe(estimateSceneBeatDuration(beats))
    expect(span).toBeGreaterThan(30)
    expect(selectLyriaModel(span)).toBe(LYRIA_3_PRO_MODEL)
  })

  it('uses a measured voice clip when it is longer than the animatic hold', () => {
    const voiceUrl = 'https://example.com/maya.mp3'
    const beats: SceneBeat[] = [
      {
        beatId: 'b0',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Maya',
        line: 'I am not going anywhere.',
        lineId: 'ln_1',
        audioUrl: voiceUrl,
        durationSeconds: 18,
      },
    ]
    const scene = {
      beats,
      dialogue: [
        {
          lineId: 'ln_1',
          character: 'Maya',
          line: 'I am not going anywhere.',
          kind: 'dialogue',
          audioUrl: voiceUrl,
          duration: 18,
        },
      ],
    }
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {}, {
      preVisAnimatic: true,
    })
    const play = Math.round(visualFrames[0].startTime + visualFrames[0].duration)
    expect(play).toBeGreaterThanOrEqual(18)
    expect(estimateSceneBeatDuration(beats, scene)).toBe(play)
  })

  it('matches the Screening Room timeline for beats 1-10', () => {
    const beats = timedBeats(10, 8)
    const scene = { beats }
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {}, {
      preVisAnimatic: true,
    })
    const first = visualFrames[0]
    const last = visualFrames[visualFrames.length - 1]
    const play = Math.round(last.startTime + last.duration - first.startTime)
    expect(estimateSceneBeatDuration(beats, scene)).toBe(play)
    expect(selectLyriaModel(play)).toBe(LYRIA_3_PRO_MODEL)
  })

  it('does not loop a cue whose file covers that timeline', () => {
    const beats = timedBeats(10, 8).map((beat) => ({ ...beat, musicEnabled: true }))
    const play = estimateSceneBeatDuration(beats)
    const scene = {
      beats,
      sceneMusicCues: [
        {
          cueId: 'cue-1',
          beatStart: 0,
          beatEnd: 9,
          description: 'Cinematic strings, slow, ominous',
          intent: 'dread',
          url: MUSIC_URL,
          fileDuration: play,
          generatedBy: 'llm' as const,
        },
      ],
    }
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {}, {
      preVisAnimatic: true,
    })
    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: '',
      sceneDuration: play,
      cues: scene.sceneMusicCues,
      dynamicDurations: { [MUSIC_URL]: play },
    })
    expect(clips.length).toBeGreaterThan(0)
    expect(clips.every((clip) => clip.loop === false)).toBe(true)
  })

  it('falls back to the script estimate for a scene with no beats', () => {
    expect(resolveMusicRequestDuration({ duration: 72 })).toBe(72)
    expect(resolveMusicRequestDuration({ duration: 72, beats: [] })).toBe(72)
    expect(resolveMusicRequestDuration({})).toBe(DEFAULT_REQUESTED_DURATION_SEC)
  })
})

describe('derived cues score every charged movement', () => {
  function movement(
    index: number,
    beatStart: number,
    beatEnd: number,
    summary: string
  ): SceneMovement {
    return { index, summary, beatStart, beatEnd, generatedBy: 'derived' }
  }

  const OPENING_SUMMARY = 'A shape crosses the corridor.'
  const OPENING_ACTION = 'The menace closes in.'
  const LATER_SUMMARY = 'He strikes her down.'
  const LATER_ACTION = 'A brutal blow lands.'

  function scene(openingKind: SceneBeat['kind']): {
    beats: SceneBeat[]
    movements: SceneMovement[]
  } {
    return {
      beats: [
        {
          beatId: 'b0',
          sequenceIndex: 0,
          kind: openingKind,
          actionDescription: OPENING_ACTION,
          ...(openingKind === 'action' ? {} : { character: 'PIPER', line: 'Get down.' }),
        },
        {
          beatId: 'b1',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: LATER_ACTION,
        },
      ],
      movements: [movement(0, 0, 0, OPENING_SUMMARY), movement(1, 1, 1, LATER_SUMMARY)],
    }
  }

  it('scores a wordless charged opening and the later turn', () => {
    const { beats, movements } = scene('action')

    const cues = deriveSceneMusicCues({}, beats, movements)

    expect(cues.map((cue) => [cue.beatStart, cue.beatEnd])).toEqual([
      [0, 0],
      [1, 1],
    ])
  })

  it('scores a charged opening built on dialogue', () => {
    const { beats, movements } = scene('dialogue')

    const cues = deriveSceneMusicCues({}, beats, movements)

    expect(cues.map((cue) => cue.beatStart)).toEqual([0, 1])
  })

  it('scores a charged opening under narration', () => {
    const { beats, movements } = scene('narration')

    const cues = deriveSceneMusicCues({}, beats, movements)

    expect(cues.map((cue) => cue.beatStart)).toEqual([0, 1])
  })

  it('does not score a wordless opening that carries no emotion at all', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'b0',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'He files the paperwork.',
      },
      { beatId: 'b1', sequenceIndex: 1, kind: 'action', actionDescription: LATER_ACTION },
    ]
    const movements = [
      movement(0, 0, 0, 'He files the paperwork.'),
      movement(1, 1, 1, LATER_SUMMARY),
    ]

    const cues = deriveSceneMusicCues({}, beats, movements)

    expect(cues.map((cue) => cue.beatStart)).toEqual([1])
  })

  it('scores every charged movement, including when that covers the whole scene', () => {
    const { beats, movements } = scene('action')

    const cues = deriveSceneMusicCues({}, beats, movements)
    const scoredBeats = new Set(
      cues.flatMap((cue) =>
        Array.from({ length: cue.beatEnd - cue.beatStart + 1 }, (_, i) => cue.beatStart + i)
      )
    )

    expect(scoredBeats.size).toBe(beats.length)
  })
})

describe('the script prompt lets the model assign cue ranges', () => {
  it('states that a cue may cover every beat and that there is no cue-count cap', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/vision/generate-script-v2/route.ts'),
      'utf8'
    )

    expect(route).toContain('no maximum number of beats in a cue and no maximum number of cues')
    expect(route).toContain('every beat in the scene')
    expect(route).not.toContain('Score for CONTRAST, not for coverage')
    expect(route).not.toContain('OPENING ACTION is the one place a cue may start on beat 0')
  })
})
