/** Pricing section — display strings for landing i18n. */

export const PRICING_LANDING_COPY = {
  badge: 'Simple Pricing',
  title: 'Start with Explorer — $9',
  subtitle:
    'Test the complete pipeline now with a frictionless $9 entry.',
  explorerHighlight:
    'The fastest way to experience the complete SceneFlow studio — from concept to Screening Room.',
  trustBadges: [
    'Secure payments via Whop',
    '$9 Explorer to try the studio',
    'Monthly credits expire at period end',
    'Cancel anytime',
  ],
  valueAnchor: {
    traditionalCost: '$2,000+',
    traditionalLabel: 'Traditional pre-vis',
    vs: 'vs',
    sceneFlowCost: '$49-149',
    sceneFlowLabel: 'SceneFlow monthly',
    saveBadge: 'Save 90%+ per project',
  },
  teamCta: {
    title: 'In-house team or institution?',
    description: 'Book a workflow walkthrough for comms, L&D, and marketing teams',
    button: 'Book Walkthrough',
  },
  agencyCta: {
    title: 'Agency or production shop?',
    description: 'Custom credits, SLA, and dedicated support at scale',
    button: 'Contact Sales',
  },
  byok: {
    title: 'Bring Your Own Key',
    badge: 'Pro & Studio Plans',
    description:
      'Your API key can run reference, still, and clip generations. SceneFlow charges a 20% orchestration fee on those jobs. Hosted SceneFlow rates can be lower than a personal API account as platform volume grows.',
    savingsHighlight: '20% orchestration fee',
    benefits: [
      {
        title: 'References, stills, and clips',
        description: 'BYOK applies only when your key actually runs those generations',
      },
      {
        title: 'Hosted rates can be lower',
        description: 'SceneFlow platform pricing can undercut a personal Vertex or Kling account',
      },
      {
        title: 'Full Control',
        description: 'Your keys, your provider bill, plus a platform orchestration fee',
      },
    ],
    supportedProviders: 'Supported Providers',
    vertexName: 'Google Vertex AI',
    vertexDetail: 'References, stills, and Omni clips',
    elevenLabsName: 'Kling',
    elevenLabsDetail: 'Clip generation when your key is used',
    savingsLabel: '20% fee',
    onImagesVideo: 'on references, stills, and clips',
    onVoiceover: 'when your key runs the job',
    note:
      'The 20% fee is a SceneFlow orchestration charge. Provider usage bills to your account. SceneFlow-hosted generation can cost less than bringing a personal key.',
  },
  creditTopUps: {
    title: 'Need More Credits?',
    subtitle: 'Buy $25, $100, or $250 add-ons as often as you need. Each pack lasts 12 months.',
    packs: [
      { label: '$25 Add-on', description: '2,000 credits. Buy as often as you need.' },
      { label: '$100 Add-on', description: '9,000 credits. Buy as often as you need.' },
      { label: '$250 Add-on', description: '25,000 credits. Buy as often as you need.' },
    ],
    creditsUnit: 'credits',
  },
  calculator: {
    sectionTitle: 'Estimate Your Project',
    sectionSubtitle: 'Know exactly what you\'ll pay before you commit',
    title: 'Production Planner',
    subtitle: 'Plan shot iterations and a dated schedule, then check pace and spend on your phone.',
    customize: 'Customize parameters',
    imagesLabel: 'Images to generate',
    videoClipsLabel: 'Video clips',
    voiceoverLabel: 'Voiceover (minutes)',
    byokTitle: 'Bring Your Own Key (BYOK)',
    byokBadge: 'Pro & Studio',
    byokDescription:
      'Use your own key for references, stills, and clips. SceneFlow charges a 20% orchestration fee, and hosted rates can be lower than a personal API account.',
    vertexToggle: 'Vertex AI (references, stills, and clips)',
    elevenLabsToggle: 'ElevenLabs (Voiceover)',
    imageGeneration: 'Image Generation',
    videoGeneration: 'Video Generation',
    voiceover: 'Voiceover',
    byokTag: '(BYOK)',
    totalEstimate: 'Total Estimate',
    withTopUps: 'with top-ups',
    creditSavings: 'SceneFlow credit savings',
    savePercent: 'You save {percent}% on SceneFlow credits',
    transparency:
      'Full transparency: You\'ll see real-time credit usage as you work. No surprises—adjust your project scope anytime.',
    transparencyHighlight: 'Full transparency:',
    byokDisclaimer:
      'BYOK Note: The platform fee applies only to reference, still, and clip generations that run on your key. SceneFlow-hosted model rates can be lower than an individual account.',
    byokDisclaimerHighlight: 'BYOK Note:',
    presets: [
      { id: 'commercial', name: '30-sec Commercial' },
      { id: 'short', name: '2-min Short Film' },
      { id: 'episode', name: '10-min Episode' },
      { id: 'feature', name: '90-min Feature' },
    ],
    minSuffix: 'min',
  },
  tierGrid: {
    productionTestFlight: 'Production Test Flight',
    getStarted: 'Get Started',
    startTestFlight: 'Start Test Flight',
    loading: 'Loading...',
    mostPopular: 'Most Popular',
    creditsPerMonth: 'Credits/mo',
    storage: 'Storage',
    perMonth: '/month',
  },
  trust: {
    cancelAnytime: 'Cancel anytime',
    moneyBack: '$9 Explorer to try the studio',
    creditsNeverExpire: 'Explorer credits last 90 days',
  },
} as const
