import { describe, it, expect } from 'vitest'
import {
  formatBlueprintRuntime,
  getBlueprintCoreFields,
} from '@/lib/blueprint/formatBlueprintCore'

describe('formatBlueprintRuntime', () => {
  it('humanizes seconds to minutes', () => {
    expect(formatBlueprintRuntime('600 seconds')).toEqual({
      display: '10 min',
      raw: '600 seconds',
    })
  })

  it('humanizes single second', () => {
    expect(formatBlueprintRuntime('45 seconds')).toEqual({
      display: '45 sec',
      raw: '45 seconds',
    })
  })

  it('humanizes minutes with remainder seconds', () => {
    expect(formatBlueprintRuntime('90 seconds')).toEqual({
      display: '1 min 30 sec',
      raw: '90 seconds',
    })
  })

  it('humanizes hour-plus runtimes', () => {
    expect(formatBlueprintRuntime('3661 seconds')).toEqual({
      display: '1:01:01',
      raw: '3661 seconds',
    })
  })

  it('falls back to raw string when not numeric seconds', () => {
    expect(formatBlueprintRuntime('Feature (90–120m)')).toEqual({
      display: 'Feature (90–120m)',
      raw: 'Feature (90–120m)',
    })
  })
})

describe('getBlueprintCoreFields', () => {
  it('normalizes core variant fields', () => {
    expect(
      getBlueprintCoreFields({
        title: ' The White House Waltz ',
        logline: 'A thaw unfolds.',
        genre: 'Docu-Drama',
        format_length: '600 seconds',
        target_audience: 'News viewers',
        author_writer: 'Jane Doe',
        date: 'May 19, 2026',
      })
    ).toEqual({
      title: 'The White House Waltz',
      logline: 'A thaw unfolds.',
      genre: 'Docu-Drama',
      formatLength: '600 seconds',
      targetAudience: 'News viewers',
      authorWriter: 'Jane Doe',
      date: 'May 19, 2026',
    })
  })
})
