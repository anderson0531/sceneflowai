import { describe, expect, it } from 'vitest'
import {
  SCENE_FADE_TO_BLACK_SEC,
  buildProjectAnimaticTimeline,
  type ProjectAnimaticRenderSegment,
  type ProjectAnimaticTimeline,
} from '@/lib/storyboard/types'
import type { BeatDirectionTransition } from '@/lib/script/segmentTypes'

const BLACK_URL = 'https://cdn.test/black-frame.png'

function actionBeat(
  sceneNumber: number,
  index: number,
  transition?: BeatDirectionTransition,
  endImageUrl?: string
): Record<string, unknown> {
  return {
    beatId: `bt_s${sceneNumber}_${index + 1}`,
    sequenceIndex: index,
    kind: 'action',
    actionDescription: `Action ${index + 1}`,
    durationSeconds: 8,
    storyboardImageUrl: `https://cdn.test/s${sceneNumber}b${index + 1}.png`,
    ...(endImageUrl ? { storyboardEndImageUrl: endImageUrl } : {}),
    ...(transition ? { beatDirection: { transition } } : {}),
  }
}

function scene(
  sceneNumber: number,
  transitions: Array<BeatDirectionTransition | undefined>,
  transitionToNext?: BeatDirectionTransition
): Record<string, unknown> {
  return {
    beats: transitions.map((transition, index) => actionBeat(sceneNumber, index, transition)),
    ...(transitionToNext ? { transitionToNext } : {}),
  }
}

/**
 * The identity the renderer relies on: hard-concatenating every segment and
 * then reclaiming each declared overlap lands exactly on the soundtrack.
 */
function renderedDuration(timeline: ProjectAnimaticTimeline): number {
  return timeline.segments.reduce(
    (total, seg) => total + seg.duration - (seg.transitionInSec ?? 0),
    0
  )
}

function transitionsOf(
  timeline: ProjectAnimaticTimeline
): Array<[string, ProjectAnimaticRenderSegment['transitionIn']]> {
  return timeline.segments.map((seg) => [seg.segmentId, seg.transitionIn])
}

