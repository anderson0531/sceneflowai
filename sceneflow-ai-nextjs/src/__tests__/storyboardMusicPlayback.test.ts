import { describe, it, expect } from 'vitest'
import { buildBeatFirstPlaybackTimeline } from '@/lib/storyboard/types'
import {
  buildBeatAlignedMusicClips,
  buildStoryboardMusicClips,
  collectSceneMusicUrls,
  isBeatMusicEnabled,
  resolveMusicTrimStart,
} from '@/lib/storyboard/musicPlayback'

const SARAH_URL = 'https://example.com/sarah.mp3'
const MUSIC_URL = 'https://example.com/music.mp3'
const DREAD_URL = 'https://example.com/dread.wav'
const VIOLENCE_URL = 'https://example.com/violence.wav'

function buildBeatScene(overrides?: { beats?: Record<string, unknown>[] }) {
  return {
    imageUrl: 'https://example.com/est.jpg',
    musicAudio: MUSIC_URL,
    dialogue: [{ character: 'Sarah', line: 'Hello.' }],
    beats: overrides?.beats ?? [
      {
        beatId: 'bt_est',
        kind: 'action',
        actionDescription: 'Establishing shot',
        storyboardImageUrl: 'https://example.com/est.jpg',
        musicEnabled: true,
      },
      {
        beatId: 'bt_a1',
        kind: 'action',
        actionDescription: 'Sarah enters the room',
        musicEnabled: true,
      },
      {
        beatId: 'bt_a2',
        kind: 'action',
        actionDescription: 'Sarah looks around',
        musicEnabled: true,
      },
      {
        beatId: 'bt_d1',
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Hello.',
        audioUrl: SARAH_URL,
        durationSeconds: 3,
        musicEnabled: true,
      },
    ],
  }
}

describe('isBeatMusicEnabled', () => {
  it('defaults to disabled when musicEnabled is undefined', () => {
    expect(isBeatMusicEnabled({ beatId: 'x', sequenceIndex: 0, kind: 'action' })).toBe(false)
  })

  it('returns true only when explicitly enabled', () => {
    expect(
      isBeatMusicEnabled({
        beatId: 'x',
        sequenceIndex: 0,
        kind: 'action',
        musicEnabled: true,
      })
    ).toBe(true)
  })

  it('returns false when explicitly disabled', () => {
    expect(
      isBeatMusicEnabled({
        beatId: 'x',
        sequenceIndex: 0,
        kind: 'action',
        musicEnabled: false,
      })
    ).toBe(false)
  })
})

describe('resolveMusicTrimStart', () => {
  it('wraps scene timeline offsets modulo file duration', () => {
    expect(resolveMusicTrimStart(45, 30)).toBe(15)
    expect(resolveMusicTrimStart(0, 30)).toBe(0)
  })
})

describe('buildBeatAlignedMusicClips', () => {
  it('merges contiguous music-enabled beats into one looping scene clip', () => {
    const scene = buildBeatScene()
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 20,
      musicFileDuration: 30,
    })

    const enabledFrames = visualFrames.filter((frame) => frame.beatId)
    const firstFrame = enabledFrames[0]
    const lastFrame = enabledFrames[enabledFrames.length - 1]
    const expectedDuration = lastFrame.startTime + lastFrame.duration - firstFrame.startTime

    expect(clips).toHaveLength(1)
    expect(clips[0].id).toBe('music-scene')
    expect(clips[0].url).toBe(MUSIC_URL)
    expect(clips[0].startTime).toBe(firstFrame.startTime)
    expect(clips[0].duration).toBe(expectedDuration)
    expect(clips[0].trimStart).toBe(
      resolveMusicTrimStart(firstFrame.startTime, 30)
    )
    expect(clips[0].loop).toBe(true)
  })

  it('splits music into two clips when a middle beat disables music', () => {
    const scene = buildBeatScene({
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Sarah enters',
          musicEnabled: true,
        },
        {
          beatId: 'bt_a2',
          kind: 'action',
          actionDescription: 'Silent beat',
          musicEnabled: false,
        },
        {
          beatId: 'bt_d1',
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello.',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
          musicEnabled: true,
        },
      ],
    })

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 20,
      musicFileDuration: 30,
    })

    expect(clips).toHaveLength(2)
    expect(clips[0].id).toBe('music-bt_a1')
    expect(clips[1].id).toBe('music-bt_d1')
    expect(clips.some((clip) => clip.id === 'music-bt_a2')).toBe(false)
  })

  it('skips beats with musicEnabled false', () => {
    const scene = buildBeatScene({
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Sarah enters',
          musicEnabled: false,
        },
        {
          beatId: 'bt_d1',
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello.',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
          musicEnabled: true,
        },
      ],
    })

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 12,
      musicFileDuration: 30,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].id).toBe('music-bt_d1')
    expect(clips.some((clip) => clip.id === 'music-bt_a1')).toBe(false)
  })

  it('returns empty array when every beat disables music', () => {
    const scene = buildBeatScene({
      beats: [
        {
          beatId: 'bt_a1',
          kind: 'action',
          actionDescription: 'Silent action',
          musicEnabled: false,
        },
        {
          beatId: 'bt_d1',
          kind: 'dialogue',
          character: 'Sarah',
          line: 'Hello.',
          audioUrl: SARAH_URL,
          durationSeconds: 3,
          musicEnabled: false,
        },
      ],
    })

    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene, 'en', {
      [SARAH_URL]: 3,
    })

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl: MUSIC_URL,
      sceneDuration: 10,
      musicFileDuration: 30,
    })

    expect(clips).toHaveLength(0)
  })

  it('falls back to one full-scene looping clip for legacy scenes without beats', () => {
    const scene = { musicAudio: MUSIC_URL }

    const clips = buildBeatAlignedMusicClips(scene, [], {
      musicUrl: MUSIC_URL,
      sceneDuration: 30,
      musicFileDuration: 30,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].startTime).toBe(0)
    expect(clips[0].duration).toBe(30)
    expect(clips[0].loop).toBe(true)
  })

  it('wraps trimStart for a late beat beyond music file length', () => {
    const clips = buildBeatAlignedMusicClips(
      { beats: [{ beatId: 'bt_late', kind: 'action', musicEnabled: true }] },
      [
        {
          clipId: 'action-bt_late',
          beatId: 'bt_late',
          frameType: 'establishing',
          startTime: 45,
          duration: 8,
        },
      ],
      {
        musicUrl: MUSIC_URL,
        sceneDuration: 60,
        musicFileDuration: 30,
      }
    )

    expect(clips).toHaveLength(1)
    expect(clips[0].trimStart).toBe(15)
    expect(clips[0].loop).toBe(true)
  })
})

