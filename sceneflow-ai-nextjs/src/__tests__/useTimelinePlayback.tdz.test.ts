import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Production Screening Room crashed on play after PR #285:
 *   Uncaught ReferenceError: Cannot access 'u' before initialization
 *   at Array.forEach → requestAnimationFrame
 *
 * Cause: animate() read `currentSceneDuration` at the top of the audio
 * forEach, then redeclared `const currentSceneDuration` later in the same
 * callback. The inner const is scope-hoisted, so the earlier read is TDZ.
 * The minifier renamed it to `u`.
 */
describe('useTimelinePlayback animate() TDZ', () => {
  const src = readFileSync(
    join(__dirname, '../hooks/useTimelinePlayback.ts'),
    'utf8'
  )

  const animate = src.slice(
    src.indexOf('const animate = useCallback'),
    src.indexOf('const play = useCallback')
  )

  it('captures scene duration once at the start of the rAF tick', () => {
    expect(animate).toMatch(/const currentSceneDuration = sceneDurationRef\.current/)
  })

  it('does not redeclare currentSceneDuration inside the audio forEach', () => {
    const forEach = animate.slice(animate.indexOf('currentAudioClips.forEach'))
    expect(forEach).toContain('currentAudioClips.forEach')
    expect(forEach.match(/const currentSceneDuration/g) ?? []).toHaveLength(0)
  })
})
