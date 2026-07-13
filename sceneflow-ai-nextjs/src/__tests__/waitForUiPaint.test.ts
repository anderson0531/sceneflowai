import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitForUiPaint } from '@/lib/ui/waitForUiPaint'

describe('waitForUiPaint', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: FrameRequestCallback) =>
        setTimeout(() => callback(performance.now()), 0) as unknown as number
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('resolves after two animation frames when extraMs is 0', async () => {
    const promise = waitForUiPaint(0)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
  })

  it('waits extraMs after animation frames', async () => {
    const promise = waitForUiPaint(50)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
  })
})
