import { describe, expect, it } from 'vitest'
import {
  isBasicSegmentEligibleForAggregator,
  formatAdvancedKlingFailureMessage,
  formatBasicKlingFailureMessage,
} from '@/lib/video/klingAggregatorFallback'
import { resolveKlingApiModelName } from '@/lib/kling/types'

describe('resolveKlingApiModelName', () => {
  it('maps internal catalog ids to official API model_name values', () => {
    expect(resolveKlingApiModelName('kling-v3-omni')).toBe('kling-v2-6')
    expect(resolveKlingApiModelName('kling-v3')).toBe('kling-v3')
    expect(resolveKlingApiModelName('kling-v3-turbo')).toBe('kling-v2-5-turbo')
    expect(resolveKlingApiModelName('kling-v2.6')).toBe('kling-v2-6')
  })
})

describe('isBasicSegmentEligibleForAggregator', () => {
  it('allows plain I2V segments', () => {
    expect(isBasicSegmentEligibleForAggregator({ method: 'I2V' })).toBe(true)
  })

  it('rejects multi-shot and advanced features', () => {
    expect(isBasicSegmentEligibleForAggregator({ method: 'I2V', multiShot: true })).toBe(false)
    expect(isBasicSegmentEligibleForAggregator({ method: 'I2V', elementList: ['e1'] })).toBe(false)
    expect(isBasicSegmentEligibleForAggregator({ method: 'I2V', preset: 'hug' })).toBe(false)
  })

  it('rejects EXT, FTV, and end-frame interpolation', () => {
    expect(isBasicSegmentEligibleForAggregator({ method: 'EXT' })).toBe(false)
    expect(isBasicSegmentEligibleForAggregator({ method: 'FTV' })).toBe(false)
    expect(
      isBasicSegmentEligibleForAggregator({ method: 'I2V', endFrameUrl: 'https://x/end.png' })
    ).toBe(false)
  })
})

describe('kling aggregator fallback messages', () => {
  it('explains advanced feature mismatch', () => {
    const msg = formatAdvancedKlingFailureMessage('model is not supported')
    expect(msg).toContain('All-platform backup is unavailable')
    expect(msg).toContain('advanced')
  })

  it('mentions both paths for basic segments', () => {
    const msg = formatBasicKlingFailureMessage('direct fail', 'agg fail')
    expect(msg).toContain('All-platform Kling backup also failed')
  })
})
