import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withTimeout, TimeoutError } from '@/lib/utils/retry'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves when the promise completes before the deadline', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 1000, 'TestOp')
    expect(result).toBe('ok')
  })

  it('rejects with TimeoutError when the deadline is exceeded', async () => {
    const slow = new Promise<string>(() => {
      // intentionally never resolves
    })

    const resultPromise = withTimeout(slow, 100, 'SlowOp')
    const expectation = expect(resultPromise).rejects.toBeInstanceOf(TimeoutError)

    await vi.advanceTimersByTimeAsync(100)
    await expectation

    await expect(resultPromise).rejects.toThrow('SlowOp timed out after 100ms')
  })
})
