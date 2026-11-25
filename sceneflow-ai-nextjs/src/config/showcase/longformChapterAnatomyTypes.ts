export type AnatomyDeliveryMode = 'feature' | 'series'

export interface ChapterAnatomyItem {
  id: string
  chapterNumber: number
  featureLabel: string
  seriesLabel: string
  timecodeRange: string
  durationLabel: string
  eraBadge: string
  title: string
  /** Existing local poster image in `public/` (zero external/GCP fetch) */
  posterImage: string
  /** Optional chapter sample video URL (wired when user provides a full sample chapter) */
  sampleVideoUrl?: string
  /** Highlight badge for the chapter ready for full-chapter video playback */
  featuredChapterBadge?: string
  clientInputLabel: string
  clientInputDetail: string
  reenactmentPeople: string
  reenactmentLocation: string
  reenactmentCulture: string
  reenactmentAudioProps: string
  narrativeSummary: string
}

export interface ShortformMathStat {
  metric: string
  label: string
  shortformReality: string
  sceneFlowReality: string
}

export interface LongformChapterAnatomyLocaleCopy {
  eyebrow: string
  heading: string
  subtitle: string
  modeLabel: string
  modeFeatureLabel: string
  modeFeatureMeta: string
  modeSeriesLabel: string
  modeSeriesMeta: string
  totalRuntimeBadge: string
  totalFramesBadge: string
  inputBoxHeading: string
  recreatedBoxHeading: string
  labelPeople: string
  labelLocation: string
  labelCulture: string
  labelAudioProps: string
  livingVaultNote: string
  sampleChapterReadyBadge: string
  sampleChapterNote: string
  watchChapterCta: string
  chapters: readonly [
    ChapterAnatomyItem,
    ChapterAnatomyItem,
    ChapterAnatomyItem,
    ChapterAnatomyItem,
    ChapterAnatomyItem,
    ChapterAnatomyItem,
  ]
  mathHeading: string
  mathSubtitle: string
  mathShortformLabel: string
  mathSceneFlowLabel: string
  mathStats: readonly [ShortformMathStat, ShortformMathStat, ShortformMathStat]
}
