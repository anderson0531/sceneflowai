import { describe, it, expect } from 'vitest'
import { getCreditCost, IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  CAST_ITEM_CREDITS,
  SECONDS_PER_ITEM,
  estimateReferenceExpress,
  estimateReferenceExpressSeconds,
  formatEstimatedDuration,
  formatReferenceExpressEstimate,
} from '@/lib/vision/referenceExpress/estimate'

const IMAGE_CREDIT = getCreditCost('IMAGE_GENERATION')

describe('a Reference Express run quotes itself before the click', () => {
  it('charges cast more than a single image, because it generates twice', () => {
    expect(CAST_ITEM_CREDITS).toBe(IMAGE_CREDITS.CHARACTER_IDENTITY_WITH_ENHANCE)
    expect(CAST_ITEM_CREDITS).toBeGreaterThan(IMAGE_CREDIT)
    expect(SECONDS_PER_ITEM.cast).toBeGreaterThan(SECONDS_PER_ITEM.location)
  })

  /**
   * The worker draws locations and props two at a time, so the quote counts
   * windows rather than items. Credits are still per item — running two at once
   * does not make either of them free.
   */
  it('adds up a mixed scope the way the worker will run it', () => {
    const estimate = estimateReferenceExpress([
      { kind: 'cast' },
      { kind: 'location' },
      { kind: 'prop' },
      { kind: 'prop' },
    ])

    expect(estimate.itemCount).toBe(4)
    expect(estimate.seconds).toBe(
      SECONDS_PER_ITEM.cast + SECONDS_PER_ITEM.location + SECONDS_PER_ITEM.prop
    )
    expect(estimate.credits).toBe(CAST_ITEM_CREDITS + IMAGE_CREDIT * 3)
  })

  it('quotes a serial run when concurrency is turned off', () => {
    expect(
      estimateReferenceExpressSeconds(
        [{ kind: 'location' }, { kind: 'prop' }, { kind: 'prop' }],
        1
      )
    ).toBe(SECONDS_PER_ITEM.location + SECONDS_PER_ITEM.prop * 2)
  })

  it('never pairs a cast portrait with the item after it', () => {
    expect(
      estimateReferenceExpressSeconds([{ kind: 'cast' }, { kind: 'cast' }], 4)
    ).toBe(SECONDS_PER_ITEM.cast * 2)
  })

  it('quotes nothing for an empty scope', () => {
    expect(estimateReferenceExpress([])).toEqual({ itemCount: 0, seconds: 0, credits: 0 })
  })

  it('reads a short run in seconds and a long one in minutes', () => {
    expect(formatEstimatedDuration(0)).toBe('0 sec')
    expect(formatEstimatedDuration(30)).toBe('~30 sec')
    expect(formatEstimatedDuration(180)).toBe('~3 min')
  })

  it('states the whole commitment in one line', () => {
    const line = formatReferenceExpressEstimate(
      estimateReferenceExpress([{ kind: 'cast' }, { kind: 'location' }, { kind: 'prop' }])
    )

    expect(line).toContain('3 items')
    expect(line).toContain('min')
    expect(line).toContain('credits')
  })

  it('says "1 item", not "1 items"', () => {
    expect(formatReferenceExpressEstimate(estimateReferenceExpress([{ kind: 'prop' }]))).toContain(
      '1 item,'
    )
  })
})
