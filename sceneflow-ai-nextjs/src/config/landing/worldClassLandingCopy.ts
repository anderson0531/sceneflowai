/**
 * Canonical copy & 7-locale priority translations for SceneFlow Studio's
 * Creator + Video Services Business landing page architecture.
 *
 * Wired into `buildEnMessages()` under `studioLanding` so `messages/en.json`
 * stays 100% reproducible via `npm run i18n:build-en`, with complete native
 * translations for `es`, `pt`, `hi`, `zh-CN`, `ar`, and `th`.
 */

import { STUDIO_LANDING_COPY_AR } from './locales/ar'
import { STUDIO_LANDING_COPY_ES } from './locales/es'
import { STUDIO_LANDING_COPY_HI } from './locales/hi'
import { STUDIO_LANDING_COPY_PT } from './locales/pt'
import { STUDIO_LANDING_COPY_TH } from './locales/th'
import { STUDIO_LANDING_COPY_ZH_CN } from './locales/zhCN'
import type { StudioLandingCopy } from './locales/types'

export * from './locales/types'

export const WORLD_CLASS_LANDING_COPY: StudioLandingCopy = {
  heroDock: {
    tagline:
      'Direct original films & series — or build a high-margin video production business. Zero filmmaking or prompt skills required.',
    primaryCta: 'Launch Studio ($9)',
    businessCta: 'Explore Video Business',
    howItWorksCta: 'See How It Works',
  },
  audienceGateway: {
    eyebrow: 'One Studio · Three Ways to Win',
    title: 'Create Original Worlds.',
    titleAccent: 'Or Build a Profitable Video Business.',
    subtitle:
      'SceneFlow pairs an expert AI production crew with conversational direction—empowering solo storytellers, multi-episode creators, and client-facing video businesses alike.',
    cards: [
      {
        id: 'services',
        badge: 'Income Opportunity · 65–85% Typical Margin',
        title: 'Video Delivery Businesses',
        description:
          'Deliver bespoke Life Memoirs, Real Estate Walkthroughs, Corporate Training, and Brand Films for paying clients in hours instead of weeks—with full commercial ownership.',
        highlights: [
          'Guided story-first client intake & multi-age cast continuity',
          'Shared links for Blueprint, Continuity & Screening Room sign-off',
          'Hybrid client photos + 4K AI re-enactments keep margins high',
        ],
        ctaLabel: 'Explore Business Models & Margins',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: 'No Film School or Prompting Needed',
        title: 'Aspiring Storytellers & Authors',
        description:
          'Have a memoir, novel, or channel idea in your head? Describe your story in everyday spoken or typed words and let SceneFlow generate your expert baseline script and world.',
        highlights: [
          'Instant expert baseline for Series, Blueprint & Script',
          'Speak or type changes in plain language—zero prompt syntax',
          'Watch your voiced Animatic before spending credits on motion',
        ],
        ctaLabel: 'Take the 4-Step Studio Tour',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: 'Series Channels · Podcasts · Investor Pre-vis',
        title: 'Experienced Creators & Filmmakers',
        description:
          'End slot-machine regenerations. Lock recurring cast faces, per-shot wardrobes, custom voices, and sets in your Continuity Vault—then scale production 10x with autonomous agents.',
        highlights: [
          'Multi-episode Continuity Vault & per-shot wardrobe control',
          'Audience Resonance & FlowDirector greenlight review',
          'Autonomous agents build 27+ scenes & 70+ language dubs',
        ],
        ctaLabel: 'See the 5 Studio Superpowers',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'The SceneFlow Design Philosophy',
    title: 'Five Studio Superpowers.',
    titleAccent: 'Zero Technical Manual.',
    subtitle:
      'Traditional AI video forces you to juggle fragmented tools and write hundreds of brittle prompts. SceneFlow gives you an intelligent baseline, natural voice/text direction, executive review, and autonomous build agents.',
    watchClipLabel: 'Watch 30s Overview',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: 'Never Face a Blank Page',
        title: 'Auto Expert Baseline Generation',
        description:
          'Start with a simple concept or story-first interview. SceneFlow automatically writes a structured Series Bible, Film Blueprint, and Production Script—complete with individual character arcs, era-accurate locations, and dramatic beats.',
        outcomeTag: 'Series · Blueprint · Production Script',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: 'Voice or Typed Direction',
        title: 'Full Director Control via Intelligent Dialog',
        description:
          'Direct like a filmmaker, not a prompt engineer. Speak or type to reshape story beats, split characters across life stages (Age 17, 32, 62), pick exact per-shot wardrobes, or surgically refine any frame.',
        outcomeTag: 'Zero Prompt Engineering',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: 'Greenlight Before You Spend',
        title: 'Audience Resonance & FlowDirector Review',
        description:
          'Built-in Audience Resonance scores your Series, Blueprint, and Script against your target audience, while FlowDirector highlights pacing gaps and applies one-click creative upgrades before rendering video.',
        outcomeTag: 'Series · Blueprint · Script Scoring',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'Hands-Free Scale',
        title: 'Autonomous Fast-Track Production Agents',
        description:
          'Once your script and Pre-vis Animatic feel right, launch Audio Agent, Stills Agent, Clips Agent, or full Production Agents to build dozens of scenes, self-heal failed takes, and notify you when your cut is ready.',
        outcomeTag: '300+ Manual Prompts Replaced',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: 'Client Sign-Off & Global Reach',
        title: 'Shared Review Links, Screening Room & 70+ Languages',
        description:
          'Share clean browser links for Blueprint, Script, and frame-accurate Screening Room sign-off—then deliver localized streams in 70+ languages while directing in 7 native Studio UI languages.',
        outcomeTag: 'Share Links · Screening Room · 70+ Dubs',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: 'Story Intake: “Tell me your story...”',
        autoBadge: 'Auto-Generated in Seconds',
        steps: [
          { step: '1 · Series Bible', detail: '6-Ep Arc + Shared Vault' },
          { step: '2 · Film Blueprint', detail: 'Resonating Beats + Multi-Age Cast' },
          { step: '3 · Production Script', detail: 'Dialogue, Wardrobes & Camera' },
        ],
      },
      dialog: {
        quote:
          '“Split John into Age 17, Age 32 & Age 62—and put Elara in her Evening Gala Silk Coat for Shot 2.”',
        chipCast: '✓ 3 Age-Stage Cast Cards Locked',
        chipWardrobe: '✓ Shot 2 Wardrobe: Gala Silk Coat',
      },
      review: {
        arLabel: 'Audience Resonance',
        arStatus: 'Greenlight Ready · 3 Gates',
        gateSeries: 'Series 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Script 94',
        flowDirectorNote: 'FlowDirector: 1-click emotional midpoint boost (+6 pts)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · Voices, SFX & Score', status: '27 / 27 Ready' },
          { label: 'Stills Agent · Continuity Keyframes', status: '100% Locked' },
          { label: 'Clips Agent · Self-Healing Motion', status: 'Auto-Verified' },
        ],
      },
      collaboration: {
        approvedBadge: 'Approved ✓',
        dubsChip: '+70 Dubs',
      },
    },
  },
  videoServices: {
    eyebrow: 'Monetize Your Creativity · B2B & Client Services',
    title: 'Turn SceneFlow Into a',
    titleAccent: 'High-Margin Video Business',
    subtitle:
      'Families, realtors, schools, and local businesses pay $200 to $2,500+ for custom storytelling videos—yet traditional crews cost thousands. Deliver unforgettable productions in hours and keep 100% of your client revenue.',
    commercialRightsBadge: '100% Commercial Ownership · Deliver Client Masters Anywhere',
    verticalsHeading: '1. Choose a High-Demand Client Service',
    whoBuysLabel: 'Who Buys Repeatedly',
    marginAdvantageLabel: 'SceneFlow Margin Advantage',
    calculatorBadge: 'Interactive Unit Economics Preview',
    calculatorTitle: '2. Estimate Your Monthly Service Income',
    volumeLabel: 'Client deliveries / month:',
    projectsPerMonthSuffix: 'projects/mo',
    typicalFeeLabel: 'Typical client price',
    estComputeLabel: 'Est. SceneFlow compute',
    activeHandsOnLabel: 'Hands-on direction',
    monthlyGrossLabel: 'Est. Monthly Client Billing',
    monthlyNetLabel: 'Est. Net Creator Income (before base plan)',
    perMonthSuffix: '/ mo',
    marginBadgeSuffix: 'gross margin',
    disclaimer:
      'Illustrative estimates using SceneFlow’s hybrid Pre-vis Animatic + selective 4K AI clip workflow ($0.01/credit add-on rate). You set your own client pricing and terms.',
    launchBusinessCta: 'Launch Your Video Service ($9)',
    workflowHeading: 'How a Client Project Flows in 4 Effortless Steps',
    stepPrefix: 'Step',
    workflowSteps: [
      {
        step: '01',
        title: 'Story-First Client Intake',
        detail:
          'Interview your client ("Tell me your story") to capture resonating life or brand beats and key individuals.',
      },
      {
        step: '02',
        title: 'Shared Blueprint Sign-Off',
        detail:
          'Refine with Audience Resonance internally, then send a clean Blueprint link for client approval before production.',
      },
      {
        step: '03',
        title: 'Hybrid Photo + AI Build',
        detail:
          'Combine real client photos with multi-age cast continuity, custom wardrobes, and autonomous Audio Agent / Clips Agent.',
      },
      {
        step: '04',
        title: 'Screening Room Delivery',
        detail:
          'Share a private Screening Room link for frame-accurate review, export the 4K master, and collect payment.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Video Memoirs',
        badge: '$350–$799 / film · High Emotional Value',
        title: 'Life Stories, Milestone Tributes & Family Biographies',
        description:
          'Blend treasured family photographs with cinematic AI era re-enactments and accurate multi-age character continuity (e.g., Age 17 → Age 32 → Age 62) narrated in warm, lifelike voices.',
        clientBuyer:
          'Families, milestone birthdays, estate planners, senior communities & funeral homes',
        typicalRetailUsd: 450,
        retailRangeLabel: '$350–$799',
        estComputeUsd: 75,
        activeMinutesLabel: '~45 min',
        keyAdvantage:
          'Hybrid Documentary mode mixes real archival photos with selective hero AI clips for 80%+ margins.',
      },
      {
        id: 'realestate',
        tabLabel: 'Real Estate Tours',
        badge: '$199–$399 / listing · Repeat Brokerage Volume',
        title: 'Narrated Luxury Property & Boutique Hospitality Tours',
        description:
          'Turn listing photographs and neighborhood highlights into scored, narrated cinema walkthroughs—plus instant Mandarin, Spanish, Arabic, or Portuguese versions for international buyers.',
        clientBuyer:
          'Residential realtors, luxury brokerages, vacation rentals & boutique hotels',
        typicalRetailUsd: 275,
        retailRangeLabel: '$199–$399',
        estComputeUsd: 22,
        activeMinutesLabel: '~20 min',
        keyAdvantage:
          'One realtor listing 4 homes a month becomes a recurring monthly retainer account.',
      },
      {
        id: 'training',
        tabLabel: 'Training & SOPs',
        badge: '$600–$2,500 / course · 70+ Languages',
        title: 'Corporate Onboarding, Safety & Multilingual Courses',
        description:
          'Lock a consistent instructor avatar, uniforms, and workplace sets in your Continuity Vault—then ship crystal-clear training episodes localized across every employee’s native language.',
        clientBuyer:
          'HR & L&D teams, manufacturers, healthcare clinics, restaurants & franchises',
        typicalRetailUsd: 950,
        retailRangeLabel: '$600–$2,500',
        estComputeUsd: 80,
        activeMinutesLabel: '~60 min',
        keyAdvantage:
          'Update one changed compliance beat in minutes without hiring actors or reshooting.',
      },
      {
        id: 'brand',
        tabLabel: 'Brand Stories',
        badge: '$400–$1,200 / package · Web + Social',
        title: 'Founder Origin Films, Clinic Explainers & Social Ads',
        description:
          'Craft high-converting homepage brand stories paired with automatic 9:16 vertical trailers for Instagram, TikTok, and YouTube Shorts—vetted with clients in the Screening Room.',
        clientBuyer:
          'Medical/dental practices, law firms, local SMBs, agencies & e-commerce founders',
        typicalRetailUsd: 600,
        retailRangeLabel: '$400–$1,200',
        estComputeUsd: 40,
        activeMinutesLabel: '~35 min',
        keyAdvantage:
          'Upsell seasonal promo cutdowns from the client’s saved Continuity Vault.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Visual Studio Tour · No Jargon',
    title: 'Four Connected Rooms.',
    titleAccent: 'One Effortless Flow.',
    subtitle:
      'Explore how an idea moves from story concept to approved client or audience master—using live showcases from our Studio Sandbox instead of a dense technical manual.',
    stepPrefix: 'Step',
    lensLabel: 'Preview lens:',
    lensCreator: 'Original Series ("The Glass Ledger")',
    lensService: 'Client Service ("Life Story Memoir")',
    watchRoomVideoLabel: 'Watch 30s Room Tour',
    inspectFullScreenLabel: 'Inspect Full Studio Screen',
    openLiveScreeningLabel: 'Open Live Sandbox Screening Room',
    screeningModalTitle: 'The Glass Ledger — Sandbox Screening Room',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'Series Room',
        badge: 'Multi-Episode World & Continuity Bible',
        title: 'Build a Reusable Universe Once—Not Just a Single Clip',
        promise:
          'Describe a series channel, training curriculum, or multi-chapter biography once. SceneFlow builds your Story Bible, Episode Slate, and Shared Reference Library so every episode stays on-model.',
        creatorExampleTitle: 'The Glass Ledger · 6-Episode Neo-Noir Thriller',
        creatorExampleNote:
          'Shared Cast (Elara Vance, Marcus Thorne, Dr. Aris Kael), Archive Vault set, and Quartz Codex prop lock across all 6 episodes with a 91/100 Audience Resonance baseline.',
        serviceExampleTitle: 'Multi-Chapter Family Legacy or Corporate Curriculum',
        serviceExampleNote:
          'Save a client’s approved hosts, family eras, or workplace locations once—then spin up Episode 2 through Episode 10 in one click with zero visual drift.',
        callouts: [
          {
            label: 'Instant Series Baseline & Audience Resonance Score',
            detail:
              'Auto-generates synopsis, episode arcs, and Audience Resonance scoring before production.',
          },
          {
            label: 'Shared Reference Library',
            detail:
              'Characters, voices, wardrobes, sets, and props transfer automatically into every episode.',
          },
          {
            label: 'Voice or Text Series Director',
            detail:
              'Speak or type adjustments to reshape season arcs or individual episodes effortlessly.',
          },
        ],
        visuals: {
          topBadge: 'Series AR: 91 / 100 · 6 Episodes Synced',
          bottomBadge: 'Shared Reference Library Locked Across All Episodes',
          thumbLabels: [
            'Elara Vance · Lead',
            'Marcus Thorne · Cast',
            'Archive Vault · Set',
            'Quartz Codex · Prop',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint Room',
        badge: 'Story-First Intake, Multi-Age Cast & Greenlight',
        title: 'Lock a Resonating Story & Cast Before Spending on Video',
        promise:
          'Start from a natural story interview or concept. Blueprint Room structures your beats, highlights individual characters per beat, locks multi-age identity, and lets clients or collaborators sign off via shared link.',
        creatorExampleTitle: 'Beat-by-Beat Treatment & Visual Style Lock',
        creatorExampleNote:
          'Each beat pairs dramatic intent with participating characters, anamorphic lighting rules, and narrated Audience Resonance feedback.',
        serviceExampleTitle: 'Intelligent Memoir Interview & Multi-Age Continuity',
        serviceExampleNote:
          'Starts with "Tell me your story," clarifies resonating life beats, and creates distinct age-stage characters (e.g., Age 17, Age 32, Age 62) with locked ancestral heritage.',
        callouts: [
          {
            label: 'Story-First Guided Interview',
            detail:
              'Draws out rich personal or brand stories and highlights specific individuals in every beat.',
          },
          {
            label: 'Multi-Age Character Continuity',
            detail:
              'Creates separate age-specific character references so a 1970s youth and modern elder never blur together.',
          },
          {
            label: 'Audience Resonance + Shared Blueprint Link',
            detail:
              'Verify story impact with AI audience scoring and collect client approval from a clean browser link.',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR: 92 / 100 · Beat-by-Beat Cast Highlights',
          bottomBadge: 'Multi-Age Character Continuity + Shared Client Sign-Off Link',
          thumbLabels: [
            'Protagonist Arc',
            'Dr. Aris Kael · Beat 2',
            'Harbor Deck · Act II',
            'Chrono-Key · Plot Lock',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'Production Stage',
        badge: 'Shot Director, Wardrobe Control & Autonomous Agents',
        title: 'Preview the Voiced Animatic—Then Let Agents Build Your Shots',
        promise:
          'Review your baseline Production Script, lock Continuity references, watch the full voiced Pre-vis Animatic, select exact per-shot wardrobes in Shot Director, and run autonomous agents across all scenes.',
        creatorExampleTitle: 'Scene 1: Subterranean Archive Vault · Anamorphic 4K',
        creatorExampleNote:
          'Switch Elara’s wardrobe per shot, direct camera framing by voice or text, blend multi-track dialogue/SFX/score in Production Mixer, and dispatch Production Agents.',
        serviceExampleTitle: 'Hybrid Client Photos + Cinematic Era Re-Enactments',
        serviceExampleNote:
          'Place real client photographs on Ken Burns beats alongside 4K AI re-enactments for unphotographed memories—keeping a 15-minute memoir under ~$75 in compute.',
        callouts: [
          {
            label: 'Per-Shot Wardrobe & Voice/Typed Shot Director',
            detail:
              'Pick exact outfits per shot and refine framing or expressions conversationally—no slot-machine re-rolls.',
          },
          {
            label: 'Voiced Pre-vis Animatic Firewall',
            detail:
              'Hear dialogue, narration, SFX, and music over storyboard stills before spending motion credits.',
          },
          {
            label: 'Autonomous Audio Agent, Stills Agent & Clips Agent',
            detail:
              'Generate scene-by-scene or launch full Production Agents to build and stitch automatically.',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · Wardrobe Selected · Pre-vis Animatic Ready',
          bottomBadge: 'Audio Agent, Stills Agent & Clips Agent Orchestrate All Scenes Automatically',
          thumbLabels: [
            'Shot 1 · Wide Vault',
            'Shot 3 · Macro Prop',
            'Scene 2 · Handoff',
            'Scene 3 · Tracking',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: 'Screening Room',
        badge: 'Frame-Accurate Review, 70+ Languages & Publishing',
        title: 'Collaborate via Private Link & Ship Globally in Any Language',
        promise:
          'Screen animatics, rough cuts, and final 4K masters in one unified player. Collect timestamped client or team notes, spin up 70+ in-scene dubbed streams, and export or publish anywhere.',
        creatorExampleTitle: 'Premiere-Ready Master, Promo Trailers & Global Dubs',
        creatorExampleNote:
          'Cut vertical 9:16 trailers automatically, regenerate localized dialogue streams across 70+ markets, and publish to YouTube or apply to SceneFlow Originals.',
        serviceExampleTitle: 'Frictionless Client Review & Multilingual Delivery',
        serviceExampleNote:
          'Clients watch on phone or desktop with zero login required, leave timestamped notes, and receive pristine MP4 deliverables in their family’s or workforce’s language.',
        callouts: [
          {
            label: 'Zero-Login Shared Review Links',
            detail:
              'Send private `/share/screening-room/` links for effortless client, executive, or family sign-off.',
          },
          {
            label: '70+ Language In-Scene Sync Streams',
            detail:
              'Preserves ambient SFX and score while aligning localized voices and dialogue across global markets.',
          },
          {
            label: '4K Master Export & Promo Cutdowns',
            detail:
              'Download clean commercial masters with full IP ownership or ship trailers directly to social channels.',
          },
        ],
        visuals: {
          topBadge: 'Frame-Accurate Notes · Zero-Login Client Link',
          bottomBadge: '7 Studio UI Locales · 70+ In-Scene Language Streams',
          thumbLabels: [
            'EN · Original Master',
            'ES / PT · Synced Dub',
            'ZH / TH / HI · Streams',
            '9:16 Promo Cutdown',
          ],
        },
      },
    ],
  },
  directoryDrawer: {
    badge: 'Complete Studio Specification · 30+ Capabilities',
    title: 'Want Every Technical Detail? Explore the Full Studio Directory',
    subtitle:
      'Open the interactive room-by-room reference catalog to inspect full-resolution 5K workspace screenshots across Series Room, Blueprint Room, Production Stage, Production Mixer, and Screening Room.',
    expandCta: 'Open Full 30-Feature Directory',
    collapseCta: 'Hide Full 30-Feature Directory',
  },
  academyStrip: {
    badge: 'Zero Learning Curve Guarantee · Studio Academy',
    title: 'Never Feel Overwhelmed. Press ? Anywhere for a 60-Second Visual Guide.',
    subtitle:
      'Every Studio room includes a Just-In-Time (JIT) Screen Map with numbered callouts, one-click actions, Pre-vis credit guardrails, and our interactive “Your First Film in 10 Minutes” simulator.',
    pills: [
      'Context-Aware ? Screen Maps',
      '“First Film in 10 Minutes” Simulator',
      'Pre-vis Credit Guardrails Built In',
    ],
    watchAcademyCta: 'Watch 30s Academy Tour',
    startExplorerCta: 'Start with Explorer — $9',
  },
}

export const WORLD_CLASS_LANDING_TRANSLATIONS: Record<
  'es' | 'pt' | 'hi' | 'zh-CN' | 'ar' | 'th',
  StudioLandingCopy
> = {
  es: STUDIO_LANDING_COPY_ES,
  pt: STUDIO_LANDING_COPY_PT,
  hi: STUDIO_LANDING_COPY_HI,
  'zh-CN': STUDIO_LANDING_COPY_ZH_CN,
  ar: STUDIO_LANDING_COPY_AR,
  th: STUDIO_LANDING_COPY_TH,
}

export function resolveLocalizedStudioLandingCopy(locale: string): StudioLandingCopy {
  const normalized =
    locale === 'zh' || locale.toLowerCase().startsWith('zh')
      ? 'zh-CN'
      : (locale.split('-')[0] as keyof typeof WORLD_CLASS_LANDING_TRANSLATIONS)

  return (
    WORLD_CLASS_LANDING_TRANSLATIONS[
      normalized as keyof typeof WORLD_CLASS_LANDING_TRANSLATIONS
    ] ?? WORLD_CLASS_LANDING_COPY
  )
}
