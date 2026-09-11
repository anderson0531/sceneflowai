import { describe, expect, it } from 'vitest'
import {
  SCENE_FADE_TO_BLACK_SEC,
  buildBeatFirstPlaybackTimeline,
} from '@/lib/storyboard/types'
import { BEAT_DISSOLVE_SEC } from '@/lib/storyboard/transitions'
import type { BeatDirectionTransition } from '@/lib/script/segmentTypes'

function actionBeat(
  index: number,
  transition?: BeatDirectionTransition
): Record<string, unknown> {
  return {
    beatId: `bt_a${index + 1}`,
    sequenceIndex: index,
    kind: 'action',
    actionDescription: `Action ${index + 1}`,
    durationSeconds: 6,
    storyboardImageUrl: `https://cdn.test/bt_a${index + 1}.png`,
    ...(transition ? { beatDirection: { transition } } : {}),
  }
}

function scene(
  transitions: Array<BeatDirectionTransition | undefined>,
  transitionToNext?: BeatDirectionTransition
): Record<string, unknown> {
  return {
    beats: transitions.map((transition, index) => actionBeat(index, transition)),
    ...(transitionToNext ? { transitionToNext } : {}),
  }
}

describe('buildBeatFirstPlaybackTimeline transitions', () => {
  it('cuts between beats that never authored a transition', () => {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene([undefined, undefined]), 'en')

    expect(visualFrames.map((f) => f.transitionOut)).toEqual(['cut', 'fade'])
    expect(visualFrames[0].transitionOutSec).toBe(0)
  })

  it('carries a beat dissolve onto the frame it plays out of', () => {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(
      scene(['DISSOLVE', undefined]),
      'en'
    )

    expect(visualFrames[0].transitionOut).toBe('dissolve')
    expect(visualFrames[0].transitionOutSec).toBe(BEAT_DISSOLVE_SEC)
  })

  it('repeats each join on the incoming frame so the player can read it alone', () => {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(
      scene(['FADE', 'DISSOLVE', undefined]),
      'en'
    )

    expect(visualFrames.map((f) => f.transitionIn)).toEqual(['fade', 'fade', 'dissolve'])
    expect(visualFrames[1].transitionInSec).toBe(visualFrames[0].transitionOutSec)
    expect(visualFrames[2].transitionInSec).toBe(visualFrames[1].transitionOutSec)
  })

  it('opens on a fade up from black, matching the legacy scene start', () => {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene([undefined]), 'en')

    expect(visualFrames[0].transitionIn).toBe('fade')
    expect(visualFrames[0].transitionInSec).toBe(SCENE_FADE_TO_BLACK_SEC)
  })

  it('opens on a hard cut when the previous scene cut into this one', () => {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene([undefined]), 'en', {}, {
      sceneTransitionIn: 'CUT',
    })

    expect(visualFrames[0].transitionIn).toBe('cut')
    expect(visualFrames[0].transitionInSec).toBe(0)
  })

  it('gives the last beat the scene transition, not its own', () => {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(
      scene([undefined, 'DISSOLVE'], 'CUT'),
      'en'
    )

    expect(visualFrames[1].transitionOut).toBe('cut')
  })

  it('holds a second of black at an unset scene boundary, exactly as before', () => {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(scene([undefined, undefined]), 'en')
    const last = visualFrames[visualFrames.length - 1]

    expect(last.transitionOut).toBe('fade')
    expect(last.duration).toBe(6 + SCENE_FADE_TO_BLACK_SEC)
  })

  it('drops the held black when the scene cuts or dissolves into the next', () => {
    for (const transition of ['CUT', 'DISSOLVE'] as const) {
      const { visualFrames } = buildBeatFirstPlaybackTimeline(
        scene([undefined, undefined], transition),
        'en'
      )
      expect(visualFrames[visualFrames.length - 1].duration).toBe(6)
    }
  })

  it('leaves every start time alone, so a beat transition cannot desync audio', () => {
    const plain = buildBeatFirstPlaybackTimeline(scene([undefined, undefined, undefined]), 'en')
    const dissolved = buildBeatFirstPlaybackTimeline(
      scene(['DISSOLVE', 'FADE', undefined]),
      'en'
    )

    expect(dissolved.visualFrames.map((f) => f.startTime)).toEqual(
      plain.visualFrames.map((f) => f.startTime)
    )
    expect(dissolved.visualFrames.map((f) => f.duration)).toEqual(
      plain.visualFrames.map((f) => f.duration)
    )
  })
})
