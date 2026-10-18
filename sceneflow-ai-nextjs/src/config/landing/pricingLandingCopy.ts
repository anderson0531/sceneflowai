/** Pricing section — display strings for landing i18n. */

export const PRICING_LANDING_COPY = {
  badge: 'Studio Membership & Usage Pricing',
  title: 'Start with Explorer — $9',
  subtitle:
    'Test the complete pipeline with a $9 Test Flight, then choose a monthly Studio Membership to retain your Continuity Vault and scale production at your pace.',
  explorerHighlight:
    'From personal stories and 5–15 minute episodic chapters to investor Pre-Vis pitch packages and $500–$5,000 hybrid productions.',
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
    sceneFlowCost: '$19–$599/mo + Add-Ons',
    sceneFlowLabel: 'SceneFlow Studio & Continuity Vault',
    saveBadge: 'Save 90%+ per production',
  },
  filmmakerPerspectives: {
    heading: 'One Studio Pipeline. Built for Four Filmmaker Realities.',
    subheading:
      'Whether you are crafting a personal film for family, building a monetized social series one chapter at a time, pitching financiers, or running a hybrid live-action + AI shoot, your plan scales with how you produce.',
    cards: [
      {
        id: 'hobbyist',
        badge: 'Personal & Vault Keeper • $19/mo',
        title: 'Personal Stories & Off-Season Vault Retention',
        description:
          'Create meaningful films, memoirs, and stories for family and friends using voiced Pre-Vis animatics and selective video clips—or use the $19/mo plan between shoots to keep your Continuity Library of characters, wardrobes, and sets active.',
        recommendedPlan: 'Hobbyist ($19/mo)',
      },
      {
        id: 'chapter',
        badge: 'New & Indie Creators • $49/mo',
        title: 'The 5–15 Minute Chapter Strategy',
        description:
          'Skip the cost and time barrier of rendering a 90-minute feature upfront. Publish your story in 5–15 minute scenes or episodic chapters to manage your monthly compute budget while steadily building an audience.',
        recommendedPlan: 'Starter ($49/mo)',
      },
      {
        id: 'series',
        badge: 'Monetized Channels • $149/mo',
        title: 'Sticky Character Continuity for Social Series',
        description:
          'Audiences subscribe to channels when they recognize recurring characters. Your Continuity Vault locks cast faces, outfits, custom voice clones, and locations across episodes so you can sustainably monetize on YouTube, TikTok, and Reels.',
        recommendedPlan: 'Pro ($149/mo)',
      },
      {
        id: 'hybrid',
        badge: 'Experienced & Hybrid Filmmakers • $149–$599/mo',
        title: 'Pre-Vis Funding Packages & $500–$5,000 Hybrid Shoots',
        description:
          'Export industry-standard scripts (PDF, FDX, Fountain) paired with a Pre-Vis Animatic and Promo Trailer to secure investor funding—or upload live-filmed scenes and blend them with 4K AI shots at a fraction of physical production costs.',
        recommendedPlan: 'Pro / Studio + Add-Ons',
      },
    ],
  },
  membershipModel: {
    badge: 'Predictable Base + Flexible Compute',
    title: 'How Studio Membership & Pay-As-You-Produce Add-Ons Work',
    description:
      'SceneFlow separates recurring studio & asset hosting from burst production compute—so your characters and world stay locked year-round, and you only pay for heavy generation when cameras roll.',
    pillars: [
      {
        title: '1. Base Membership Retains Your Continuity Vault',
        description:
          'An active monthly plan ($19–$599/mo) maintains your studio access, Screening Room links, and Active Continuity Vault—preserving your recurring cast faces, wardrobes, custom voice clones, locations, and Series Bibles across seasons, plus monthly base credits.',
      },
      {
        title: '2. Scale Up Anytime with 12-Month Add-On Packs',
        description:
          'Active monthly members can purchase $25, $100, or $250 Add-On credit packs on demand whenever ramping up for a multi-episode season or a $500–$5,000 hybrid feature shoot. Add-On packs last 12 months while your membership remains active.',
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
        label: '$250 Add-on',
        credits: '25,000 credits',
        description: '25,000 credits ($0.0100/cr) — built for $500–$5,000 hybrid productions and feature slates.',
      },
    ],
    subscriberNote:
      'Requires an active monthly membership (Hobbyist, Starter, Pro, or Studio) to purchase and retain Continuity Vault storage.',
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

