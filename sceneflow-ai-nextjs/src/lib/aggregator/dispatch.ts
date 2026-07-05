import {
  getPrimaryAggregatorVendor,
  getFailoverAggregatorVendor,
} from './config'
import { getAggregatorAdapter } from './adapters'
import type {
  AggregatorSubmitOptions,
  AggregatorSubmitResult,
  AggregatorPollResult,
  AggregatorVideoInput,
} from './types'
import { AggregatorHttpError } from './types'

function isFailoverStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

export async function submitAggregatorJobWithFailover(
  input: AggregatorVideoInput,
  options?: AggregatorSubmitOptions
): Promise<AggregatorSubmitResult> {
  const primaryVendor = getPrimaryAggregatorVendor()
  const failoverVendor = getFailoverAggregatorVendor()
  const primary = getAggregatorAdapter(primaryVendor)

  try {
    return await primary.submitJob(input, options)
  } catch (e) {
    if (
      primaryVendor !== failoverVendor &&
      e instanceof AggregatorHttpError &&
      isFailoverStatus(e.status)
    ) {
      console.warn(
        `[Aggregator] Primary ${primaryVendor} failed (${e.status}), failing over to ${failoverVendor}`
      )
      const failover = getAggregatorAdapter(failoverVendor)
      return failover.submitJob(input, options)
    }
    throw e
  }
}

export async function pollAggregatorJob(
  jobId: string,
  vendor: AggregatorSubmitResult['vendor']
): Promise<AggregatorPollResult> {
  const adapter = getAggregatorAdapter(vendor)
  return adapter.pollJob(jobId)
}

export async function pollAggregatorJobWithFailover(
  submitResult: AggregatorSubmitResult,
  options?: { intervalMs?: number; timeoutSec?: number }
): Promise<AggregatorPollResult> {
  const intervalMs = options?.intervalMs ?? 5000
  const timeoutSec = options?.timeoutSec ?? 280
  const deadline = Date.now() + timeoutSec * 1000
  const adapter = getAggregatorAdapter(submitResult.vendor)

  while (Date.now() < deadline) {
    const result = await adapter.pollJob(submitResult.jobId)
    if (result.status === 'completed' || result.status === 'failed') {
      return result
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }

  const failoverVendor = getFailoverAggregatorVendor()
  if (submitResult.vendor !== failoverVendor) {
    throw new Error(`Aggregator job ${submitResult.jobId} timed out after ${timeoutSec}s`)
  }
  return { status: 'failed', error: 'Timed out waiting for aggregator job' }
}
