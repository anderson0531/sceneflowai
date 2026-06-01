/** Pricing section — display strings for landing i18n. */

export const PRICING_LANDING_COPY = {
  badge: 'Usage-Based Pricing',
  title: 'Pay for What You Create',
  subtitle:
    'One base plan for platform access. Credits for AI generation. Top up when you need more. Full control, zero waste.',
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
      'Already have API keys for Vertex AI or ElevenLabs? Use them with SceneFlow AI and save up to 80% on platform credits.',
    savingsHighlight: '80% on platform credits',
    benefits: [
      {
        title: '80% SceneFlow Credit Savings',
        description: 'Pay only a 20% platform fee for orchestration & tools',
      },
      {
        title: 'Leverage Corporate Plans',
        description: 'Use your existing Vertex AI or ElevenLabs volume discounts',
      },
      {
        title: 'Full Control',
        description: 'Your keys, your billing, your cost management',
      },
    ],
    supportedProviders: 'Supported Providers',
    vertexName: 'Google Vertex AI',
    vertexDetail: 'Imagen 4 & Veo 3.1',
    elevenLabsName: 'ElevenLabs',
    elevenLabsDetail: 'Text-to-Speech & Voice Cloning',
    savingsLabel: '80% savings',
    onImagesVideo: 'on images & video',
    onVoiceover: 'on voiceover',
    note:
      'Credit savings shown are SceneFlow platform savings. Your actual total costs depend on your personal or corporate API pricing with each provider.',
  },
  creditTopUps: {
    title: 'Need More Credits?',
    subtitle: 'Top up anytime. Credits never expire.',
    packs: [
      { label: 'Starter Pack', description: 'Perfect for quick revisions' },
      { label: 'Scene Pack', description: 'Complete a short project' },
      { label: 'Production Pack', description: 'Major film sequence' },
      { label: 'Studio Pack', description: 'Full production capacity' },
    ],
    creditsUnit: 'credits',
  },
  calculator: {
    sectionTitle: 'Estimate Your Project',
    sectionSubtitle: 'Know exactly what you\'ll pay before you commit',
    title: 'Project Budget Calculator',
    subtitle: 'Estimate credits before you start',
    customize: 'Customize parameters',
    imagesLabel: 'Images to generate',
    videoClipsLabel: 'Video clips',
    voiceoverLabel: 'Voiceover (minutes)',
    byokTitle: 'Bring Your Own Key (BYOK)',
    byokBadge: 'Pro & Studio',
    byokDescription:
      'Use your own API keys to save up to 80% on SceneFlow credits. You pay the AI providers directly at their rates.',
    vertexToggle: 'Vertex AI (Images & Video)',
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
      'BYOK Note: Credit savings shown reflect SceneFlow platform credit reductions only. Your actual costs depend on your Vertex AI and ElevenLabs pricing plans. Corporate or high-volume API plans may offer additional savings.',
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
    moneyBack: '14-day money-back guarantee',
    creditsNeverExpire: 'Credits never expire (Explorer pack)',
  },
} as const