describe('buildStoryboardMusicClips', () => {
  it('returns empty when scene has no music URL', () => {
    const scene = buildBeatScene()
    delete (scene as { musicAudio?: string }).musicAudio

    const clips = buildStoryboardMusicClips(scene, [], 10)
    expect(clips).toHaveLength(0)
  })
})

/** Two cues over four beats: beats 0-1 scored one way, beats 2-3 another. */
function buildCueScene(overrides?: {
  cues?: Record<string, unknown>[]
  musicAudio?: string
  beats?: Record<string, unknown>[]
}) {
  const scene: Record<string, unknown> = {
    beats:
      overrides?.beats ??
      ['bt_a1', 'bt_a2', 'bt_a3', 'bt_a4'].map((beatId) => ({
        beatId,
        kind: 'action',
        actionDescription: beatId,
        durationSeconds: 4,
        musicEnabled: true,
      })),
    sceneMusicCues: overrides?.cues ?? [
      {
        cueId: 'cue-0-1',
        beatStart: 0,
        beatEnd: 1,
        description: 'Cinematic orchestral score, ominous mood, slow tempo',
        intent: 'rising dread',
        url: DREAD_URL,
        fileDuration: 30,
      },
      {
        cueId: 'cue-2-3',
        beatStart: 2,
        beatEnd: 3,
        description: 'Cinematic orchestral score, aggressive mood, driving tempo',
        intent: 'the turn into violence',
        url: VIOLENCE_URL,
        fileDuration: 30,
      },
    ],
  }
  if (overrides?.musicAudio) scene.musicAudio = overrides.musicAudio
  return scene
}

function frame(beatId: string, startTime: number, duration: number) {
  return {
    clipId: `action-${beatId}`,
    beatId,
    frameType: 'establishing' as const,
    startTime,
    duration,
  }
}

const cueFrames = [
  frame('bt_a1', 0, 4),
  frame('bt_a2', 4, 4),
  frame('bt_a3', 8, 4),
  frame('bt_a4', 12, 4),
]

