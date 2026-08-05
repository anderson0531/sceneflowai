import { describe, expect, it } from 'vitest'
import {
  isStaleActiveJob,
  STALE_PROCESSING_JOB_MS,
  STALE_QUEUED_JOB_MS,
} from '@/lib/jobs/staleJob'

describe('isStaleActiveJob', () => {
  it('treats old queued jobs as stale', () => {
    const created = new Date(Date.now() - STALE_QUEUED_JOB_MS - 1000).toISOString()
    expect(
      isStaleActiveJob({ status: 'queued', created_at: created, updated_at: created })
    ).toBe(true)
  })

  it('keeps fresh queued jobs active', () => {
    const created = new Date(Date.now() - 60_000).toISOString()
    expect(
      isStaleActiveJob({ status: 'queued', created_at: created, updated_at: created })
    ).toBe(false)
  })

  it('treats old processing jobs as stale', () => {
    const updated = new Date(Date.now() - STALE_PROCESSING_JOB_MS - 1000).toISOString()
    expect(
      isStaleActiveJob({ status: 'processing', created_at: updated, updated_at: updated })
    ).toBe(true)
  })

  it('ignores terminal statuses', () => {
    const old = new Date(Date.now() - STALE_QUEUED_JOB_MS - 1000).toISOString()
    expect(isStaleActiveJob({ status: 'completed', created_at: old, updated_at: old })).toBe(
      false
    )
    expect(isStaleActiveJob({ status: 'failed', created_at: old, updated_at: old })).toBe(false)
  })
})
