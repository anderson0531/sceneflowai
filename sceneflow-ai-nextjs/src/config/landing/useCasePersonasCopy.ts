/** Use-case persona cards — display strings for landing i18n. */

export const USE_CASE_PERSONA_UI = {
  targetPersona: 'Target Persona',
  theChallenge: 'The Challenge',
  sceneFlowSolution: 'The SceneFlow Solution',
  beforeVsAfter: 'Before vs After',
  before: 'Before',
  after: 'After',
  theWin: 'The "Win"',
  frameAnchoredTitle: 'Frame-Anchored Continuity',
  frameAnchoredDescription:
    'SceneFlow is the only tool that allows Frame-Anchored continuity, ensuring your client\'s product or character remains identical across every scene segment.',
  demoComingSoon: 'Demo Coming Soon',
  closePreview: 'Close Preview',
  expandVideo: 'Expand Video',
  expandImage: 'Expand Image',
  conceptPreview: 'Use case concept',
  videoPreview: 'Video preview',
  orStartExplorer: 'start with the $9 Explorer plan',
  orPrefix: 'Or',
} as const

export const USE_CASE_SEGMENT_CTAS = {
  creator: {
    label: 'Start Your Production Test Flight',
    subtext: '$9 one-time • 750 credits • Full platform access',
  },
  team: {
    label: 'Book a Team Walkthrough',
    subtext: 'See how in-house teams replace vendor cycles',
  },
  productionShop: {
    label: 'Explore Vertical Templates',
    subtext: 'RE, education, docs, and more — see what you can productize',
  },
  agency: {
    label: 'See Team Pricing',
    subtext: 'Plans for agencies and production shops at scale',
  },
  filmProduction: {
    label: 'Start Your Pre-Vis Test Flight',
    subtext: '$9 one-time • Upload script → animatic in under 30 minutes',
  },
} as const

export const USE_CASE_PERSONAS = {
  creator: {
    label: 'Solo Creator',
    title: 'The YouTube Creator',
    beforeAfter: { before: '40 hrs', after: '25 mins' },
    challenge: {
      title: 'The "B-Roll" Bottleneck',
      description:
        'You have a strong script, but learning six separate generation and edit tools — or getting stuck in slot-machine video loops — slows every upload. Serialized YouTube hits and YouTube TV drama cadences demand faster turnaround than fragmented AI tabs can deliver.',
    },
    solution: {
      title: 'The Automated Storyteller',
      description:
        'Ship episodic series and scroll-stopping shorts from one studio — beat-first pre-vis, Reference Library continuity, and publish-ready masters for the YouTube-led creator economy.',
      features: [
        'Visuals that map cleanly to script beats',
        'Consistent protagonists across every scene',
        'Scale to episode series with a shared reference library',
      ],
    },
    win: 'Move from occasional uploads to a reliable production cadence with less overhead.',
    keyPhrases: ['Faster Turnaround', 'Consistent Characters', 'Series-Ready Workflow'],
  },
  team: {
    label: 'In-house Team',
    title: 'The In-House Video Team',
    beforeAfter: { before: '6 wks', after: 'Same wk' },
    challenge: {
      title: 'Vendor Backlog & Brand Drift',
      description:
        'Comms, L&D, and marketing teams wait weeks for agency or vendor video — or face an overwhelming tool stack with no repeatable in-house system. Every path brings inconsistent branding and stalled campaigns.',
    },
    solution: {
      title: 'Same-Week In-House Production',
      description:
        'Assign staff to produce video on a predictable credit budget — with brand templates, approval before final render, and no crew days or open-ended edit cycles.',
      features: [
        'Replace vendor shoots with guided in-house workflows',
        'Brand-safe templates and reference libraries',
        'Visible credit spend and budget caps per project',
        'Approve pre-vis before paying for final video',
      ],
    },
    win: 'Ship training, comms, and campaign video on your timeline — not the vendor\'s backlog.',
    keyPhrases: ['Predictable Cost', 'Brand Control', 'Same-Week Turnaround'],
  },
  productionShop: {
    label: 'Production Shop',
    title: 'The Niche Production Shop',
    beforeAfter: { before: '4+ hrs', after: '30–60 min' },
    challenge: {
      title: 'Custom Verticals, No Repeatable System',
      description:
        'Memoir, legacy, real estate, and education clients need fast turnaround — but every project starts from scratch. Per-deliverable handoffs plus slot-machine video re-rolls across script, image, voice, video, music, and edit tools eat margin on volume.',
    },
    solution: {
      title: 'Productize Your Video Service',
      description:
        'Build repeatable workflows for memoir studios and niche verticals. Template uploads, voice clones, avatars, and pre-vis approval — customize per client and grow margin on volume.',
      features: [
        'Memoir templates with photo uploads, voice clones, and avatar hosts',
        'Client intake tied to Blueprint and pre-vis approval phases',
        'White-label studio packages for legacy, tribute, and subscription video',
        'Margin on credits instead of per-shoot overhead',
      ],
    },
    win: 'Launch a video memoir or niche studio service with repeatable delivery — not a one-off freelance grind.',
    keyPhrases: ['Memoir Templates', 'Voice & Avatar Identity', 'Repeatable Delivery'],
  },
  agency: {
    label: 'Agency',
    title: 'The Client Delivery Lead',
    beforeAfter: { before: '3 wk delivery', after: '3 day delivery' },
    challenge: {
      title: 'Client Delivery at Scale',
      description:
        'Winning the pitch is only half the battle. Recurring client work needs fast turnaround — but per-deliverable handoffs and slot-machine video re-rolls across separate generation and edit tools slow every pitch cycle.',
    },
    solution: {
      title: 'Throughput + Client Approval',
      description:
        'Move from pitch spec to recurring delivery with brand-safe controls, client review before final render, and predictable credit costs per project.',
      features: [
        'Fast pre-visualization for pitches and client sign-off',
        'Reusable templates for recurring client formats',
        'Budget visibility through every iteration',
        'Scalable delivery without adding headcount',
      ],
    },
    win: 'Deliver faster pitch cycles and recurring client work with less production risk and more margin.',
    keyPhrases: ['Client Approvals', 'Delivery Throughput', 'Budget Predictability'],
  },
  filmProduction: {
    label: 'Film Production',
    title: 'The Film Producer',
    beforeAfter: { before: 'Weeks of previz', after: '<30 mins' },
    challenge: {
      title: 'Slow Pre-Vis Before You Can Test the Story',
      description:
        'You have a script — but table reads, storyboard cycles, and fragmented previz tools delay investor pitches, audience tests, and greenlight decisions.',
    },
    solution: {
      title: 'Script-First Interactive Pre-Visualization',
      description:
        'Upload your script (MDX, FDX, and other formats), optimize with Audience Resonance, and generate an interactive pre-visualization in under 30 minutes — in 70+ language options, with additional language overlays in under 5 minutes.',
      features: [
        'Upload & import scripts (MDX, FDX, and more)',
        'Optimize with Audience Resonance',
        'Interactive pre-vis in under 30 minutes',
        '70+ languages + overlays in under 5 minutes',
        'Revise and export script (MDX and other formats)',
        'Screening Room for audience-testing the full animatic',
      ],
    },
    win: 'Validate story and audience fit before principal photography — with a shareable animatic, not a weeks-long previz cycle.',
    keyPhrases: ['Script-First Pre-Vis', 'Audience Resonance', 'Screening Room Testing'],
  },
} as const

export type UseCasePersonaId = keyof typeof USE_CASE_PERSONAS
