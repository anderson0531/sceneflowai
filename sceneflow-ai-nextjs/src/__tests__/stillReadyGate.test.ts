import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  ANIMATIC_STILL_READY_TIMEOUT_SEC,
  STILL_HOLD_EPSILON_SEC,
  findVisualClipAtTime,
  holdElapsedForUnreadyStill,
  isAnimaticStillReady,
  resolvePendingStillClip,
  type StillGatedClip,
} from '@/lib/storyboard/stillReadyGate'

const root = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

const clips: StillGatedClip[] = [
  { id: 'a', startTime: 0, duration: 10, thumbnailUrl: 'https://cdn/a.jpg' },
  { id: 'b', startTime: 10, duration: 10, thumbnailUrl: 'https://cdn/b.jpg' },
]

describe('isAnimaticStillReady', () => {
  it('treats a missing URL as ready so a blank beat cannot freeze playback', () => {
    expect(isAnimaticStillReady(undefined, new Set(), new Set())).toBe(true)
    expect(isAnimaticStillReady('  ', new Set(), new Set())).toBe(true)
  })

  it('is ready once loaded or failed', () => {
    expect(isAnimaticStillReady('https://cdn/a.jpg', new Set(['https://cdn/a.jpg']), new Set())).toBe(
      true
    )
    expect(isAnimaticStillReady('https://cdn/a.jpg', new Set(), new Set(['https://cdn/a.jpg']))).toBe(
      true
    )
    expect(isAnimaticStillReady('https://cdn/a.jpg', new Set(), new Set())).toBe(false)
  })
})

describe('holdElapsedForUnreadyStill', () => {
  it('freezes at 0 until the first still is ready', () => {
    const held = holdElapsedForUnreadyStill({
      elapsed: 0.4,
      pendingClipStartTime: 0,
      stillReady: false,
      holdStartedAtMs: 1000,
      nowMs: 1400,
    })
    expect(held.holding).toBe(true)
    expect(held.elapsed).toBe(0)
  })

  it('holds at the next frame start minus epsilon so the previous still stays on screen', () => {
    const held = holdElapsedForUnreadyStill({
      elapsed: 10.05,
      pendingClipStartTime: 10,
      stillReady: false,
      holdStartedAtMs: 5000,
      nowMs: 5200,
    })
    expect(held.holding).toBe(true)
    expect(held.elapsed).toBeCloseTo(10 - STILL_HOLD_EPSILON_SEC, 8)
  })

  it('fails open after the timeout so a broken URL cannot freeze the room', () => {
    const held = holdElapsedForUnreadyStill({
      elapsed: 10.05,
      pendingClipStartTime: 10,
      stillReady: false,
      holdStartedAtMs: 0,
      nowMs: ANIMATIC_STILL_READY_TIMEOUT_SEC * 1000 + 1,
    })
    expect(held.holding).toBe(false)
    expect(held.elapsed).toBe(10.05)
  })

  it('does not hold when the still is already ready', () => {
    const held = holdElapsedForUnreadyStill({
      elapsed: 3,
      pendingClipStartTime: 0,
      stillReady: true,
      holdStartedAtMs: null,
      nowMs: 3000,
    })
    expect(held.holding).toBe(false)
    expect(held.elapsed).toBe(3)
  })
})

describe('resolvePendingStillClip', () => {
  it('keeps waiting for the pending clip even after elapsed is frozen onto the previous frame', () => {
    const frozen = 10 - STILL_HOLD_EPSILON_SEC
    expect(findVisualClipAtTime(clips, frozen)?.id).toBe('a')
    const pending = resolvePendingStillClip(frozen, clips, clips[1], () => false)
    expect(pending?.id).toBe('b')
  })

  it('clears pending once that still is ready', () => {
    const pending = resolvePendingStillClip(10 - STILL_HOLD_EPSILON_SEC, clips, clips[1], (clip) =>
      clip.id === 'b' ? true : clip.id === 'a'
    )
    expect(pending).toBeNull()
  })
})

describe('still-ready gate wiring', () => {
  it('Screening Room reports still load/error and preloads the next frame', () => {
    const player = readSource('src/components/vision/AudioGalleryPlayer.tsx')
    expect(player).toContain('reportStillStatus(url, true)')
    expect(player).toContain('reportStillStatus(url, false)')
    expect(player).toContain('nextStillUrl')
    expect(player).toContain('onLoad={() => reportStillStatus(nextStillUrl, true)}')
  })

  it('animatic playback stalls the clock until the still is ready', () => {
    const timeline = readSource('src/hooks/useTimelinePlayback.ts')
    expect(timeline).toContain('gateOnStillReady')
    expect(timeline).toContain('holdElapsedForUnreadyStill')
    expect(timeline).toContain('if (holdingStill) return')
    const storyboard = readSource('src/hooks/useStoryboardPlayback.ts')
    expect(storyboard).toContain('gateOnStillReady: true')
  })

  it('hides Scene Track whenever Score cues exist', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain('const showLegacyMusicPanel = sceneMusicCues.length === 0 && !!scene.music')
    expect(panel).not.toContain('!sceneMusicCues.some((cue) => cue.url === scene.musicAudio)')
  })

  it('exposes volume and fade sliders on scored Score rows', () => {
    const score = readSource('src/components/vision/SceneMusicCuePanel.tsx')
    expect(score).toContain('onCueMixChange')
    expect(score).toContain('Fade in')
    expect(score).toContain('Fade out')
    expect(score).toContain('CueMixSliders')
  })
})
