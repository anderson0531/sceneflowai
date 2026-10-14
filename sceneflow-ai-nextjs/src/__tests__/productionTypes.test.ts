import { describe, expect, it } from 'vitest'
import { resolveContentIntentFromMetadata } from '@/lib/content/contentIntent'
import {
  DEFAULT_SERIES_PRODUCTION_FORMAT,
  SERIES_PRODUCTION_CATEGORIES,
  SERIES_PRODUCTION_FORMATS,
  getSeriesProductionProfile,
  isSeriesProductionFormat,
  seriesProductionFormatsByCategory,
} from '@/config/series/productionFormats'
import {
  getSeriesFormatMapping,
  seriesBibleSchemaBlock,
  seriesBibleTaskBlock,
} from '@/lib/series/episodeBatchPrompt'

const LEGACY_FORMATS = ['narrative', 'educational', 'podcast', 'documentary', 'demo', 'sales', 'news']

describe('production type catalog', () => {
  it('defaults new series to cinematic drama and keeps legacy ids valid', () => {
    expect(DEFAULT_SERIES_PRODUCTION_FORMAT).toBe('cinematic_drama')
    expect(getSeriesProductionProfile(DEFAULT_SERIES_PRODUCTION_FORMAT)?.label).toBe('Cinematic Drama')
    for (const format of LEGACY_FORMATS) {
      expect(isSeriesProductionFormat(format)).toBe(true)
    }
  })

  it('groups every type under a category', () => {
    const grouped = seriesProductionFormatsByCategory()
    expect(grouped.map((group) => group.label)).toEqual(
      SERIES_PRODUCTION_CATEGORIES.map((category) => category.label)
    )
    const listed = grouped.flatMap((group) => group.formats.map((format) => format.value))
    expect(listed).toEqual(SERIES_PRODUCTION_FORMATS.map((format) => format.value))
    expect(listed).toContain('thriller')
    expect(listed).toContain('true_crime')
    expect(listed).toContain('audio_drama')
    expect(listed).toContain('case_study')
  })
})

describe('production type intent', () => {
  it('keeps a documentary selection informational when clarify infers a fiction genre', () => {
    expect(
      resolveContentIntentFromMetadata({
        format: 'documentary',
        genre: 'drama',
      })
    ).toBe('informational')
    expect(
      resolveContentIntentFromMetadata({
        format: 'true_crime',
        genre: 'thriller',
      })
    ).toBe('informational')
    expect(
      resolveContentIntentFromMetadata({
        format: 'cinematic_drama',
        genre: 'documentary',
      })
    ).toBe('fiction')
  })

  it('still honors an explicit stored content intent', () => {
    expect(
      resolveContentIntentFromMetadata({
        contentIntent: 'fiction',
        format: 'documentary',
        genre: 'drama',
      })
    ).toBe('fiction')
  })

  it('keeps blueprint genre lookup when the format is not a series type', () => {
    expect(
      resolveContentIntentFromMetadata({
        format: 'short_film',
        genre: 'documentary',
      })
    ).toBe('informational')
  })
})

describe('non-fiction storyline mapping', () => {
  it('tells a documentary bible to narrate the subject instead of inventing a fatal flaw', () => {
    const mapping = getSeriesFormatMapping('documentary')
    expect(mapping.nonFiction).toBe(true)
    expect(mapping.mappingInstruction).toContain("creator's stated subject")
    expect(mapping.mappingInstruction).toContain('Do NOT invent a fictional plot, cast, antagonist, or fatal flaw')
    expect(mapping.mappingInstruction).toContain('Do NOT invent a fictional antagonist')

    const task = seriesBibleTaskBlock('documentary', 5)
    const schema = seriesBibleSchemaBlock('documentary')
    expect(task).toContain('stated subject')
    expect(task).toContain('Do NOT invent a protagonist fatal flaw or a fictional antagonist')
    expect(schema).toContain('Do not invent a fatal flaw')
    expect(schema).toContain('Not a fictional antagonist')
  })

  it('lets cinematic drama and audio drama invent a story', () => {
    const drama = getSeriesFormatMapping('cinematic_drama')
    const audio = getSeriesFormatMapping('audio_drama')
    expect(drama.nonFiction).toBe(false)
    expect(audio.nonFiction).toBe(false)
    expect(drama.mappingInstruction).toContain('cinematic drama')
    expect(drama.mappingInstruction).not.toContain('Do NOT invent a fictional plot')
    expect(audio.mappingInstruction).toContain('audio drama')
    expect(audio.mappingInstruction).not.toContain('Do NOT invent a fictional plot')
    expect(seriesBibleSchemaBlock('cinematic_drama')).toContain('Fatal flaw')
  })

  it('applies the same factual ban to news, education, and commercial types', () => {
    for (const format of ['news', 'educational', 'sports', 'explainer', 'demo', 'sales']) {
      const mapping = getSeriesFormatMapping(format)
      expect(mapping.nonFiction).toBe(true)
      expect(mapping.mappingInstruction).toContain('Do NOT invent a fictional plot, cast, antagonist, or fatal flaw')
    }
  })
})
