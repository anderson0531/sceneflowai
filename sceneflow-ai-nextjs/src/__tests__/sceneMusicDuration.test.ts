import { describe, it, expect } from 'vitest'
import { applyAudioAssetsToScene } from '@/lib/sceneGeneration/generateAudio'
import type { SceneAudioResult } from '@/lib/sceneGeneration/types'
import {
  DEFAULT_REQUESTED_DURATION_SEC,
  resolveMusicRequestDuration,
} from '@/lib/audio/lyriaClient'
import {
  deriveSceneMusicCues,
  estimateSceneBeatDuration,
} from '@/lib/script/sceneMusicCues'
import {
  buildBeatAlignedMusicClips,
  resolveSceneMusicFileDuration,
} from '@/lib/storyboard/musicPlayback'
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
    expect(estimateSceneBeatDuration(timedBeats(15, 8))).toBe(120)
    expect(estimateSceneBeatDuration([])).toBe(0)
    expect(
      estimateSceneBeatDuration([
        { beatId: 'b0', sequenceIndex: 0, kind: 'action', durationSeconds: 10 },
        { beatId: 'b1', sequenceIndex: 1, kind: 'action' },
      ])
    ).toBe(14)
  })

  it('prefers the beat timeline over the script’s own duration estimate', () => {
    expect(resolveMusicRequestDuration({ duration: 40, beats: timedBeats(15, 8) })).toBe(120)
  })

  it('still lets the Play duration control win outright', () => {
    expect(
      resolveMusicRequestDuration({ musicDuration: 95, duration: 40, beats: timedBeats(15, 8) })
    ).toBe(95)
  })

  it('falls back to the script estimate for a scene with no beats', () => {
    expect(resolveMusicRequestDuration({ duration: 72 })).toBe(72)
    expect(resolveMusicRequestDuration({ duration: 72, beats: [] })).toBe(72)
    expect(resolveMusicRequestDuration({})).toBe(DEFAULT_REQUESTED_DURATION_SEC)
  })
})

describe('an opening that plays wordless can carry the cue', () => {
  function movement(
    index: number,
    beatStart: number,
    beatEnd: number,
    summary: string
  ): SceneMovement {
    return { index, summary, beatStart, beatEnd, generatedBy: 'derived' }
  }

  /**
   * Two movements, so the budget is one cue and exactly one of them wins.
   *
   * The opening reads a single dread word and the second movement two
   * violence words, which puts the later movement ahead on its own charge
   * plus the turn into it. The opening only takes the cue if it is credited
   * with the turn out of silence, so switching beat 0's kind is the whole
   * difference between the two outcomes below.
   */
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

  it('scores a wordless opening on the turn out of silence', () => {
    const { beats, movements } = scene('action')

    const cues = deriveSceneMusicCues({}, beats, movements)

    expect(cues.map((cue) => cue.beatStart)).toEqual([0])
  })

  it('leaves an opening built on dialogue to the contrast rule', () => {
    const { beats, movements } = scene('dialogue')

    const cues = deriveSceneMusicCues({}, beats, movements)

    expect(cues.map((cue) => cue.beatStart)).toEqual([1])
  })

  it('treats an opening under narration as spoken', () => {
    const { beats, movements } = scene('narration')

    const cues = deriveSceneMusicCues({}, beats, movements)

    expect(cues.map((cue) => cue.beatStart)).toEqual([1])
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

  it('still leaves a movement dry rather than scoring the whole scene', () => {
    const { beats, movements } = scene('action')

    const cues = deriveSceneMusicCues({}, beats, movements)
    const scoredBeats = new Set(
      cues.flatMap((cue) =>
        Array.from({ length: cue.beatEnd - cue.beatStart + 1 }, (_, i) => cue.beatStart + i)
      )
    )

    expect(scoredBeats.size).toBeLessThan(beats.length)
  })
})

describe('the cue policy names the opening-action pattern', () => {
  it('is stated alongside the contrast rule in the script prompt', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/vision/generate-script-v2/route.ts'),
      'utf8'
    )

    expect(route).toContain('Score for CONTRAST, not for coverage')
    expect(route).toContain('OPENING ACTION is the one place a cue may start on beat 0')
    expect(route).toMatch(/an opening built on dialogue takes the contrast rule/i)
  })
})