describe('buildProjectAnimaticTimeline transitions', () => {
  it('emits nothing extra until the renderer is known to understand it', () => {
    const scenes = [scene(1, ['DISSOLVE', undefined], 'DISSOLVE'), scene(2, [undefined])]
    const timeline = buildProjectAnimaticTimeline(scenes, 'en', {}, { preVisAnimatic: true })

    expect(timeline.segments.every((seg) => seg.transitionIn === undefined)).toBe(true)
  })

  it('is byte-for-byte the old timeline when transitions are off', () => {
    const scenes = [scene(1, ['DISSOLVE', undefined], 'DISSOLVE'), scene(2, [undefined])]
    const off = buildProjectAnimaticTimeline(scenes, 'en', {}, { preVisAnimatic: true })
    const plain = buildProjectAnimaticTimeline(
      [scene(1, [undefined, undefined], 'DISSOLVE'), scene(2, [undefined])],
      'en',
      {},
      { preVisAnimatic: true }
    )

    expect(off.segments.map((s) => s.duration)).toEqual(plain.segments.map((s) => s.duration))
  })

  it('carries an authored beat dissolve onto the segment it fades into', () => {
    const scenes = [scene(1, ['DISSOLVE', undefined])]
    const timeline = buildProjectAnimaticTimeline(scenes, 'en', {}, {
      preVisAnimatic: true,
      transitions: true,
    })

    expect(transitionsOf(timeline)).toEqual([
      ['s0-action-bt_s1_1', undefined],
      ['s0-action-bt_s1_2', 'dissolve'],
    ])
    expect(timeline.segments[1].transitionInSec).toBe(0.5)
  })

  it('pays for the overlap out of the outgoing segment, so the total is unchanged', () => {
    const scenes = [scene(1, ['DISSOLVE', 'FADE', undefined])]
    const plain = buildProjectAnimaticTimeline(scenes, 'en', {}, { preVisAnimatic: true })
    const withTransitions = buildProjectAnimaticTimeline(scenes, 'en', {}, {
      preVisAnimatic: true,
      transitions: true,
    })

    expect(withTransitions.totalDuration).toBe(plain.totalDuration)
    expect(renderedDuration(withTransitions)).toBeCloseTo(plain.totalDuration, 6)
    expect(withTransitions.segments[0].duration).toBe(plain.segments[0].duration + 0.5)
  })

  it('declares the in-beat start-to-end overlap the renderer used to run past', () => {
    const withEnd = {
      beats: [actionBeat(1, 0, undefined, 'https://cdn.test/s1b1-end.png')],
    }
    const plain = buildProjectAnimaticTimeline([withEnd], 'en')
    const withTransitions = buildProjectAnimaticTimeline([withEnd], 'en', {}, {
      transitions: true,
    })

    // The old renderer concatenated both halves whole and ran long by the
    // overlap the timeline had already built into their start times.
    expect(
      plain.segments.reduce((total, seg) => total + seg.duration, 0)
    ).toBeGreaterThan(plain.totalDuration)
    expect(renderedDuration(withTransitions)).toBeCloseTo(withTransitions.totalDuration, 6)
    expect(withTransitions.segments[1].transitionIn).toBe('dissolve')
  })

  it('fades down into the inter-scene black and back up out of it', () => {
    const scenes = [scene(1, [undefined]), scene(2, [undefined])]
    const timeline = buildProjectAnimaticTimeline(scenes, 'en', {}, {
      preVisAnimatic: true,
      interSceneFadeUrl: BLACK_URL,
      transitions: true,
    })

    expect(transitionsOf(timeline)).toEqual([
      ['s0-action-bt_s1_1', undefined],
      ['s0-fade', 'dissolve'],
      ['s1-action-bt_s2_1', 'dissolve'],
    ])
    expect(renderedDuration(timeline)).toBeCloseTo(timeline.totalDuration, 6)
  })

  it('drops the black frame entirely for a scene that cuts into the next', () => {
    const scenes = [scene(1, [undefined], 'CUT'), scene(2, [undefined])]
    const timeline = buildProjectAnimaticTimeline(scenes, 'en', {}, {
      preVisAnimatic: true,
      interSceneFadeUrl: BLACK_URL,
      transitions: true,
    })

    expect(timeline.segments.some((seg) => seg.imageUrl === BLACK_URL)).toBe(false)
    expect(timeline.segments.every((seg) => seg.transitionIn === undefined)).toBe(true)
  })

  it('dissolves straight from one scene into the next when asked to', () => {
    const scenes = [scene(1, [undefined], 'DISSOLVE'), scene(2, [undefined])]
    const timeline = buildProjectAnimaticTimeline(scenes, 'en', {}, {
      preVisAnimatic: true,
      interSceneFadeUrl: BLACK_URL,
      transitions: true,
    })

    expect(timeline.segments.some((seg) => seg.imageUrl === BLACK_URL)).toBe(false)
    expect(timeline.segments[1].transitionIn).toBe('dissolve')
    expect(timeline.segments[1].transitionInSec).toBe(SCENE_FADE_TO_BLACK_SEC)
    expect(renderedDuration(timeline)).toBeCloseTo(timeline.totalDuration, 6)
  })

  it('keeps the picture on the soundtrack across a whole mixed project', () => {
    const scenes = [
      scene(1, ['DISSOLVE', 'FADE', undefined], 'DISSOLVE'),
      scene(2, [undefined, 'DISSOLVE'], 'CUT'),
      scene(3, ['FADE', undefined]),
    ]
    const timeline = buildProjectAnimaticTimeline(scenes, 'en', {}, {
      preVisAnimatic: true,
      interSceneFadeUrl: BLACK_URL,
      transitions: true,
    })

    expect(renderedDuration(timeline)).toBeCloseTo(timeline.totalDuration, 6)
  })
})
