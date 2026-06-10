import { isRetryableError, sleep } from '@/lib/utils/retry'

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export function getExpressVeoSfxConcurrency(): number {
  return parsePositiveInt(process.env.EXPRESS_VEO_SFX_CONCURRENCY, 2)
}

export interface VeoSfxTrafficCopOptions {
  onThrottle?: (max: number, cooldownMs: number) => void
  max?: number
  cooldownMs?: number
}

/**
 * Single-lane traffic cop for concurrent Veo SFX jobs within one Express run.
 */
export class VeoSfxTrafficCop {
  private inFlight = 0
  private max: number
  private cooldownUntil: number | null = null
  private readonly cooldownMs: number
  private readonly onThrottle?: VeoSfxTrafficCopOptions['onThrottle']
  private readonly waiters: Array<() => void> = []

  constructor(options: VeoSfxTrafficCopOptions = {}) {
    this.max = options.max ?? getExpressVeoSfxConcurrency()
    this.cooldownMs =
      options.cooldownMs ??
      parsePositiveInt(process.env.EXPRESS_RATE_LIMIT_COOLDOWN_MS, 10_000)
    this.onThrottle = options.onThrottle
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } catch (err) {
      if (isRetryableError(err)) {
        this.reportRateLimit()
      }
      throw err
    } finally {
      this.release()
    }
  }

  reportRateLimit(): void {
    this.max = Math.max(1, Math.floor(this.max / 2))
    this.cooldownUntil = Date.now() + this.cooldownMs
    console.warn(
      `[VeoSfxTrafficCop] throttled to max=${this.max}, cooldown ${this.cooldownMs}ms`
    )
    this.onThrottle?.(this.max, this.cooldownMs)
  }

  private async acquire(): Promise<void> {
    while (true) {
      const now = Date.now()
      if (this.cooldownUntil !== null && now < this.cooldownUntil) {
        await sleep(this.cooldownUntil - now)
        continue
      }
      if (this.inFlight < this.max) {
        this.inFlight++
        return
      }
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve)
      })
    }
  }

  private release(): void {
    this.inFlight = Math.max(0, this.inFlight - 1)
    const next = this.waiters.shift()
    if (next) next()
  }
}
