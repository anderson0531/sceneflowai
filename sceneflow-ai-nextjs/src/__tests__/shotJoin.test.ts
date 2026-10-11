import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  BEAT_DISSOLVE_SEC,
  BEAT_FADE_SEC,
  HARD_CUT,
  renderTransitionFromPreviousShot,
  resolveShotJoin,
} from '@/lib/storyboard/transitions'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('resolveShotJoin', () => {
  it('treats a missing join as a cut', () => {
    expect(resolveShotJoin(undefined, 8)).toEqual(HARD_CUT)
    expect(resolveShotJoin(null, 8)).toEqual(HARD_CUT)
    expect(resolveShotJoin('cut', 8)).toEqual(HARD_CUT)
  })

  it('uses the beat dissolve and fade lengths', () => {
    expect(resolveShotJoin('dissolve', 8)).toEqual({
      effect: 'dissolve',
      durationSec: BEAT_DISSOLVE_SEC,
    })
    expect(resolveShotJoin('fade', 8)).toEqual({
      effect: 'fade',
      durationSec: BEAT_FADE_SEC,
    })
  })

  it('does not give the last shot an incoming join from itself', () => {
    const shots = [{ shotJoin: 'dissolve' }, { shotJoin: 'fade' }, { shotJoin: 'dissolve' }]
    const incoming = shots.map((shot, index) =>
      renderTransitionFromPreviousShot(index === 0 ? undefined : shots[index - 1], 8)
    )
    expect(incoming[0]).toEqual({})
    expect(incoming[1]).toEqual({ transitionIn: 'dissolve', transitionInSec: BEAT_DISSOLVE_SEC })
    expect(incoming[2]).toEqual({ transitionIn: 'fade', transitionInSec: BEAT_FADE_SEC })
    expect(incoming).toHaveLength(shots.length)
  })
})

describe('mixer shot panels and joins', () => {
  it('opens Shot Video and Shot Trim with the stored collapse keys', () => {
    const mixer = readSource('src/components/vision/scene-production/SceneProductionMixer.tsx')
    expect(mixer).toContain('isCollapsed={collapsedSections.beatVideo}')
    expect(mixer).toContain("toggleSection('beatVideo')")
    expect(mixer).not.toContain("toggleSection('shotVideo')")
    expect(mixer).toContain('isCollapsed={collapsedSections.beatTrim}')
    expect(mixer).toContain("toggleSection('beatTrim')")
    expect(mixer).not.toContain("toggleSection('shotTrim')")
  })

  it('offers cut, dissolve, and fade to black between shots', () => {
    const mixer = readSource('src/components/vision/scene-production/SceneProductionMixer.tsx')
    expect(mixer).toContain('Into next')
    expect(mixer).toContain('Fade to black')
    expect(mixer).toContain('renderTransitionFromPreviousShot')
  })
})

describe('scene mp4 shot joins', () => {
  it('fades and dissolves without replacing a cut concat', () => {
    const renderer = readSource('docker/ffmpeg-renderer/ffmpeg_utils.py')
    expect(renderer).toContain('def shot_join_fade_filters')
    expect(renderer).toContain('fade=t=in')
    expect(renderer).toContain('fade=t=out')
    expect(renderer).toContain('def apply_same_length_dissolves')
    expect(renderer).toContain("return 'shot join'")
    expect(renderer).toContain('concat=n={len(video_segments)}:v=1:a=0[outv]')
  })
})
