import { describe, it, expect } from 'vitest'
import { getCreditCost, IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  CAST_ITEM_CREDITS,
  SECONDS_PER_ITEM,
  estimateReferenceExpress,
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

  it('adds up a mixed scope', () => {
    const estimate = estimateReferenceExpress([
      { kind: 'cast' },
      { kind: 'location' },
      { kind: 'prop' },
      { kind: 'prop' },
    ])

    expect(estimate.itemCount).toBe(4)
    expect(estimate.seconds).toBe(
      SECONDS_PER_ITEM.cast + SECONDS_PER_ITEM.location + SECONDS_PER_ITEM.prop * 2
    )
    expect(estimate.credits).toBe(CAST_ITEM_CREDITS + IMAGE_CREDIT * 3)
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
