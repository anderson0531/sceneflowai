export type AudienceCardCopy = {
  id: 'services' | 'aspiring' | 'experienced'
  badge: string
  title: string
  description: string
  highlights: readonly [string, string, string]
  ctaLabel: string
  targetAnchor: string
}

export type SuperpowerPillarCopy = {
  id: 'baseline' | 'dialog' | 'review' | 'agents' | 'collaboration'
  number: string
  badge: string
  title: string
  description: string
  outcomeTag: string
  videoClipKey?: 'comparison' | 'direction' | 'agent' | 'publish'
}

export type SuperpowerMicroVisualsCopy = {
  baseline: {
    intakePrompt: string
    autoBadge: string
    steps: readonly [
      { step: string; detail: string },
      { step: string; detail: string },
      { step: string; detail: string },
    ]
  }
  dialog: {
    quote: string
    chipCast: string
    chipWardrobe: string
  }
  review: {
    arLabel: string
    arStatus: string
    gateSeries: string
    gateBlueprint: string
    gateScript: string
    flowDirectorNote: string
  }
  agents: {
    rows: readonly [
      { label: string; status: string },
      { label: string; status: string },
      { label: string; status: string },
    ]
  }
  collaboration: {
    approvedBadge: string
    dubsChip: string
  }
}

export type ServiceVerticalCopy = {
  id: 'memoir' | 'realestate' | 'training' | 'brand'
  tabLabel: string
  badge: string
  title: string
  description: string
  clientBuyer: string
  traditionalMarketRangeLabel: string
  typicalRetailUsd: number
  priceTiersUsd: readonly [number, number, number]
  retailRangeLabel: string
  estComputeUsd: number
  estOperatorUsd: number
  activeMinutesLabel: string
  keyAdvantage: string
}

export type UseCaseTrackCopy = {
  id:
    | 'memoir-services'
    | 'commercial-training'
    | 'series-animation'
    | 'creator-podcast'
    | 'filmmaker-pitch'
  tabLabel: string
  badge: string
  headline: string
  description: string
  featureIcons: readonly string[]
}

export type ClientStepCopy = {
  step: string
  title: string
  detail: string
}

export type GuidedRoomCallout = {
  label: string
  detail: string
}

export type GuidedRoomVisualsCopy = {
  topBadge: string
  bottomBadge: string
  thumbLabels: readonly [string, string, string, string]
}

export type GuidedRoomCopy = {
  id: 'series-desk' | 'blueprint-board' | 'production-stage' | 'screening-room'
  stepNumber: string
  tabLabel: string
  badge: string
  title: string
  promise: string
  creatorExampleTitle: string
  creatorExampleNote: string
  serviceExampleTitle: string
  serviceExampleNote: string
  callouts: readonly [GuidedRoomCallout, GuidedRoomCallout, GuidedRoomCallout]
  visuals: GuidedRoomVisualsCopy
}

export type StudioLandingCopy = {
  heroDock: {
    tagline: string
    primaryCta: string
    businessCta: string
    howItWorksCta: string
  }
  audienceGateway: {
    eyebrow: string
    title: string
    titleAccent: string
    subtitle: string
    cards: readonly [AudienceCardCopy, AudienceCardCopy, AudienceCardCopy]
  }
  superpowers: {
    eyebrow: string
    title: string
    titleAccent: string
    subtitle: string
    watchClipLabel: string
    pillars: readonly [
      SuperpowerPillarCopy,
      SuperpowerPillarCopy,
      SuperpowerPillarCopy,
      SuperpowerPillarCopy,
      SuperpowerPillarCopy,
    ]
    microVisuals: SuperpowerMicroVisualsCopy
  }
  videoServices: {
    eyebrow: string
    title: string
    titleAccent: string
    subtitle: string
    commercialRightsBadge: string
    costSavingsPillLabel: string
    verticalsHeading: string
    whoBuysLabel: string
    marginAdvantageLabel: string
    calculatorBadge: string
    calculatorTitle: string
    priceTierLabel: string
    priceTierNames: readonly [string, string, string]
    volumeLabel: string
    projectsPerMonthSuffix: string
    projectsUnitLabel: string
    perProjectProfitLabel: string
    traditionalMarketLabel: string
    typicalFeeLabel: string
    fullyLoadedCostLabel: string
    costBreakdownSubLabel: string
    estComputeLabel: string
    activeHandsOnLabel: string
    monthlyGrossLabel: string
    monthlyNetLabel: string
    perMonthSuffix: string
    marginBadgeSuffix: string
    disclaimer: string
    launchBusinessCta: string
    workflowHeading: string
    stepPrefix: string
    workflowSteps: readonly [ClientStepCopy, ClientStepCopy, ClientStepCopy, ClientStepCopy]
    verticals: readonly [
      ServiceVerticalCopy,
      ServiceVerticalCopy,
      ServiceVerticalCopy,
      ServiceVerticalCopy,
    ]
  }
  guidedTour: {
    eyebrow: string
    title: string
    titleAccent: string
    subtitle: string
    stepPrefix: string
    lensLabel: string
    lensCreator: string
    lensService: string
    watchRoomVideoLabel: string
    inspectFullScreenLabel: string
    openLiveScreeningLabel: string
    screeningModalTitle: string
    examplesBridgeText: string
    examplesBridgeCta: string
    rooms: readonly [GuidedRoomCopy, GuidedRoomCopy, GuidedRoomCopy, GuidedRoomCopy]
  }
  useCaseDirectory: {
    viewByUseCaseLabel: string
    viewByRoomLabel: string
    tracks: readonly [
      UseCaseTrackCopy,
      UseCaseTrackCopy,
      UseCaseTrackCopy,
      UseCaseTrackCopy,
      UseCaseTrackCopy,
    ]
  }
  directoryDrawer: {
    badge: string
    title: string
    subtitle: string
    expandCta: string
    collapseCta: string
  }
  academyStrip: {
    badge: string
    title: string
    subtitle: string
    pills: readonly [string, string, string]
    watchAcademyCta: string
    startExplorerCta: string
  }
}
