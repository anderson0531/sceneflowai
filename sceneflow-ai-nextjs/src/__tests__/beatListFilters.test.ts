import { describe, expect, it } from 'vitest'
import { beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import type { BeatDirection, SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import {
  beatFilterCharacters,
  beatIsReady,
  beatMatchesFilters,
  beatNeedsAction,
  beatRailStatus,
  type BeatListFacts,
} from '@/lib/vision/beatListFilters'
import { directionRailStatus } from '@/lib/vision/directionRailStatus'
import {
  frameMatchesFilters,
  frameNeedsAction,
  frameRailStatus,
  frameReferenceNotice,
  type FrameListFacts,
} from '@/lib/vision/frameListFilters'
import {
  clipFailureTooltip,
  isContentPolicyFailureMessage,
  videoMatchesFilters,
  videoNeedsAction,
  videoRailStatus,
  type VideoClipFacts,
} from '@/lib/vision/videoClipFilters'
import {
  isSceneScoreEnabled,
  scoreToggleBeatIds,
  setBeatsMusicEnabled,
} from '@/lib/script/sceneMusicCues'
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

  it('lights audio red when a take is missing, yellow when it is stale, and green when it is in sync', () => {
    expect(beatRailStatus(silentAction)).toEqual({ status: 'idle', label: '' })
    expect(beatRailStatus(sfxAction)).toEqual({ status: 'action', label: 'No audio' })
    expect(beatRailStatus(narration)).toEqual({ status: 'action', label: 'No audio' })
    expect(beatRailStatus(silentDialogue)).toEqual({ status: 'action', label: 'No audio' })
    expect(beatRailStatus(excluded)).toEqual({ status: 'action', label: 'No audio' })
    expect(beatRailStatus(staleDialogue)).toEqual({ status: 'attention', label: 'Prompt changed' })
    expect(
      beatRailStatus(
        beat({
          beatId: 'd5',
          kind: 'dialogue',
          hasAudio: true,
          needsSpeaker: true,
        })
      )
    ).toEqual({ status: 'attention', label: 'Needs speaker' })
    expect(
      beatRailStatus(
        beat({
          beatId: 'd6',
          kind: 'dialogue',
          hasAudio: true,
          promptChanged: true,
          needsSpeaker: true,
        })
      )
    ).toEqual({ status: 'attention', label: 'Prompt changed' })
    expect(beatRailStatus(dialogue)).toEqual({ status: 'ready', label: 'Ready' })
    expect(beatRailStatus(readySfx)).toEqual({ status: 'ready', label: 'Ready' })
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

  it('lights stills red unless they are a draft, a prompt warning, or a clean final', () => {
    const placeholder: FrameListFacts = {
      ...finalFrame,
      key: 'ph',
      imageTier: undefined,
      isPlaceholder: true,
      hasOwnImage: false,
    }
    const missingFrame: FrameListFacts = {
      ...finalFrame,
      key: 'ms',
      imageTier: undefined,
      isMissing: true,
      hasOwnImage: false,
    }
    const errored: FrameListFacts = { ...draftFrame, key: 'er', hasImageError: true }

    expect(frameRailStatus(placeholder)).toEqual({ status: 'action', label: 'Placeholder' })
    expect(frameRailStatus(missingFrame)).toEqual({ status: 'action', label: 'Missing' })
    expect(frameRailStatus(errored)).toEqual({ status: 'action', label: 'Error' })
    expect(frameRailStatus(draftFrame)).toEqual({ status: 'attention', label: 'Draft' })
    expect(frameRailStatus({ ...draftFrame, promptChanged: true })).toEqual({
      status: 'attention',
      label: 'Prompt changed',
    })
    expect(frameRailStatus(changed)).toEqual({ status: 'attention', label: 'Prompt changed' })
    expect(frameRailStatus(finalFrame)).toEqual({ status: 'ready', label: 'Final' })
    expect(frameRailStatus({ ...finalFrame, referenceStatus: 'pass' })).toEqual({
      status: 'ready',
      label: 'Final',
    })
    expect(frameRailStatus({ ...finalFrame, referenceStatus: 'drift' })).toEqual({
      status: 'attention',
      label: 'Reference drifted',
    })
    expect(frameRailStatus({ ...finalFrame, referenceStatus: 'miss' })).toEqual({
      status: 'action',
      label: 'Reference missed',
    })
    expect(frameNeedsAction({ ...finalFrame, referenceStatus: 'miss' })).toBe(true)
    expect(frameNeedsAction({ ...finalFrame, referenceStatus: 'pass' })).toBe(false)
    expect(frameMatchesFilters({ ...finalFrame, referenceStatus: 'miss' }, 'final', 'all')).toBe(false)
    expect(
      frameReferenceNotice('miss', 'The framed photograph is a different picture.')
    ).toEqual({
      level: 'error',
      message: 'Reference missed — The framed photograph is a different picture.',
    })
    expect(frameReferenceNotice('drift')).toEqual({
      level: 'warning',
      message: 'Reference drifted',
    })
    expect(frameReferenceNotice('pass')).toBeNull()
  })

  it('lights clips red without a finished draft or final, and idle while rendering', () => {
    expect(videoRailStatus(missing)).toEqual({ status: 'action', label: 'No clip' })
    expect(videoRailStatus({ ...complete, status: 'queued' })).toEqual({ status: 'action', label: 'No clip' })
    expect(videoRailStatus({ key: 'e', status: 'error', promptChanged: false, imageTier: 'final' })).toEqual({
      status: 'action',
      label: 'Error',
    })
    expect(videoRailStatus({ key: 'r', status: 'rendering', promptChanged: false, imageTier: 'final' })).toEqual({
      status: 'idle',
      label: '',
    })
    expect(videoRailStatus({ key: 'd', status: 'complete', promptChanged: false, imageTier: 'draft' })).toEqual({
      status: 'attention',
      label: 'Draft',
    })
    expect(videoRailStatus({ ...complete, promptChanged: true })).toEqual({
      status: 'attention',
      label: 'Prompt changed',
    })
    expect(videoRailStatus(stale)).toEqual({ status: 'attention', label: 'Prompt changed' })
    expect(videoRailStatus(complete)).toEqual({ status: 'ready', label: 'Final' })
    expect(videoRailStatus({ key: 'u', status: 'complete', promptChanged: false })).toEqual({
      status: 'action',
      label: 'Missing',
    })
  })

  it('lights direction red without facets, yellow when the still prompt drifted, and green when it matches', () => {
    const direction: BeatDirection = {
      shotType: 'Close-Up',
      frozenMoment: 'Elara grips the journal',
    }
    const currentKey = beatStillDirectionFingerprint(direction)

    expect(directionRailStatus({})).toEqual({ status: 'action', label: 'No direction' })
    expect(directionRailStatus({ direction: { generatedBy: 'planner' } })).toEqual({
      status: 'action',
      label: 'No direction',
    })
    expect(
      directionRailStatus({
        direction: { framePrompt: 'A locked close-up of the journal.' },
      })
    ).toEqual({ status: 'ready', label: 'Ready' })
    expect(
      directionRailStatus({
        direction,
        stillPrompt: 'Elara grips the journal in close-up.',
      })
    ).toEqual({ status: 'ready', label: 'Ready' })
    expect(
      directionRailStatus({
        direction,
        stillPrompt: 'Elara grips the journal in close-up.',
        stillPromptDirectionKey: currentKey,
      })
    ).toEqual({ status: 'ready', label: 'Ready' })
    expect(
      directionRailStatus({
        direction,
        stillPrompt: 'An older wide shot of the room.',
        stillPromptDirectionKey: beatStillDirectionFingerprint({
          ...direction,
          shotType: 'Wide Shot',
        }),
      })
    ).toEqual({ status: 'attention', label: 'Prompt changed' })
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

describe('clip failure tooltip', () => {
  const policy =
    'Content policy: Vertex blocked this generation. The trigger may be your text or a reference/start image. Try optional wording suggestions, remove reference images, or simplify the prompt.'

  it('names the policy block and tells the user to select the shot', () => {
    expect(isContentPolicyFailureMessage(policy)).toBe(true)
    const tip = clipFailureTooltip(policy)
    expect(tip).toBe(
      'Content policy blocked. Content policy: Vertex blocked this generation. Select this shot to rewrite it.'
    )
  })

  it('keeps a non-policy failure to its first sentence', () => {
    expect(clipFailureTooltip('Render failed. Try again later.')).toBe('Render failed.')
  })
})
