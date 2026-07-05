import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  getAggregatorDiagnostics,
  isAggregatorEnabled,
} from '@/lib/aggregator/config'

describe('getAggregatorDiagnostics', () => {
  const envBackup = { ...process.env }

  afterEach(() => {
    process.env = { ...envBackup }
  })

  beforeEach(() => {
    delete process.env.VIDEO_AGGREGATOR_API_KEY
    delete process.env.VIDEO_AGGREGATOR_ENABLED
    delete process.env.VERCEL_ENV
  })

  it('reports no_api_key when key missing', () => {
    const d = getAggregatorDiagnostics()
    expect(d.enabled).toBe(false)
    expect(d.disabledReason).toBe('no_api_key')
    expect(d.hasApiKey).toBe(false)
  })

  it('reports explicitly_disabled when kill switch set', () => {
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-key'
    process.env.VIDEO_AGGREGATOR_ENABLED = 'false'
    const d = getAggregatorDiagnostics()
    expect(d.enabled).toBe(false)
    expect(d.disabledReason).toBe('explicitly_disabled')
    expect(d.hasApiKey).toBe(true)
  })

  it('reports ok when key present', () => {
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-key'
    expect(isAggregatorEnabled()).toBe(true)
    const d = getAggregatorDiagnostics()
    expect(d.enabled).toBe(true)
    expect(d.disabledReason).toBe('ok')
    expect(d.vendor).toBe('renderful')
  })
})