describe('cue-scored scenes', () => {
  it('plays each cue’s own track over the beats it covers, from the top', () => {
    const clips = buildStoryboardMusicClips(buildCueScene(), cueFrames, 16)

    expect(clips).toHaveLength(2)
    expect(clips[0].url).toBe(DREAD_URL)
    expect(clips[0].startTime).toBe(0)
    expect(clips[0].duration).toBe(8)
    expect(clips[0].trimStart).toBe(0)
    expect(clips[0].label).toBe('rising dread')

    expect(clips[1].url).toBe(VIOLENCE_URL)
    expect(clips[1].startTime).toBe(8)
    expect(clips[1].duration).toBe(8)
    // The second cue is its own file, so it starts at its beginning rather
    // than wrapping a scene-wide offset the way one looped track would.
    expect(clips[1].trimStart).toBe(0)
    expect(clips[1].label).toBe('the turn into violence')
  })

  it('anchors each cue’s fade where that cue first sounds', () => {
    const clips = buildStoryboardMusicClips(buildCueScene(), cueFrames, 16)

    expect(clips[0].fadeAnchorTime).toBe(0)
    expect(clips[1].fadeAnchorTime).toBe(8)
  })

  it('loops a cue only when it outruns its own file', () => {
    const scene = buildCueScene({
      cues: [
        {
          cueId: 'cue-0-3',
          beatStart: 0,
          beatEnd: 3,
          description: 'Cinematic orchestral score, ominous mood, slow tempo',
          intent: 'rising dread',
          url: DREAD_URL,
          fileDuration: 10,
        },
      ],
    })

    const short = buildStoryboardMusicClips(scene, cueFrames, 16)
    expect(short[0].duration).toBe(16)
    expect(short[0].loop).toBe(true)

    const long = buildStoryboardMusicClips(
      buildCueScene({
        cues: [{ ...(scene.sceneMusicCues as Record<string, unknown>[])[0], fileDuration: 30 }],
      }),
      cueFrames,
      16
    )
    expect(long[0].loop).toBe(false)
  })

  it('prefers a probed file length over the one stored on the cue', () => {
    const scene = buildCueScene({
      cues: [
        {
          cueId: 'cue-0-3',
          beatStart: 0,
          beatEnd: 3,
          description: 'Cinematic orchestral score, ominous mood, slow tempo',
          url: DREAD_URL,
          fileDuration: 30,
        },
      ],
    })

    const clips = buildStoryboardMusicClips(scene, cueFrames, 16, undefined, {
      [DREAD_URL]: 9,
    })
    expect(clips[0].loop).toBe(true)
  })

  it('splits a cue into the runs that survive a beat switched off inside it', () => {
    const scene = buildCueScene({
      cues: [
        {
          cueId: 'cue-0-3',
          beatStart: 0,
          beatEnd: 3,
          description: 'Cinematic orchestral score, ominous mood, slow tempo',
          intent: 'rising dread',
          url: DREAD_URL,
          fileDuration: 30,
        },
      ],
      beats: [
        { beatId: 'bt_a1', kind: 'action', durationSeconds: 4, musicEnabled: true },
        { beatId: 'bt_a2', kind: 'action', durationSeconds: 4, musicEnabled: false },
        { beatId: 'bt_a3', kind: 'action', durationSeconds: 4, musicEnabled: true },
        { beatId: 'bt_a4', kind: 'action', durationSeconds: 4, musicEnabled: true },
      ],
    })

    const clips = buildStoryboardMusicClips(scene, cueFrames, 16)

    expect(clips).toHaveLength(2)
    expect(clips.every((clip) => clip.url === DREAD_URL)).toBe(true)
    expect(clips[0].startTime).toBe(0)
    expect(clips[1].startTime).toBe(8)
    // Both runs belong to one cue, so the fade still opens where it began.
    expect(clips.every((clip) => clip.fadeAnchorTime === 0)).toBe(true)
  })

  it('skips a cue that has not been generated yet', () => {
    const clips = buildStoryboardMusicClips(
      buildCueScene({
        cues: [
          {
            cueId: 'cue-0-1',
            beatStart: 0,
            beatEnd: 1,
            description: 'Cinematic orchestral score, ominous mood, slow tempo',
          },
          {
            cueId: 'cue-2-3',
            beatStart: 2,
            beatEnd: 3,
            description: 'Cinematic orchestral score, aggressive mood, driving tempo',
            url: VIOLENCE_URL,
          },
        ],
      }),
      cueFrames,
      16
    )

    expect(clips).toHaveLength(1)
    expect(clips[0].url).toBe(VIOLENCE_URL)
  })

  it('falls back to the scene track for an enabled beat no cue covers', () => {
    const clips = buildStoryboardMusicClips(
      buildCueScene({
        musicAudio: MUSIC_URL,
        cues: [
          {
            cueId: 'cue-0-1',
            beatStart: 0,
            beatEnd: 1,
            description: 'Cinematic orchestral score, ominous mood, slow tempo',
            url: DREAD_URL,
            fileDuration: 30,
          },
        ],
      }),
      cueFrames,
      16
    )

    expect(clips.map((clip) => clip.url)).toEqual([DREAD_URL, MUSIC_URL])
    expect(clips[1].startTime).toBe(8)
  })

  it('plays nothing for an uncovered beat when the scene has no track of its own', () => {
    const clips = buildStoryboardMusicClips(
      buildCueScene({
        cues: [
          {
            cueId: 'cue-0-1',
            beatStart: 0,
            beatEnd: 1,
            description: 'Cinematic orchestral score, ominous mood, slow tempo',
            url: DREAD_URL,
          },
        ],
      }),
      cueFrames,
      16
    )

    expect(clips).toHaveLength(1)
    expect(clips[0].url).toBe(DREAD_URL)
  })
})

describe('collectSceneMusicUrls', () => {
  it('lists every file the scene can play so their lengths can be probed', () => {
    expect(collectSceneMusicUrls(buildCueScene({ musicAudio: MUSIC_URL }))).toEqual([
      DREAD_URL,
      VIOLENCE_URL,
      MUSIC_URL,
    ])
  })

  it('ignores cues with no generated track', () => {
    expect(
      collectSceneMusicUrls(
        buildCueScene({
          cues: [
            {
              cueId: 'cue-0-1',
              beatStart: 0,
              beatEnd: 1,
              description: 'Cinematic orchestral score, ominous mood, slow tempo',
            },
          ],
        })
      )
    ).toEqual([])
  })
})
