export type RealEstateBlueprintMode = 'remodel' | 'preconstruction'

export interface RealEstateChapterItem {
  id: string
  chapterNumber: number
  timecodeRange: string
  durationLabel: string
  remodelBadge: string
  remodelTitle: string
  preconBadge: string
  preconTitle: string
  posterImage: string
  clientInputLabel: string
  clientInputDetail: string
  fidelityStructure: string
  fidelityArchitecture: string
  fidelityLifestyle: string
  fidelityBuyerAudio: string
  narrativeSummary: string
}

export interface RealEstateAnatomyLocaleCopy {
  verticalTabLifeStory: string
  verticalTabRealEstate: string
  eyebrow: string
  heading: string
  subtitle: string
  modeLabel: string
  modeRemodelLabel: string
  modeRemodelMeta: string
  modePreconLabel: string
  modePreconMeta: string
  totalRuntimeBadge: string
  retainerRangeBadge: string
  inputBoxHeading: string
  recreatedBoxHeading: string
  labelStructure: string
  labelArchitecture: string
  labelLifestyle: string
  labelBuyerAudio: string
  complianceNote: string
  watchSampleCta: string
  chapters: readonly [
    RealEstateChapterItem,
    RealEstateChapterItem,
    RealEstateChapterItem,
    RealEstateChapterItem,
  ]
}
