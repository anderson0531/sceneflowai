export const NEW_SERIES_EPISODE_COUNT = 5

export const SERIES_PRODUCTION_FORMATS = [
  {
    value: 'narrative',
    label: 'Narrative',
    hint: 'Serialized story with a continuing cast',
  },
  {
    value: 'educational',
    label: 'Educational',
    hint: 'Instructional episodes that build on each other',
  },
  {
    value: 'podcast',
    label: 'Podcast',
    hint: 'A recurring hosted or audio series',
  },
  {
    value: 'documentary',
    label: 'Documentary',
    hint: 'Episodic nonfiction with a consistent approach',
  },
  {
    value: 'demo',
    label: 'Product Demo',
    hint: 'A product shown across a sequence of episodes',
  },
  {
    value: 'sales',
    label: 'Sales',
    hint: 'A persuasive walkthrough with a clear offer',
  },
  {
    value: 'news',
    label: 'News',
    hint: 'Current events told as a continuing series',
  },
] as const

export type SeriesProductionFormat = (typeof SERIES_PRODUCTION_FORMATS)[number]['value']

const FORMAT_VALUES = new Set<string>(SERIES_PRODUCTION_FORMATS.map((format) => format.value))

export function isSeriesProductionFormat(value: string): value is SeriesProductionFormat {
  return FORMAT_VALUES.has(value)
}

/** Formats whose synopsis must stay non-fiction. */
export const NON_FICTION_PRODUCTION_FORMATS = new Set<SeriesProductionFormat>([
  'educational',
  'documentary',
  'news',
  'demo',
  'sales',
])

export function isNonFictionProductionFormat(format: string): boolean {
  return NON_FICTION_PRODUCTION_FORMATS.has(format as SeriesProductionFormat)
}
