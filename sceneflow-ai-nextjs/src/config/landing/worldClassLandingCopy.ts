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
import { MOBILE_COMPANION_COPY_EN } from './mobileCompanionCopy'
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
        badge: 'Income Opportunity · 65–85% Gross Service Margin',
        title: 'Video Delivery Businesses',
        description:
          'Lead with high-margin Life Memoirs—then stack repeat monthly retainers across Corporate Training, Real Estate, and Brand Films with full commercial ownership.',
        highlights: [
          'Zero-login white-label portals for Intake, Blueprint, Continuity & Screening',
          'Voiced Pre-vis Animatic & round caps prevent costly client reshoots',
          'Hybrid client photos + cinema AI re-enactments protect 65–85% margins',
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
        badge: 'Pre- & Post-Render Expert QA',
        title: 'Audience Resonance & FlowDirector Video Review',
        description:
          'Audience Resonance scores your Series, Blueprint, and Script pre-render—then FlowDirector reviews rendered scene videos from both the Audience and Director perspectives, applying one-click fixes via Shot Director to recreate clips across 20+ active client projects.',
        outcomeTag: 'Audience + Director Video QA · 1-Click Clip Fixes',
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
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: 'Pre-Render Gates + Scene Video QA',
        gateSeries: 'Series 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Scene AR 86→89',
        flowDirectorNote:
          'FlowDirector Scene Video QA: Audience AR 86 + Director 81 → 1-click fix recreates clip (+3 AR)',
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
    eyebrow: 'Video Delivery Services · Solo Operators & Agencies',
    title: 'Deliver $1,500+ Production Value at',
    titleAccent: '50%–80% Lower Cost to Produce',
    subtitle:
      'Traditional crews and 30-hour manual edits price out 90% of families, realtors, and local businesses. Start with flagship Life Memoirs via local referral partners—then layer recurring B2B retainers while cutting fully-loaded delivery cost (compute + operator time) by 50% to 80%.',
    commercialRightsBadge: '100% Commercial Ownership · White-Label Client Portals (Pro+)',
    costSavingsPillLabel: 'Flagship Life Memoirs + Recurring B2B Retainers',
    verticalsHeading: '1. Lead with Our Flagship Wedge — Then Expand into Repeat Retainers',
    globalDemandLabel: 'Massive Global Market Opportunity',
    whoBuysLabel: 'Who Buys Repeatedly',
    partnerChannelsLabel: 'Zero-Ad-Spend Referral Partners',
    marginAdvantageLabel: 'SceneFlow Margin & Scope Advantage',
    calculatorBadge: 'Scope-Matched Cost & Profit Estimator',
    calculatorTitle: '2. Stress-Test Delivery Cost & Monthly Service Profit',
    priceTierLabel: 'Client package tier:',
    priceTierNames: ['Accessible', 'Standard', 'Boutique'],
    tierScopePrefix: 'Package scope:',
    volumeLabel: 'Client deliveries / month:',
    projectsPerMonthSuffix: 'projects/mo',
    projectsUnitLabel: 'projects',
    stressTestToggleLabel: 'Stress-test: Month-1 Ramp-Up + Pro Plan ($149/mo)',
    stressTestOnBadge: 'ON',
    stressTestOffBadge: 'OFF',
    stressTestActiveNote:
      'Conservative ramp-up active: +60% beginner PM hours, +30% extra retake compute buffer, and $149/mo Operator Pro membership (includes 10,000 base credits/mo + 150 GB Vault).',
    proPlanLineLabel: 'Pro plan ($149/mo) + extra compute',
    proPlanCreditsIncludedNote: ' (10k cr incl.)',
    perProjectProfitLabel: 'Service profit / project',
    traditionalMarketLabel: 'Typical market rate',
    typicalFeeLabel: 'Your client price',
    fullyLoadedCostLabel: 'Delivery cost / project',
    costBreakdownSubLabel: 'Credits + PM time',
    estComputeLabel: 'Compute (incl. 20% retake buffer)',
    activeHandsOnLabel: 'Operator / PM time (@$50/hr)',
    monthlyGrossLabel: 'Est. Monthly Client Billing',
    monthlyNetLabel: 'Est. Monthly Service Profit (after compute & PM time)',
    perMonthSuffix: '/ mo',
    marginBadgeSuffix: 'service margin',
    disclaimer:
      'Scope-matched delivery cost includes SceneFlow compute ($0.01/credit add-on rate with 20% retake buffer) plus operator/PM time valued at $50/hr. Toggle Stress-Test above to include beginner ramp-up time and Pro ($149/mo) membership; excludes local sales/marketing.',
    launchBusinessCta: 'Build Your First Sample Film ($9)',
    launchBusinessSubnote:
      'Use the $9 Explorer test flight to produce a watermark-free portfolio sample for local partners—then upgrade to Pro ($149/mo) for 100% White-Label Client Portals.',
    foundingCharterCta:
      'Launching a client studio now? View the 25-Seat Founding Operator Charter',
    foundingCharterTitle: 'Founding Video Service Operator 90-Day Pro Charter',
    trustShieldHeading: 'Enterprise-Grade Margin, Privacy & Commercial IP Shield',
    trustShieldPillars: [
      {
        title: 'Zero-Login White-Label Portals (Pro+)',
        detail:
          'Clients review under your studio name, logo, and colors with zero SceneFlow login or credit pricing exposed.',
      },
      {
        title: 'Animatic Firewall & Hard Scope Caps',
        detail:
          'Clients sign off on Blueprint, Continuity, and Voiced Animatic before motion spend—with enforced revision-round and credit caps.',
      },
      {
        title: 'Never Trained on Client Photos or Stories',
        detail:
          'Sensitive family archives and B2B assets never train shared AI models, strip EXIF GPS on upload, and log explicit likeness consent.',
      },
    ],
    playbooksBadge: 'Service-in-a-Box Starter Kits Included',
    playbooksHeading: 'Turnkey Operator Playbooks, Rate Cards & Partner Pitch Templates',
    playbooksSubtitle:
      'Accelerate past cold-start guesswork with battle-tested vertical SOPs built directly into SceneFlow Studio:',
    playbooksItems: [
      '7-Language AI Biographer & B2B Client Intake Playbooks',
      '3-Tier Package Rate Cards & In-App Margin Floor Calculator',
      '20% Referral Partner Pitch Sheet (Senior Living, Funeral Homes & Realtors)',
      'Built-In Clickwrap Media, Multi-Age Likeness & Voice Consent Ledger',
    ],
    agencyScaleOps: {
      badge: 'Multi-PM Agency Scale · 100s of Client Projects',
      title: 'Agency Operations Command Center, Built Right Into the Studio',
      subtitle:
        'Scale from solo operator to a global multi-PM video agency without spreadsheets, leaked margins, or bloated storage.',
      pillars: [
        {
          title: 'Kanban Pipeline & SLA Alerts',
          detail:
            'Track every order from Intake to Delivered with inline target delivery dates, overdue alerts, and >48h waiting-on-client nudges.',
        },
        {
          title: 'Client CRM & PM Margin Scorecard',
          detail:
            'Group repeat clients automatically, monitor per-PM credit burn & turnaround times, and verify real-time gross margin.',
        },
        {
          title: 'Multi-PM Isolation & Locale Auto-Routing',
          detail:
            'Delegate entire Series Bibles, isolate workspaces with signed PM invites, assign 0-credit QA Reviewers, and auto-route global intakes by language.',
        },
        {
          title: 'Unlimited Scale & 1-Click Draft Purge',
          detail:
            'Server-side search & bulk PM actions across 100s of projects plus 1-click Archive & Purge Draft Intermediates keeping final masters intact.',
        },
      ],
    },
    workflowHeading: 'How a White-Label Client Project Flows in 4 Effortless Steps',
    stepPrefix: 'Step',
    workflowSteps: [
      {
        step: '01',
        title: 'Zero-Login Story Intake',
        detail:
          'Send a branded Intake link ("Tell me your story") with mandatory likeness/media consent to capture key individuals and beats.',
      },
      {
        step: '02',
        title: 'Shared Blueprint Sign-Off',
        detail:
          'Verify story impact with Audience Resonance internally, then lock client Blueprint approval before spending on renders.',
      },
      {
        step: '03',
        title: 'Mobile Photo Upload & Continuity Lock',
        detail:
          'Clients upload real photos from their phone (EXIF GPS stripped) and approve multi-age Cast, Wardrobes & Sets within capped rounds.',
      },
      {
        step: '04',
        title: 'Screening Room Master Delivery',
        detail:
          'Collect frame-accurate notes on a zero-login Screening Room link, ship 4K + 70-language masters, and purge raw uploads in 1 click.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Video Memoirs',
        roleTag: '★ Flagship High-Margin Wedge',
        badge: '$349–$1,250 / film · Market Rate: $1,200–$4,500+',
        title: 'Life Stories, Milestone Tributes & Family Biographies',
        description:
          'Blend treasured family photographs with cinematic AI era re-enactments, heirloom prop locks, and accurate multi-age character continuity (e.g., Age 17 → Age 32 → Age 62) narrated in warm, lifelike voices.',
        globalMarketNeed:
          'Hundreds of millions of aging parents, 50th anniversaries, and celebrations of life happen globally every year—yet 90%+ go unfilmed because $2,000+ crews are unaffordable.',
        clientBuyer:
          'Families celebrating milestone birthdays, 50th anniversaries, retirements & legacy tributes',
        partnerChannels:
          'Estate planners, senior living communities, funeral directors & milestone event planners (15–20% referral partner model)',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [349, 599, 1250],
        tierScopeLabels: [
          '5-min Milestone Tribute · 75% Photos + 1080p→4K Clips · 1 Lang',
          '12-min Family Memoir · Multi-Age Cast + Era Clips · 2 Langs',
          '20-min Legacy Documentary · 4K Eras + Heirloom Locks · 4 Langs',
        ],
        computeTiersUsd: [18, 34, 72],
        operatorTiersUsd: [62, 88, 150],
        activeTimeTiersLabels: ['~1.25 hrs', '~1.75 hrs', '~3.0 hrs'],
        retailRangeLabel: '$349–$1,250',
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.75 hrs',
        keyAdvantage:
          'Our highest-conviction wedge: zero-competition multi-age continuity delivers a $2,000-caliber family film for ~$122 total cost (~$34 compute + ~$88 PM time).',
      },
      {
        id: 'realestate',
        tabLabel: 'Real Estate Tours',
        roleTag: '↻ Repeat Broker Retainer',
        badge: '$199–$549 / listing · Market Rate: $450–$1,500+',
        title: 'Narrated Luxury Property & Boutique Hospitality Tours',
        description:
          'Turn listing photographs and neighborhood highlights into scored, narrated cinema walkthroughs—plus instant Mandarin, Spanish, Arabic, or Portuguese versions for cross-border buyers.',
        globalMarketNeed:
          'Tens of millions of home listings, short-term rentals, and boutique hotels compete for domestic and international buyers worldwide every month—most still stuck with static photos.',
        clientBuyer:
          'Top-producing residential realtors, luxury brokerages, vacation rentals & boutique hotels',
        partnerChannels:
          'Real estate photography studios, MLS staging teams, luxury brokerages & hospitality marketers',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [199, 299, 549],
        tierScopeLabels: [
          '90s MLS Photo Walkthrough · 1080p Cinema + 1 Lang',
          '2-min Narrated Property Tour · 4K Upscaled + 2 Langs',
          '3-min Luxury Estate Film + 9:16 Reels · 4 International Langs',
        ],
        computeTiersUsd: [10, 15, 28],
        operatorTiersUsd: [38, 50, 88],
        activeTimeTiersLabels: ['~45 min', '~1.0 hr', '~1.75 hrs'],
        retailRangeLabel: '$199–$549',
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '~1.0 hr',
        keyAdvantage:
          'High repeat volume per broker: one luxury team listing 4 homes/month generates recurring monthly orders with zero travel or weather delays (~$65 delivery cost).',
      },
      {
        id: 'training',
        tabLabel: 'Training & SOPs',
        roleTag: '↻ Repeat B2B Retainer',
        badge: '$599–$1,800 / module · Market Rate: $1,500–$5,000+',
        title: 'Corporate Onboarding, Safety & Multilingual Courses',
        description:
          'Lock a consistent instructor presenter, uniforms, and workplace sets in your Continuity Vault—then ship standardized training episodes localized across every employee’s native language.',
        globalMarketNeed:
          'Every manufacturer, clinic network, hospitality group, and franchise globally battles frontline turnover, safety compliance, and multilingual workforces needing clear video SOPs.',
        clientBuyer:
          'HR & L&D leaders, manufacturers, healthcare clinic networks, restaurant groups & franchises',
        partnerChannels:
          'Fractional HR consultants, workplace safety auditors, LMS integrators & franchise associations',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [599, 950, 1800],
        tierScopeLabels: [
          '5-min SOP Module · Locked Instructor + 1 Workforce Lang',
          '10-min Safety / Onboarding Course · 3 Workforce Langs',
          '20-min Multi-Chapter Curriculum · 6+ Workforce Langs',
        ],
        computeTiersUsd: [24, 40, 78],
        operatorTiersUsd: [88, 125, 210],
        activeTimeTiersLabels: ['~1.75 hrs', '~2.5 hrs', '~4.2 hrs'],
        retailRangeLabel: '$599–$1,800',
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '~2.5 hrs',
        keyAdvantage:
          'Sticky B2B retainers: 70%+ lower cost (~$165 vs $3,000+ live shoots), and when compliance rules change, you charge an easy update fee to re-render one beat in minutes.',
      },
      {
        id: 'brand',
        tabLabel: 'Brand Stories',
        roleTag: '↻ Repeat SMB & Agency Pack',
        badge: '$399–$1,200 / pack · Market Rate: $3,000–$8,000+',
        title: 'Founder Origin Films, Clinic Explainers & Social Ads',
        description:
          'Craft high-converting homepage brand stories paired with automatic 9:16 vertical trailers for Instagram, TikTok, and YouTube Shorts—vetted with clients in the Screening Room.',
        globalMarketNeed:
          '30M+ local clinics, law firms, restaurants, and craft founders worldwide urgently need homepage trust videos and fresh 9:16 social ads—but are locked out by $5,000+ agency shoots.',
        clientBuyer:
          'Medical/dental practices, law firms, local SMBs, web design agencies & e-commerce founders',
        partnerChannels:
          'Local web design shops, SEO/performance ad agencies, business chambers & dental/medical consultants',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [399, 650, 1200],
        tierScopeLabels: [
          '60s Clinic / SMB Trust Spot + 1 Vertical 9:16 Cutdown',
          '2-min Founder Origin Film + 2 Social 9:16 Cutdowns',
          'Brand Film + 4 Multilingual Paid-Ad Hook Variations',
        ],
        computeTiersUsd: [16, 28, 56],
        operatorTiersUsd: [62, 88, 150],
        activeTimeTiersLabels: ['~1.25 hrs', '~1.75 hrs', '~3.0 hrs'],
        retailRangeLabel: '$399–$1,200',
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.75 hrs',
        keyAdvantage:
          'White-label fulfillment for local web & ad agencies (~$116 total delivery cost)—complete with automatic 9:16 social cutdowns.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Visual Studio Tour · No Jargon',
    title: 'Four Connected Rooms.',
    titleAccent: 'One Effortless Flow.',
    subtitle:
      'Learn the 4 Studio doors in 60 seconds—Series Room, Blueprint Room, Production Stage, and Screening Room—before clicking those exact live doors across the 6 full-length Production Examples below.',
    stepPrefix: 'Step',
    lensLabel: 'Preview lens:',
    lensCreator: 'Original Series ("The Glass Ledger")',
    lensService: 'Client Service ("Life Story Memoir")',
    watchRoomVideoLabel: 'Watch 30s Room Tour',
    inspectFullScreenLabel: 'Inspect Full Studio Screen',
    openLiveScreeningLabel: 'Open Live Sandbox Screening Room',
    screeningModalTitle: 'The Glass Ledger — Sandbox Screening Room',
    examplesBridgeText:
      'Now that you know the 4 Studio doors, test-drive them live across 6 full-length genres:',
    examplesBridgeCta: 'Try the 4 Live Doors in Production Examples',
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
          'Place real client photographs on Ken Burns beats alongside cinema AI re-enactments for unphotographed memories—keeping a 12-minute memoir around ~$34 in compute (and 20-min 4K legacy films under ~$75).',
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
  useCaseDirectory: {
    viewByUseCaseLabel: 'Browse by Use Case',
    viewByRoomLabel: 'Browse by Studio Room',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: 'Video Memoirs & Family Legacy',
        badge: 'Flagship Client Service · $349–$1,250/Film',
        headline: 'Turn Family Interviews & Keepsake Photos into Heirloom Cinema',
        description:
          'Capture a life story through zero-login 7-language intake, polish & de-age portraits in Character Selfie Studio from 1970s youth to modern day, dispatch autonomous Production Agents, run FlowDirector 1-click clip fixes, and deliver via a zero-login Screening Room link.',
        featureIcons: [
          'clientIntake',
          'selfieStudio',
          'startBlueprint',
          'treatment',
          'continuity',
          'directShot',
          'animatic',
          'scriptSupervisor',
          'productionAgent',
          'screeningCollab',
          'languageStreams',
        ],
      },
      {
        id: 'commercial-training',
        tabLabel: '20-Project Agencies & Training Video',
        badge: '20+ Concurrent Projects · Unified Production Agent + FlowDirector QA',
        headline: 'Manage 20 Concurrent Client Projects at 50%–80% Lower Cost with Workflow Automation',
        description:
          'Launch white-label portals & PM credit caps, verify net margins on shared Blueprints, dispatch the unified Production Agent across parallel Pre-Vis Audio, Keyframe Stills, Motion Clips, and MP4 Scene Renders with self-healing [Investigate] recovery, review in FlowDirector, and ship 70+ language streams.',
        featureIcons: [
          'producerLaunchpad',
          'blueprintShare',
          'productionAgent',
          'scriptSupervisor',
          'budget',
          'castLocations',
          'musicScore',
          'stillsWorkbench',
          'clipsWorkbench',
          'multilanguageUi',
          'screeningPlayer',
        ],
      },
      {
        id: 'series-animation',
        tabLabel: 'Episodic Series & Stylized Animation',
        badge: 'Multi-Episode IP · Locked Art & Cast Continuity',
        headline: 'Run an Entire Showrunner Bible from Episode 1 to Season Finale',
        description:
          'Build a multi-episode season arc, freeze photorealistic or stylized 3D art direction across every episode, direct storyboard beats and keyframes, and run the unified Production Agent to render cinema-grade 10s video clips with self-healing Creative Kling AI F2V fallback.',
        featureIcons: [
          'newSeries',
          'seriesReview',
          'seriesDirector',
          'directEpisode',
          'startEpisode',
          'productionAgent',
          'stillsWorkbench',
          'clipsWorkbench',
        ],
      },
      {
        id: 'creator-podcast',
        tabLabel: 'YouTube Channels & Narrative Podcasts',
        badge: 'High-Retention Faceless Channels · Multi-Host Shows',
        headline: 'Publish Weekly Story-Driven Episodes with Studio Voice, Music & Polish',
        description:
          'Test audience retention hooks before rendering, direct multi-voice host chemistry, shot-aligned narration cues, and custom musical underscore, polish 4-stem mixes, and publish 16:9 + 9:16 social streams via 1-Click OAuth.',
        featureIcons: [
          'sceneWorkflow',
          'seriesResonance',
          'musicScore',
          'scriptSupervisor',
          'mixer',
          'streamsInventory',
          'shipPackage',
        ],
      },
      {
        id: 'filmmaker-pitch',
        tabLabel: 'Filmmaker Pre-Vis & Pitch Trailers',
        badge: 'Greenlight Decks · Proof-of-Concept Cinema',
        headline: 'Stress-Test Your Screenplay and Walk Into Pitch Meetings with a Finished Trailer',
        description:
          'Co-write with FlowDirector, score structural pacing with Audience Resonance at Blueprint and Script gates, share illustrated storyboards with budget forecasts, format industry-standard scene scripts, and cut theatrical proof-of-concept trailers.',
        featureIcons: [
          'blueprintDirector',
          'blueprintResonance',
          'blueprintShare',
          'goToProduction',
          'productionScript',
          'scriptResonance',
          'promoTrailers',
        ],
      },
    ],
  },
  directoryDrawer: {
    badge: 'Workflow Automation & 39 Studio Capabilities · Narrated Animatics in 7 Languages',
    title: 'Automate Production & Expert Video QA Across 20+ Concurrent Projects',
    subtitle:
      'Every capability now includes a clean, mobile-friendly WebM animatic film with complete studio narration in 7 languages. See how White-Label Portals, Selfie Studio, FlowDirector 1-click clip fixes, and autonomous agents replace 300+ manual prompts.',
    expandCta: 'Explore 39 Narrated Studio Capabilities',
    collapseCta: 'Hide Studio Capabilities Directory',
    automationEyebrow: 'Built for High-Volume Creators & 20-Project Video Service Providers',
    automationTitle: 'End-to-End Workflow Automation: Agents Build. FlowDirector Audits & Fixes in 1 Click.',
    automationSubtitle:
      'Stop babysitting prompts clip by clip. Autonomous Audio, Stills, Clips, and Production Agents execute scenes in the background while FlowDirector inspects every rendered scene MP4 for Audience Resonance and Director Compliance—recreating flagged clips via Shot Director in a single click.',
    spotlightFlowDirectorLabel: 'FlowDirector Scene Video QA',
    spotlightFlowDirectorMeta: 'Audience AR + Director Compliance · 1-Click Fix Recreates Clips',
    spotlightAgentsLabel: 'Autonomous Production Agents',
    spotlightAgentsMeta: '300+ Prompts Automated · Self-Healing Across 20 Active Projects',
    spotlightNarrated5kLabel: '39 Capabilities · Narrated Animatics',
    spotlightNarrated5kMeta: 'Clean 16:9 WebM Animatic Films + Studio Narration in All 7 Languages',
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
  mobileCompanion: MOBILE_COMPANION_COPY_EN,
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
