import { describe, expect, it } from 'vitest'
import {
  BEAT_DISSOLVE_SEC,
  SCENE_FADE_TO_BLACK_SEC,
  resolveBeatTransition,
  resolveSceneTransition,
  resolveTransitionEffect,
  transitionTailSec,
} from '@/lib/storyboard/transitions'

describe('resolveTransitionEffect', () => {
  it('maps the two editorial effects onto the two things playback can do', () => {
    expect(resolveTransitionEffect('DISSOLVE')).toBe('dissolve')
    expect(resolveTransitionEffect('FADE')).toBe('fade')
  })

  it('plays every other authored value as a hard cut', () => {
    expect(resolveTransitionEffect('CUT')).toBe('cut')
    expect(resolveTransitionEffect('MATCH_CUT')).toBe('cut')
    expect(resolveTransitionEffect('CONTINUE')).toBe('cut')
  })

  it('cuts when nothing was authored', () => {
    expect(resolveTransitionEffect(undefined)).toBe('cut')
    expect(resolveTransitionEffect(null)).toBe('cut')
    expect(resolveTransitionEffect('')).toBe('cut')
    expect(resolveTransitionEffect('WIPE')).toBe('cut')
  })
})

describe('resolveBeatTransition', () => {
  it('gives a dissolve its full length on a beat with room for it', () => {
    expect(resolveBeatTransition('DISSOLVE', 8)).toEqual({
      effect: 'dissolve',
      durationSec: BEAT_DISSOLVE_SEC,
    })
  })

  it('shortens the effect on a beat too brief to spare the time', () => {
    const resolved = resolveBeatTransition('DISSOLVE', 1)
    expect(resolved.effect).toBe('dissolve')
    expect(resolved.durationSec).toBeCloseTo(0.3, 5)
  })

  it('falls back to a cut when the beat is too short to show anything', () => {
    expect(resolveBeatTransition('FADE', 0.2)).toEqual({ effect: 'cut', durationSec: 0 })
  })

  it('reports a cut with no duration', () => {
    expect(resolveBeatTransition('CUT', 8)).toEqual({ effect: 'cut', durationSec: 0 })
    expect(resolveBeatTransition(undefined, 8)).toEqual({ effect: 'cut', durationSec: 0 })
  })

  it('uses the nominal length when the frame duration is unknown', () => {
    expect(resolveBeatTransition('DISSOLVE').durationSec).toBe(BEAT_DISSOLVE_SEC)
  })
})

describe('resolveSceneTransition', () => {
  it('fades through black when the scene never chose, matching legacy playback', () => {
    expect(resolveSceneTransition(undefined)).toEqual({
      effect: 'fade',
      durationSec: SCENE_FADE_TO_BLACK_SEC,
    })
  })

  it('honours an explicit dissolve or cut', () => {
    expect(resolveSceneTransition('DISSOLVE')).toEqual({
      effect: 'dissolve',
      durationSec: SCENE_FADE_TO_BLACK_SEC,
    })
    expect(resolveSceneTransition('CUT')).toEqual({ effect: 'cut', durationSec: 0 })
  })

  it('treats the generation-only hints as a cut', () => {
    expect(resolveSceneTransition('CONTINUE').effect).toBe('cut')
    expect(resolveSceneTransition('MATCH_CUT').effect).toBe('cut')
  })
})

describe('transitionTailSec', () => {
  it('only lengthens the outgoing frame for a fade, which has to hold the black', () => {
    expect(transitionTailSec({ effect: 'fade', durationSec: 1 })).toBe(1)
    expect(transitionTailSec({ effect: 'dissolve', durationSec: 1 })).toBe(0)
    expect(transitionTailSec({ effect: 'cut', durationSec: 0 })).toBe(0)
  })
})
