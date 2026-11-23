/** Pricing section — display strings for landing i18n. */

export const PRICING_LANDING_COPY = {
  badge: 'Studio Membership & Usage Pricing',
  title: 'Start with Explorer — $9',
  subtitle:
    'Start your first film today for $9—turn your idea into a structured Blueprint, cast your characters, and preview your first scene. Then subscribe to retain your Continuity Vault and add credits as you finish your production.',
  explorerHighlight:
    'No technical filmmaking skills required—built for everyday storytellers, chapter-by-chapter indie creators, video podcasters, series channels, and bespoke video production businesses.',
  trustBadges: [
    'Secure payments via Whop',
    '$9 Explorer to try the studio',
    'Active membership retains Continuity Vault',
    'Cancel anytime',
  ],
  valueAnchor: {
    traditionalCost: '$5,000–$50,000+',
    traditionalLabel: 'Traditional pre-vis & production',
    vs: 'vs',
    sceneFlowCost: '$29–$599/mo + Add-Ons',
    sceneFlowLabel: 'SceneFlow Studio & Client Vault Hosting',
    saveBadge: 'Save 90%+ per production',
  },
  filmmakerPerspectives: {
    heading: 'One Studio Platform. Built for White-Label Operators & Creators.',
    subheading:
      'Whether you are launching a high-margin White-Label Video Service Business, publishing episodic chapters, pitching financiers, or scaling a multi-PM agency, your monthly base covers platform access and Continuity Vault hosting while Add-On packs scale on demand.',
    recommendedPathLabel: 'Recommended path:',
    cards: [
      {
        id: 'hybrid',
        badge: 'Flagship • White-Label Video Business • $149/mo',
        title: 'White-Label Video Service Providers',
        description:
          'Launch a solo Life Memoir, Real Estate Tour, or Corporate Training business under your own brand on Operator Pro ($149/mo — self-funding $29 Blueprint Pass & $19 Iteration Packs at 83% margin with 0 PM hours, Family/Team Comment-Only Triage, Deferred PM Routing, 150 GB Client Vault, 10,000 credits/mo & $250 bulk add-on access). Pays for itself 3x on Client Order #1.',
        recommendedPlan: 'Operator Pro ($149/mo · $1,490/yr)',
      },
      {
        id: 'series',
        badge: 'Multi-PM Agencies & Production Slates • $599/mo',
        title: 'Multi-PM Agencies & Corporate L&D Teams',
        description:
          'Run 100s of concurrent client slates on Agency Scale ($599/mo — 750 GB Client Vault, unlimited white-label portals, Blueprint Conversion Funnel with 1-click stale nudges & automated pass revenue tracking, 10 PM/QA seats with Deferred PM Routing, Kanban SLA, Client CRM & PM Margin Scorecard, 1-Click Draft Purge & 45,000 credits/mo).',
        recommendedPlan: 'Agency Scale ($599/mo · $5,990/yr)',
      },
      {
        id: 'chapter',
        badge: 'Indie Creators, Podcasters & Pre-Vis • $59/mo',
        title: 'Chapter Creators & Production Funding Packages',
        description:
          'Skip rendering a 90-minute feature upfront. Publish 5–15 minute episodic chapters, intercut live studio podcast clips, or deliver voiced Pre-Vis pitch packages with 50 GB Vault hosting and 4,500 credits/mo.',
        recommendedPlan: 'Filmmaker & Pre-Vis ($59/mo · $590/yr)',
      },
      {
        id: 'hobbyist',
        badge: 'Solo Storytellers & Vault Hosting • $29/mo',
        title: 'Storytellers & Personal Continuity Vaults',
        description:
          'Bring personal stories, books, or family histories to life with zero filmmaking skills required—while keeping characters, voice clones, and Screening Room links hosted in a 25 GB Active Continuity Vault.',
        recommendedPlan: 'Creator & Vault ($29/mo · $290/yr)',
      },
    ],
  },
  membershipModel: {
    badge: 'Predictable Platform & Vault Hosting + On-Demand Compute',
    title: 'Monthly Platform & Client Vault Hosting. Scale Compute With Add-Ons.',
    description:
      'SceneFlow separates predictable recurring platform access, white-label client portal hosting, and media storage from burst video generation—protecting your margins and keeping client Screening Room links live year-round.',
    pillars: [
      {
        title: '1. Monthly Platform & Active Client Vault Hosting ($29–$599/mo)',
        description:
          'An active monthly (or 2-months-free annual) plan covers studio access, white-label client portals, and relative media/project storage (25 GB to 750 GB)—preserving cast faces, voice clones, and live client Screening Room links, plus starter monthly credits.',
      },
      {
        title: '2. Finish Client Slates on Demand With 12-Month Add-On Packs',
        description:
          'Active monthly subscribers purchase $25 (2,000 cr) or $100 (9,000 cr) packs anytime—and Operator Pro & Agency Scale unlock the $250 Bulk Pack (25,000 cr at $0.010/cr). Add-On packs last 12 months while your membership stays active.',
      },
      {
        title: '3. Elastic Vault Expansion (+$15/mo per 100 GB) & $19/mo Pause-to-Vault',
        description:
          'Growing client archives expand smoothly at +$15/mo per extra 100 GB. Need a quiet month? Switch to $19/mo Pause-to-Vault Hosting so every existing client Screening Room link and Continuity Vault stays online with zero broken deliveries.',
      },
    ],
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
      "Connect your own Google Vertex AI or Kling API keys on Pro & Studio plans for direct provider billing (with a 20% platform orchestration fee)—or use SceneFlow's hosted credits to take advantage of our volume-discounted model rates.",
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
    title: 'Subscriber Pay-As-You-Produce Add-On Packs',
    subtitle:
      'Exclusively for active monthly members. Buy $25, $100, or $250 add-ons as often as you need. Each pack lasts 12 months.',
    packs: [
      {
        label: '$25 Add-on',
        credits: '2,000 credits',
        description: '2,000 credits ($0.0125/cr) — ideal for finishing a 5–15 min chapter or Promo Trailer.',
      },
      {
        label: '$100 Add-on',
        credits: '9,000 credits',
        description: '9,000 credits ($0.0111/cr) — ideal for multi-chapter series bursts or Pre-Vis pitch packages.',
      },
      {
        label: '$250 Operator Bulk',
        credits: '25,000 credits',
        description: '25,000 credits ($0.0100/cr) — exclusive to Operator Pro & Agency Scale for client slates.',
      },
    ],
    subscriberNote:
      'Requires an active monthly membership (Creator, Filmmaker, Operator Pro, or Agency Scale) to purchase packs and retain Client & Continuity Vault storage.',
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
    productionTestFlight: '30-Day Studio Test Flight',
    getStarted: 'Get Started',
    startTestFlight: 'Start Test Flight',
    requestPreLaunchAccess: 'Request Pre-Launch Access',
    loading: 'Loading...',
    mostPopular: 'Most Popular',
    creditsPerMonth: 'Credits/mo',
    storage: 'Continuity Vault',
    perMonth: '/month',
  },
  trust: {
    cancelAnytime: 'Cancel anytime',
    moneyBack: '$9 Explorer to try the studio',
    creditsNeverExpire: 'Explorer credits last 90 days',
  },
} as const

