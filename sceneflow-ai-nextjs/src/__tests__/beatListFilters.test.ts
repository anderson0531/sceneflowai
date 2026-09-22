import { describe, expect, it } from 'vitest'
import {
  beatFilterCharacters,
  beatIsReady,
  beatMatchesFilters,
  beatNeedsAction,
  type BeatListFacts,
} from '@/lib/vision/beatListFilters'
import {
  frameMatchesFilters,
  frameNeedsAction,
  type FrameListFacts,
} from '@/lib/vision/frameListFilters'
import { videoMatchesFilters, videoNeedsAction, type VideoClipFacts } from '@/lib/vision/videoClipFilters'
import {
  isSceneScoreEnabled,
  scoreToggleBeatIds,
  setBeatsMusicEnabled,
} from '@/lib/script/sceneMusicCues'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import { isCuedBeatMusicEnabled } from '@/lib/storyboard/musicPlayback'

function beat(partial: Partial<BeatListFacts> & Pick<BeatListFacts, 'beatId' | 'kind'>): BeatListFacts {
  return {
    excluded: false,
    hasAudio: false,
    promptChanged: false,
    needsSpeaker: false,
    tracksSfx: false,
    ...partial,
  }
}

describe('beatListFilters', () => {
  const dialogue = beat({
    beatId: 'd1',
    kind: 'dialogue',
    character: 'Ada',
    hasAudio: true,
  })
  const staleDialogue = beat({
    beatId: 'd2',
    kind: 'dialogue',
    character: 'Bea',
    hasAudio: true,
    promptChanged: true,
  })
  const silentDialogue = beat({
    beatId: 'd3',
    kind: 'dialogue',
    character: 'Ada',
    needsSpeaker: true,
  })
  const narration = beat({
    beatId: 'n1',
    kind: 'narration',
    character: 'Narrator',
  })
  const silentAction = beat({ beatId: 'a1', kind: 'action' })
  const sfxAction = beat({
    beatId: 'a2',
    kind: 'action',
    tracksSfx: true,
  })
  const readySfx = beat({
    beatId: 'a3',
    kind: 'action',
    tracksSfx: true,
    hasAudio: true,
  })
  const excluded = beat({
    beatId: 'd4',
    kind: 'dialogue',
    character: 'Ada',
    excluded: true,
  })

  const all = [dialogue, staleDialogue, silentDialogue, narration, silentAction, sfxAction, readySfx, excluded]

  it('treats missing, stale, and unassigned spoken beats as needing action', () => {
    expect(beatNeedsAction(dialogue)).toBe(false)
    expect(beatIsReady(dialogue)).toBe(true)
    expect(beatNeedsAction(staleDialogue)).toBe(true)
    expect(beatNeedsAction(silentDialogue)).toBe(true)
    expect(beatNeedsAction(narration)).toBe(true)
  })

  it('flags action beats only when they carry SFX work', () => {
    expect(beatNeedsAction(silentAction)).toBe(false)
    expect(beatIsReady(silentAction)).toBe(false)
    expect(beatNeedsAction(sfxAction)).toBe(true)
    expect(beatIsReady(readySfx)).toBe(true)
  })

  it('keeps excluded beats out of Needs action', () => {
    expect(beatNeedsAction(excluded)).toBe(false)
    expect(
      beatMatchesFilters(excluded, { attention: 'needs_action', type: 'all', character: 'all' })
    ).toBe(false)
    expect(beatMatchesFilters(excluded, { attention: 'all', type: 'all', character: 'all' })).toBe(true)
  })

  it('combines type and character filters', () => {
    const adaDialogue = all.filter((facts) =>
      beatMatchesFilters(facts, { attention: 'all', type: 'dialogue', character: 'Ada' })
    )
    expect(adaDialogue.map((facts) => facts.beatId)).toEqual(['d1', 'd3', 'd4'])
    expect(beatFilterCharacters(all)).toEqual(['Ada', 'Bea', 'Narrator'])
  })
})

