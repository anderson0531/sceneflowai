import { describe, it, expect } from 'vitest'
import { buildProductionMusicCueClips } from '@/lib/scene/productionMusicCues'
import {
  buildAudioTracksForLanguage,
  flattenAudioTracks,
} from '@/components/vision/scene-production/audioTrackBuilder'

const DREAD_URL = 'https://blob.example.com/dread.wav'
const VIOLENCE_URL = 'https://blob.example.com/violence.wav'
const LEGACY_URL = 'https://blob.example.com/scene-loop.wav'

function cueScene(overrides?: {
  cues?: Record<string, unknown>[]
  beats?: Record<string, unknown>[]
  musicAudio?: string
}) {
  const scene: Record<string, unknown> = {
    beats:
      overrides?.beats ??
      ['bt_a1', 'bt_a2', 'bt_a3', 'bt_a4'].map((beatId) => ({
        beatId,
        kind: 'action',
        actionDescription: beatId,
        durationSeconds: 4,
      })),
    sceneMusicCues:
      overrides?.cues ?? [
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

/** One production segment per beat, 10s apiece, as deriveSegmentsFromBeats makes them. */
function beatSegments() {
  return ['bt_a1', 'bt_a2', 'bt_a3', 'bt_a4'].map((beatId, index) => ({
    beatId,
    sequenceIndex: index,
    startTime: index * 10,
    endTime: index * 10 + 10,
  }))
}

describe('buildProductionMusicCueClips', () => {
  it('spans each cue across the segments carrying its beats', () => {
    const clips = buildProductionMusicCueClips(cueScene(), beatSegments())

    expect(clips).toHaveLength(2)
    expect(clips[0]).toMatchObject({
      id: 'music-cue-0-1',
      url: DREAD_URL,
      startTime: 0,
      duration: 20,
      label: 'rising dread',
    })
    expect(clips[1]).toMatchObject({
      id: 'music-cue-2-3',
      url: VIOLENCE_URL,
      startTime: 20,
      duration: 20,
    })
  })

  it('follows the beats rather than segment order after a reorder', () => {
    // Segments were reordered so the cue's beats now sit last on the timeline.
    const reordered = [
      { beatId: 'bt_a3', sequenceIndex: 0, startTime: 0, endTime: 10 },
      { beatId: 'bt_a4', sequenceIndex: 1, startTime: 10, endTime: 20 },
      { beatId: 'bt_a1', sequenceIndex: 2, startTime: 20, endTime: 30 },
      { beatId: 'bt_a2', sequenceIndex: 3, startTime: 30, endTime: 40 },
    ]

    const clips = buildProductionMusicCueClips(cueScene(), reordered)

    const dread = clips.find((clip) => clip.url === DREAD_URL)
    expect(dread).toMatchObject({ startTime: 20, duration: 20 })
  })

  it('loops a cue whose window outruns its file', () => {
    const clips = buildProductionMusicCueClips(
      cueScene({
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
      }),
      beatSegments()
    )

    expect(clips).toHaveLength(1)
    expect(clips[0].duration).toBe(40)
    expect(clips[0].loop).toBe(true)
  })

  it('drops a beat the user switched off and keeps the rest of the cue', () => {
    const clips = buildProductionMusicCueClips(
      cueScene({
        beats: [
          { beatId: 'bt_a1', kind: 'action', durationSeconds: 4 },
          { beatId: 'bt_a2', kind: 'action', durationSeconds: 4, musicEnabled: false },
          { beatId: 'bt_a3', kind: 'action', durationSeconds: 4 },
          { beatId: 'bt_a4', kind: 'action', durationSeconds: 4 },
        ],
      }),
      beatSegments()
    )

    const dread = clips.find((clip) => clip.url === DREAD_URL)
    expect(dread).toMatchObject({ startTime: 0, duration: 10 })
  })

  it('returns nothing when no cue has been generated, so the legacy track can play', () => {
    const clips = buildProductionMusicCueClips(
      cueScene({
        cues: [
          {
            cueId: 'cue-0-1',
            beatStart: 0,
            beatEnd: 1,
            description: 'Cinematic orchestral score, ominous mood, slow tempo',
          },
        ],
      }),
      beatSegments()
    )

    expect(clips).toEqual([])
  })

  it('returns nothing without segments to place the cue against', () => {
    expect(buildProductionMusicCueClips(cueScene(), [])).toEqual([])
  })
})

describe('production Screening Room music tracks', () => {
  it('reaches the player as music clips for a cue-only scene', () => {
    const tracks = buildAudioTracksForLanguage(cueScene(), 'en', {
      beatSegments: beatSegments(),
    })

    expect(tracks.music).toBeNull()
    expect(tracks.musicCues.map((clip) => clip.url)).toEqual([DREAD_URL, VIOLENCE_URL])

    const flattened = flattenAudioTracks(tracks)
    const musicClips = flattened.filter((clip) => clip.id.startsWith('music'))
    expect(musicClips.map((clip) => clip.url)).toEqual([DREAD_URL, VIOLENCE_URL])
  })

  it('keeps the single looping track for a scene written before cues existed', () => {
    const tracks = buildAudioTracksForLanguage(
      { beats: [{ beatId: 'bt_a1', kind: 'action' }], musicAudio: LEGACY_URL },
      'en',
      { beatSegments: beatSegments() }
    )

    expect(tracks.musicCues).toEqual([])
    expect(tracks.music?.url).toBe(LEGACY_URL)
    expect(tracks.music?.loop).toBe(true)
  })

  it('does not loop a scene-length file that already covers the timeline', () => {
    const tracks = buildAudioTracksForLanguage(
      {
        beats: [{ beatId: 'bt_a1', kind: 'action' }],
        musicAudio: LEGACY_URL,
        musicFileDuration: 90,
      },
      'en',
      { beatSegments: beatSegments() }
    )

    expect(tracks.music?.actualDuration).toBe(90)
    expect(tracks.music?.loop).toBe(false)
  })

  it('lets scored cues replace the legacy scene-wide loop', () => {
    const tracks = buildAudioTracksForLanguage(
      cueScene({ musicAudio: LEGACY_URL }),
      'en',
      { beatSegments: beatSegments() }
    )

    expect(tracks.music).toBeNull()
    expect(tracks.musicCues).toHaveLength(2)
  })

  it('falls back to the legacy loop when the player has no segments yet', () => {
    const tracks = buildAudioTracksForLanguage(cueScene({ musicAudio: LEGACY_URL }), 'en')

    expect(tracks.musicCues).toEqual([])
    expect(tracks.music?.url).toBe(LEGACY_URL)
  })
})
