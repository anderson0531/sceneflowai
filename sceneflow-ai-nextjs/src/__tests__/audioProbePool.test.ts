import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { AUDIO_PROBE_CONCURRENCY, runBoundedPool } from '@/lib/audio/audioProbePool'

describe('runBoundedPool', () => {
  it('never runs more workers than the concurrency cap', async () => {
    let inFlight = 0
    let peak = 0
    const items = Array.from({ length: 20 }, (_, i) => i)

    await runBoundedPool(items, 4, async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await Promise.resolve()
      inFlight -= 1
    })

    expect(peak).toBeLessThanOrEqual(4)
    expect(peak).toBe(4)
  })

  it('visits every item when it is not cancelled', async () => {
    const seen: number[] = []
    await runBoundedPool([1, 2, 3, 4, 5], 2, async (item) => {
      seen.push(item)
    })
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('stops handing out new work once cancelled', async () => {
    const seen: number[] = []
    let cancelled = false
    const started = runBoundedPool(
      [1, 2, 3, 4, 5, 6, 7, 8],
      2,
      async (item) => {
        seen.push(item)
        cancelled = true
      },
      () => cancelled
    )
    await started
    expect(seen.length).toBeLessThan(8)
    expect(seen.length).toBeGreaterThan(0)
  })
})

describe('storyboard playback uses the bounded probe pool', () => {
  const storyboard = readFileSync(
    path.join(process.cwd(), 'src/hooks/useStoryboardPlayback.ts'),
    'utf8'
  )

  it('probes through getAudioDuration four at a time', () => {
    expect(storyboard).toContain('AUDIO_PROBE_CONCURRENCY')
    expect(storyboard).toContain('runBoundedPool')
    expect(storyboard).toContain('getAudioDuration(url)')
    expect(storyboard).not.toContain('new Audio(')
    expect(AUDIO_PROBE_CONCURRENCY).toBe(4)
  })
})