describe('frame and video filters', () => {
  const finalFrame: FrameListFacts = {
    key: 'f1',
    kind: 'action',
    imageTier: 'final',
    isMissing: false,
    isPlaceholder: false,
    promptChanged: false,
    hasImageError: false,
    hasOwnImage: true,
  }
  const draftFrame: FrameListFacts = { ...finalFrame, key: 'f2', imageTier: 'draft', kind: 'dialogue' }
  const changed: FrameListFacts = { ...finalFrame, key: 'f3', promptChanged: true }

  it('treats anything short of a clean Final as needing action', () => {
    expect(frameNeedsAction(finalFrame)).toBe(false)
    expect(frameNeedsAction(draftFrame)).toBe(true)
    expect(frameNeedsAction(changed)).toBe(true)
    expect(frameMatchesFilters(draftFrame, 'draft', 'dialogue')).toBe(true)
    expect(frameMatchesFilters(draftFrame, 'draft', 'action')).toBe(false)
    expect(frameMatchesFilters(changed, 'prompt_changed', 'all')).toBe(true)
    expect(frameMatchesFilters({ ...finalFrame, isMissing: true, hasOwnImage: false }, 'missing', 'all')).toBe(
      true
    )
  })

  const complete: VideoClipFacts = { key: 'v1', status: 'complete', promptChanged: false, imageTier: 'final' }
  const stale: VideoClipFacts = { key: 'v2', status: 'complete', promptChanged: true, imageTier: 'draft' }
  const missing: VideoClipFacts = { key: 'v3', status: 'queued', promptChanged: false }

  it('flags unfinished and stale clips, and filters Final | Draft from the frame tier', () => {
    expect(videoNeedsAction(complete)).toBe(false)
    expect(videoNeedsAction(stale)).toBe(true)
    expect(videoNeedsAction(missing)).toBe(true)
    expect(videoMatchesFilters(missing, 'no_clip', 'all')).toBe(true)
    expect(videoMatchesFilters(stale, 'prompt_changed', 'draft')).toBe(true)
    expect(videoMatchesFilters(complete, 'in_the_can', 'final')).toBe(true)
    expect(videoMatchesFilters(complete, 'in_the_can', 'draft')).toBe(false)
    expect(videoMatchesFilters({ key: 'e', status: 'error', promptChanged: false }, 'error', 'all')).toBe(true)
  })
})

describe('scene score switch', () => {
  const beats: SceneBeat[] = [
    { beatId: 'b0', sequenceIndex: 0, kind: 'action' },
    { beatId: 'b1', sequenceIndex: 1, kind: 'dialogue', musicEnabled: false },
    { beatId: 'b2', sequenceIndex: 2, kind: 'action', musicEnabled: true },
  ]
  const cues: SceneMusicCue[] = [
    {
      cueId: 'cue-0-1',
      beatStart: 0,
      beatEnd: 1,
      description: 'Cinematic orchestral score, ominous mood',
      intent: 'rising dread',
    },
  ]

  it('defaults a cued beat with an unset flag to on', () => {
    expect(isCuedBeatMusicEnabled(beats[0])).toBe(true)
    expect(isSceneScoreEnabled(beats, cues)).toBe(false)
    expect(scoreToggleBeatIds(beats, cues)).toEqual(['b0', 'b1'])
  })

  it('writes music on or off only for the targeted beats', () => {
    const on = setBeatsMusicEnabled(beats, ['b0', 'b1'], true)
    expect(on.map((beat) => beat.musicEnabled)).toEqual([true, true, true])
    expect(isSceneScoreEnabled(on, cues)).toBe(true)
    const off = setBeatsMusicEnabled(on, scoreToggleBeatIds(on, cues), false)
    expect(off.map((beat) => beat.musicEnabled)).toEqual([false, false, true])
    expect(beats[2]).toBe(off[2])
  })
})
