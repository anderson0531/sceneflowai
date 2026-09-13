import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_VERTEX_IMAGE_MAX_CONCURRENCY,
  getVertexImageGateSnapshot,
  getVertexImageMaxConcurrency,
  resetVertexImageGateForTests,
  runInVertexImageGate,
} from '@/lib/vertexai/vertexImageGate'

/** Resolves when told to, so a test can hold slots open deliberately. */
function deferred() {
  let resolve!: () => void
  let reject!: (err: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const tick = () => new Promise((r) => setImmediate(r))

describe('vertexImageGate', () => {
  beforeEach(() => {
    resetVertexImageGateForTests()
    delete process.env.VERTEX_IMAGE_MAX_CONCURRENCY
  })

  afterEach(() => {
    resetVertexImageGateForTests()
    delete process.env.VERTEX_IMAGE_MAX_CONCURRENCY
  })

  it('caps concurrent generations at two by default', () => {
    expect(DEFAULT_VERTEX_IMAGE_MAX_CONCURRENCY).toBe(2)
    expect(getVertexImageMaxConcurrency()).toBe(2)
  })

  it('matches the Express flash image lane so a single run never queues', async () => {
    const { DEFAULT_EXPRESS_FLASH_IMAGE_CONCURRENCY } = await import(
      '@/lib/sceneGeneration/expressTrafficCop'
    )
    expect(DEFAULT_VERTEX_IMAGE_MAX_CONCURRENCY).toBe(DEFAULT_EXPRESS_FLASH_IMAGE_CONCURRENCY)
  })

  it('admits only two at a time and holds the rest', async () => {
    const gates = [deferred(), deferred(), deferred(), deferred()]
    let started = 0

    const runs = gates.map((g) =>
      runInVertexImageGate(async () => {
        started++
        await g.promise
      })
    )

    await tick()
    expect(started).toBe(2)
    expect(getVertexImageGateSnapshot().inFlight).toBe(2)
    expect(getVertexImageGateSnapshot().waiting).toBe(2)

    gates[0].resolve()
    await tick()
    expect(started).toBe(3)

    gates[1].resolve()
    gates[2].resolve()
    gates[3].resolve()
    await Promise.all(runs)

    expect(started).toBe(4)
    expect(getVertexImageGateSnapshot().inFlight).toBe(0)
    expect(getVertexImageGateSnapshot().waiting).toBe(0)
  })

  it('never lets in-flight exceed the cap, which is the whole point', async () => {
    process.env.VERTEX_IMAGE_MAX_CONCURRENCY = '2'
    let concurrent = 0
    let peak = 0

    await Promise.all(
      Array.from({ length: 12 }, () =>
        runInVertexImageGate(async () => {
          concurrent++
          peak = Math.max(peak, concurrent)
          await tick()
          concurrent--
        })
      )
    )

    expect(peak).toBe(2)
    expect(getVertexImageGateSnapshot().peakInFlight).toBe(2)
  })

  it('releases slots in FIFO order so a waiting frame is not starved', async () => {
    const gates = [deferred(), deferred(), deferred(), deferred(), deferred()]
    const order: number[] = []

    const runs = gates.map((g, i) =>
      runInVertexImageGate(async () => {
        order.push(i)
        await g.promise
      })
    )

    await tick()
    expect(order).toEqual([0, 1])

    for (let i = 0; i < gates.length; i++) {
      gates[i].resolve()
      await tick()
    }
    await Promise.all(runs)

    expect(order).toEqual([0, 1, 2, 3, 4])
  })

  it('releases the slot when the generation throws', async () => {
    await expect(
      runInVertexImageGate(async () => {
        throw new Error('Vertex Gemini Image error 429: RESOURCE_EXHAUSTED')
      })
    ).rejects.toThrow('429')

    expect(getVertexImageGateSnapshot().inFlight).toBe(0)

    await expect(runInVertexImageGate(async () => 'ok')).resolves.toBe('ok')
  })

  it('hands a freed slot to a waiter even when the holder throws', async () => {
    const first = deferred()
    let secondRan = false

    const failing = Array.from({ length: 2 }, () =>
      runInVertexImageGate(async () => {
        await first.promise
        throw new Error('boom')
      })
    )
    const queued = runInVertexImageGate(async () => {
      secondRan = true
    })

    await tick()
    expect(secondRan).toBe(false)

    first.reject(new Error('boom'))
    await Promise.allSettled(failing)
    await queued

    expect(secondRan).toBe(true)
    expect(getVertexImageGateSnapshot().inFlight).toBe(0)
  })

  /**
   * The deadlock this gate has to avoid. `generateVertexGeminiImage` calls
   * itself to retry, so a slot held across a retry would be waited on by the
   * call already holding it. The gate wraps the dispatch only; these assert the
   * shape that keeps that safe.
   */
  it('does not deadlock when a retry re-enters the gate after releasing', async () => {
    process.env.VERTEX_IMAGE_MAX_CONCURRENCY = '1'

    const attemptOne = async (): Promise<string> => {
      await runInVertexImageGate(async () => 'rate limited')
      // Backoff happens outside the gate, then the retry re-enters.
      await tick()
      return runInVertexImageGate(async () => 'second attempt')
    }

    await expect(attemptOne()).resolves.toBe('second attempt')
    expect(getVertexImageGateSnapshot().inFlight).toBe(0)
  })

  it('would deadlock if a slot were held across a nested acquire', async () => {
    process.env.VERTEX_IMAGE_MAX_CONCURRENCY = '1'

    const nested = runInVertexImageGate(() => runInVertexImageGate(async () => 'inner'))
    const settled = await Promise.race([
      nested.then(() => 'resolved'),
      tick().then(() => 'still waiting'),
    ])

    expect(settled).toBe('still waiting')
    expect(getVertexImageGateSnapshot().inFlight).toBe(1)
    resetVertexImageGateForTests()
  })

  it('counts generations that had to wait, so log lines can be trusted', async () => {
    process.env.VERTEX_IMAGE_MAX_CONCURRENCY = '1'

    await Promise.all(
      Array.from({ length: 3 }, () => runInVertexImageGate(async () => tick()))
    )

    expect(getVertexImageGateSnapshot().queuedTotal).toBeGreaterThan(0)
  })

  it('is a no-op when disabled with 0', async () => {
    process.env.VERTEX_IMAGE_MAX_CONCURRENCY = '0'
    expect(getVertexImageMaxConcurrency()).toBe(0)

    let concurrent = 0
    let peak = 0
    await Promise.all(
      Array.from({ length: 6 }, () =>
        runInVertexImageGate(async () => {
          concurrent++
          peak = Math.max(peak, concurrent)
          await tick()
          concurrent--
        })
      )
    )

    expect(peak).toBe(6)
  })

  it('honors a raised override for dedicated capacity', async () => {
    process.env.VERTEX_IMAGE_MAX_CONCURRENCY = '8'
    expect(getVertexImageMaxConcurrency()).toBe(8)
  })

  it('falls back to the default on a value that is not a number', () => {
    process.env.VERTEX_IMAGE_MAX_CONCURRENCY = 'lots'
    expect(getVertexImageMaxConcurrency()).toBe(DEFAULT_VERTEX_IMAGE_MAX_CONCURRENCY)
  })
})
