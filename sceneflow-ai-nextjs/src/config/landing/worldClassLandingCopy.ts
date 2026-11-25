/**
 * Canonical copy & 14-locale priority translations for SceneFlow Studio's
 * Creator + Video Services Business landing page architecture.
 *
 * Wired into `buildEnMessages()` under `studioLanding` so `messages/en.json`
 * stays 100% reproducible via `npm run i18n:build-en`, with complete native
 * translations for `es`, `pt`, `hi`, `zh-CN`, `ar`, `th`, `ja`, `ko`, `de`,
 * `fr`, `it`, `nl`, and `ru`.
 */

import { STUDIO_LANDING_COPY_AR } from './locales/ar'
import { STUDIO_LANDING_COPY_DE } from './locales/de'
import { STUDIO_LANDING_COPY_ES } from './locales/es'
import { STUDIO_LANDING_COPY_FR } from './locales/fr'
import { STUDIO_LANDING_COPY_HI } from './locales/hi'
import { STUDIO_LANDING_COPY_IT } from './locales/it'
import { STUDIO_LANDING_COPY_JA } from './locales/ja'
import { STUDIO_LANDING_COPY_KO } from './locales/ko'
import { STUDIO_LANDING_COPY_NL } from './locales/nl'
import { STUDIO_LANDING_COPY_PT } from './locales/pt'
import { STUDIO_LANDING_COPY_RU } from './locales/ru'
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
        badge: 'Income Opportunity · 65–90% Gross Service Margin',
        title: 'Video Delivery Businesses',
        description:
          'Lead with $149 Same-Day Express 4K Cinema Films and high-margin Life Memoirs—then stack repeat monthly retainers across Training, Real Estate, and Brand Films with full commercial ownership.',
        highlights: [
          'Zero-login white-label portals for Intake, Blueprint, Continuity & Screening',
          'Same-day $149 Express 4K Cinema Films (~88% margin) & zero-rework Full-Motion upgrades',
          'Voiced Cinema Preview firewall & hard round caps prevent costly client reshoots',
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
          'Watch your voiced Cinema Preview—or render it directly as a 4K Cinema Film',
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
          'Once your script and voiced Cinema Preview feel right, launch Audio Agent, Stills Agent, Clips Agent, or full Production Agents to build dozens of scenes, self-heal failed takes, and deliver a 4K Cinema Film or full-motion master automatically.',
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
    priceTierNames: ['Express 4K Cinema', 'Full-Motion Cinema', 'Signature 4K'],
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
        title: 'Express 4K Cinema & Motion Firewall',
        detail:
          'Deliver photorealistic panned 4K stills with cloned voices, SFX & score as a finished $149–$249 same-day master—or use that exact voiced cut as a zero-waste approval firewall before Full-Motion video spend.',
      },
      {
        title: 'Client Photos & Stories Stay 100% Private',
        detail:
          'Family archives and B2B files stay strictly private—never used to train public AI models—with EXIF GPS stripped on upload and explicit likeness consent logged.',
      },
    ],
    playbooksBadge: 'Service-in-a-Box Starter Kits Included',
    playbooksHeading: 'Turnkey Operator Playbooks, Rate Cards & Partner Pitch Templates',
    playbooksSubtitle:
      'Accelerate past cold-start guesswork with battle-tested vertical SOPs built directly into SceneFlow Studio:',
    playbooksItems: [
      '70+ Film-Language AI Biographer & Intake Playbooks (7 Native Portal UI Locales)',
      '3-Tier Package Rate Cards & In-App Margin Floor Calculator',
      '20% Referral Partner Pitch Sheet (Senior Living, Funeral Homes & Realtors)',
      'Built-In Clickwrap Media, Multi-Age Likeness & Voice Consent Ledger',
    ],
    blueprintFlywheel: {
      badge: 'Zero-PM-Hours Automated Discovery · 83% Net Margin',
      title: 'Earn Automated Revenue Before a PM Ever Touches the Project',
      subtitle:
        'Customers struggle to outline a film from a blank page—but excel at reacting to an illustrated, narrated draft. SceneFlow turns client onboarding into a self-funding, family-collaborative Blueprint Pass that profits even on stalled leads.',
      cards: [
        {
          tag: '$29 Pass + $19 Top-Ups · 0 PM Min',
          title: 'Self-Funding Blueprint Pass & Extra Iteration Packs',
          detail:
            'Clients pay $29 upfront to receive illustrated beat storyboards, multi-language narration, and Audience Resonance in ~3 minutes (~83% margin even if they pause)—plus self-serve $19 packs (+3 revisions / +2 AR) whenever they want extra rounds.',
        },
        {
          tag: 'Fast & Authentic Draft 1',
          title: 'Memory-Jogger Chips, Quick Check & Anti-Fictionalization',
          detail:
            'Tappable vertical milestone chips (marriages, promotions, sports, proof points, rooms) and a 15-second voice/text Quick Check catch key people and events fast, while strict non-fiction guardrails never invent biography details.',
        },
        {
          tag: 'Two-Tier Sharing & Triage',
          title: 'Family / Team Comment-Only Link & Primary Customer Control',
          detail:
            'Your customer receives a private Director Portal and shares a comment-only link with family or teammates. Guests listen in any of 70+ film languages (with a 7-language native portal UI) and comment without burning rounds or approving—the primary customer filters notes + 1-click AR tips into 1 AI update that auto-refreshes storyboards & audio.',
        },
        {
          tag: 'Deferred PM Assignment',
          title: 'PMs Assign Only on Approval + Blueprint Conversion Funnel',
          detail:
            'Zero human PM hours until the customer clicks Approve Blueprint. Track Active, Stale >48h / >7d, and Rounds-Exhausted leads in the Blueprint Funnel with 1-click white-labeled nudge emails, +3 iteration grants, and automated pass revenue.',
        },
      ],
    },
    agencyScaleOps: {
      badge: 'Multi-PM Agency Scale · 100s of Client Projects',
      title: 'Agency Operations Command Center, Built Right Into the Studio',
      subtitle:
        'Scale from solo operator to a global multi-PM video agency without spreadsheets, wasted sales hours, leaked margins, or bloated storage.',
      pillars: [
        {
          title: 'Blueprint Funnel, Kanban & SLA Nudges',
          detail:
            'Separate zero-touch Blueprint Passes from active production—spot stalled unapproved Blueprints (>48h/7d) and exhausted rounds with 1-click white-labeled nudge emails & +3 iteration grants.',
        },
        {
          title: 'Client CRM, Pass Revenue & PM Scorecard',
          detail:
            'Roll up automated $29 Blueprint Passes, $19 iteration packs, and full production orders automatically while monitoring per-PM credit burn, turnaround times, and real-time gross margin.',
        },
        {
          title: 'Deferred PM Routing & Workspace Isolation',
          detail:
            'Keep pre-approval Blueprint Passes zero-touch, auto-assign locale PMs only when clients click Approve, delegate Series Bibles, and isolate teams with 0-credit QA Reviewers.',
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
        title: 'Self-Funding $29 Guided Intake',
        detail:
          'Clients purchase your $29 Blueprint Pass, tap vertical Memory-Jogger chips, speak or type their story with mandatory consent, and run a 15-second Quick Check—with strict non-fiction accuracy.',
      },
      {
        step: '02',
        title: 'Living Blueprint, Family Triage & Auto-Revisions',
        detail:
          'Within ~3 minutes clients receive illustrated storyboards, multi-language audio & AR scoring, share a comment-only link with family/team, filter notes into AI updates (or add $19 packs), and click Approve to trigger PM assignment.',
      },
      {
        step: '03',
        title: 'Mobile Photo Upload, Pronunciation & Continuity Lock',
        detail:
          'Clients upload real photos from their phone (EXIF GPS stripped), add a 10-second name/town pronunciation guide, and approve multi-age Cast, Wardrobes & Sets within capped rounds.',
      },
      {
        step: '04',
        title: 'Same-Day Express 4K or Full-Motion Screening Delivery',
        detail:
          'Run supervised 1-tap PM release (or full auto-pilot) into the zero-login Screening Room. Client approval auto-triggers the 4K master render and emails the download link—with zero-rework upgrades to Full-Motion anytime.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Video Memoirs',
        roleTag: '★ Flagship High-Margin Wedge',
        badge: '$149–$1,250 / film · Market Rate: $1,200–$4,500+',
        title: 'Life Stories, Milestone Tributes & Family Biographies',
        description:
          'Start with a $149 Same-Day Express 4K Cinema Tribute (photorealistic panned stills, cloned voices, SFX & score) or upgrade seamlessly to Full-Motion multi-age era re-enactments (Age 17 → Age 32 → Age 62) with zero rework.',
        globalMarketNeed:
          'Hundreds of millions of aging parents, 50th anniversaries, and celebrations of life happen globally every year—yet 90%+ go unfilmed because $2,000+ crews are unaffordable or take weeks.',
        clientBuyer:
          'Families celebrating milestone birthdays, 50th anniversaries, retirements & legacy tributes',
        partnerChannels:
          'Estate planners, senior living communities, funeral directors & milestone event planners (15–20% referral partner model)',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [149, 599, 1250],
        tierScopeLabels: [
          'Express 4K Cinema (5–8 min · Same-Day) · Panned 4K Stills + Voices, SFX & Score · Auto-4K Master',
          '12-min Full-Motion Family Memoir · Multi-Age Cast + Era Clips · 2 Langs',
          '20-min Signature Legacy Documentary · 4K Full-Motion Eras + Heirloom Locks · 4 Langs',
        ],
        computeTiersUsd: [6, 34, 72],
        operatorTiersUsd: [12, 88, 150],
        activeTimeTiersLabels: ['~15 min', '~1.75 hrs', '~3.0 hrs'],
        retailRangeLabel: '$149–$1,250',
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.75 hrs',
        keyAdvantage:
          '3-Rung Value Ladder: $29 Blueprint Pass → $149 Same-Day Express 4K Cinema (~$18 total cost, ~88% margin) → $599+ Full-Motion upgrade with zero rework.',
      },
      {
        id: 'realestate',
        tabLabel: 'Real Estate Tours',
        roleTag: '↻ Repeat Broker Retainer',
        badge: '$149–$549 / listing · Market Rate: $450–$1,500+',
        title: 'Narrated Luxury Property & Boutique Hospitality Tours',
        description:
          'Turn listing photographs and neighborhood highlights into Same-Day $149 Express 4K Listing Films or Full-Motion walkthroughs—plus instant Mandarin, Spanish, Arabic, or Portuguese versions for cross-border buyers.',
        globalMarketNeed:
          'Tens of millions of home listings, short-term rentals, and boutique hotels compete for domestic and international buyers worldwide every month—most still stuck with static photos.',
        clientBuyer:
          'Top-producing residential realtors, luxury brokerages, vacation rentals & boutique hotels',
        partnerChannels:
          'Real estate photography studios, MLS staging teams, luxury brokerages & hospitality marketers',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [149, 299, 549],
        tierScopeLabels: [
          'Express 4K Listing Film (90s · Same-Day) · Panned 4K Stills + Voiced Narration & Score · 1 Lang',
          '2-min Full-Motion Property Tour · 4K Upscaled + 2 Langs',
          '3-min Luxury Estate Film + 9:16 Reels · 4 International Langs',
        ],
        computeTiersUsd: [5, 15, 28],
        operatorTiersUsd: [10, 50, 88],
        activeTimeTiersLabels: ['~12 min', '~1.0 hr', '~1.75 hrs'],
        retailRangeLabel: '$149–$549',
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '~1.0 hr',
        keyAdvantage:
          'High repeat volume per broker: ship Same-Day $149 Express 4K Listing Films (~$15 delivery cost, ~90% margin) or monthly Full-Motion broker retainers with zero travel delays.',
      },
      {
        id: 'training',
        tabLabel: 'Training & SOPs',
        roleTag: '↻ Repeat B2B Retainer',
        badge: '$249–$1,800 / module · Market Rate: $1,500–$5,000+',
        title: 'Corporate Onboarding, Safety & Multilingual Courses',
        description:
          'Lock a consistent instructor presenter, uniforms, and workplace sets in your Continuity Vault—then ship Same-Day $249 Express 4K Narrated SOPs or Full-Motion courses localized across 70+ employee languages.',
        globalMarketNeed:
          'Every manufacturer, clinic network, hospitality group, and franchise globally battles frontline turnover, safety compliance, and multilingual workforces needing clear video SOPs.',
        clientBuyer:
          'HR & L&D leaders, manufacturers, healthcare clinic networks, restaurant groups & franchises',
        partnerChannels:
          'Fractional HR consultants, workplace safety auditors, LMS integrators & franchise associations',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [249, 950, 1800],
        tierScopeLabels: [
          'Express 4K Narrated SOP (5 min · Same-Day) · Locked Instructor Stills + Cloned Voice & SFX · 1 Lang',
          '10-min Full-Motion Safety / Onboarding Course · 3 Workforce Langs',
          '20-min Multi-Chapter Curriculum · 6+ Workforce Langs',
        ],
        computeTiersUsd: [9, 40, 78],
        operatorTiersUsd: [18, 125, 210],
        activeTimeTiersLabels: ['~20 min', '~2.5 hrs', '~4.2 hrs'],
        retailRangeLabel: '$249–$1,800',
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '~2.5 hrs',
        keyAdvantage:
          'Sticky B2B retainers: launch Same-Day $249 Express 4K SOPs (~$27 delivery cost, ~89% margin) or $950+ multilingual courses, and re-render compliance updates in minutes.',
      },
      {
        id: 'brand',
        tabLabel: 'Brand Stories',
        roleTag: '↻ Repeat SMB & Agency Pack',
        badge: '$199–$1,200 / pack · Market Rate: $3,000–$8,000+',
        title: 'Founder Origin Films, Clinic Explainers & Social Ads',
        description:
          'Fulfill Same-Day $199 Express 4K Brand Films or Full-Motion homepage origin stories paired with automatic 9:16 vertical trailers for Instagram, TikTok, and YouTube Shorts—vetted in the Screening Room.',
        globalMarketNeed:
          '30M+ local clinics, law firms, restaurants, and craft founders worldwide urgently need homepage trust videos and fresh 9:16 social ads—but are locked out by $5,000+ agency shoots.',
        clientBuyer:
          'Medical/dental practices, law firms, local SMBs, web design agencies & e-commerce founders',
        partnerChannels:
          'Local web design shops, SEO/performance ad agencies, business chambers & dental/medical consultants',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [199, 650, 1200],
        tierScopeLabels: [
          'Express 4K Brand Film (90s · Same-Day) · Panned 4K Stills + Voiced Narration & Score · Auto-4K Master',
          '2-min Full-Motion Founder Origin Film + 2 Social 9:16 Cutdowns',
          'Signature Brand Film + 4 Multilingual Paid-Ad Hook Variations',
        ],
        computeTiersUsd: [7, 28, 56],
        operatorTiersUsd: [15, 88, 150],
        activeTimeTiersLabels: ['~18 min', '~1.75 hrs', '~3.0 hrs'],
        retailRangeLabel: '$199–$1,200',
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.75 hrs',
        keyAdvantage:
          'White-label fulfillment for local web & ad agencies—$199 Same-Day Express 4K Brand Films (~$22 cost, ~89% margin) or $650 Full-Motion packs with 9:16 social cutdowns.',
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
        serviceExampleTitle: 'Zero-PM-Hours $29 Blueprint Pass & Family Comment Triage',
        serviceExampleNote:
          'Memory-Jogger chips & anti-fictionalization deliver an authentic illustrated, narrated Draft 1 in ~3 minutes. Clients share a comment-only link with family, filter notes + 1-click AR tips into AI revisions (with auto-refreshed audio & storyboards), and trigger PM assignment only on Approval.',
        callouts: [
          {
            label: 'Memory-Jogger Intake & Anti-Fictionalization',
            detail:
              'Vertical milestone chips and a 15-second voice/text Quick Check capture key people & eras fast—never inventing unshared biography facts.',
          },
          {
            label: 'Two-Tier Family / Team Sharing & Triage',
            detail:
              'Guests listen in any of 70+ film languages (7 native UI locales) and comment without burning rounds or approving; the primary customer filters notes into 1 clean AI revision.',
          },
          {
            label: 'Auto-Refreshed Audio, Storyboards & $19 Top-Ups',
            detail:
              'Every iteration re-illustrates changed chapters, regenerates narration, scores Audience Resonance, and offers self-serve +3 iteration packs.',
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
        title: 'Screen the Voiced Cinema Cut—Ship in 4K or Upgrade to Full Motion',
        promise:
          'Review your baseline Production Script, lock Continuity references, watch the full photorealistic panned Cinema Cut with cloned voices, SFX & score—deliver it directly as a Same-Day 4K Express Cinema Film or let autonomous agents build full-motion shots.',
        creatorExampleTitle: 'Scene 1: Subterranean Archive Vault · Anamorphic 4K',
        creatorExampleNote:
          'Switch Elara’s wardrobe per shot, direct camera framing by voice or text, blend multi-track dialogue/SFX/score in Production Mixer, and dispatch Production Agents.',
        serviceExampleTitle: 'Same-Day $149 Express 4K Cinema or Hybrid Full-Motion Upgrades',
        serviceExampleNote:
          'Deliver a photorealistic panned 4K Narrated Cinema Film in hours (~$6 compute) or layer AI full-motion re-enactments for unphotographed memories—keeping a 12-minute full-motion memoir around ~$34 in compute.',
        callouts: [
          {
            label: 'Per-Shot Wardrobe & Voice/Typed Shot Director',
            detail:
              'Pick exact outfits per shot and refine framing or expressions conversationally—no slot-machine re-rolls.',
          },
          {
            label: 'Express 4K Cinema Master & Motion Firewall',
            detail:
              'Hear cloned dialogue, narration, SFX, and score over continuity-locked panned 4K stills—ready to export as a finished $149 film or approve before full-motion spend.',
          },
          {
            label: 'Autonomous Audio Agent, Stills Agent & Clips Agent',
            detail:
              'Generate scene-by-scene or launch full Production Agents to build and stitch automatically.',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · Wardrobe Selected · Express 4K Cinema Cut Ready',
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
          'Screen Express 4K Cinema cuts, rough cuts, and full-motion 4K masters in one unified player. Client approval can auto-trigger the 4K render and email the download link—plus spin up 70+ in-scene dubbed streams.',
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
        badge: 'Flagship Client Service · $149–$1,250/Film',
        headline: 'Turn Family Interviews & Keepsake Photos into Heirloom Cinema',
        description:
          'Capture a life story in any of 70+ film languages (French, Spanish, Japanese & more, inside a 7-language native portal UI), polish & de-age portraits in Character Selfie Studio from 1970s youth to modern day, dispatch autonomous Production Agents, run FlowDirector 1-click clip fixes, and deliver via a zero-login Screening Room link.',
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
    badge: 'Workflow Automation & 39 Studio Capabilities · Narrated Cinema Films in 7 Languages',
    title: 'Automate Production & Expert Video QA Across 20+ Concurrent Projects',
    subtitle:
      'Every capability now includes a clean, mobile-friendly WebM narrated cinema film in 7 languages. See how White-Label Portals, Selfie Studio, FlowDirector 1-click clip fixes, and autonomous agents replace 300+ manual prompts.',
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
    spotlightNarrated5kLabel: '39 Capabilities · Narrated Cinema Films',
    spotlightNarrated5kMeta: 'Clean 16:9 WebM Cinema Walkthroughs + Studio Narration in All 7 Languages',
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
  'es' | 'pt' | 'hi' | 'zh-CN' | 'ar' | 'th' | 'ja' | 'ko' | 'de' | 'fr' | 'it' | 'nl' | 'ru',
  StudioLandingCopy
> = {
  es: STUDIO_LANDING_COPY_ES,
  pt: STUDIO_LANDING_COPY_PT,
  hi: STUDIO_LANDING_COPY_HI,
  'zh-CN': STUDIO_LANDING_COPY_ZH_CN,
  ar: STUDIO_LANDING_COPY_AR,
  th: STUDIO_LANDING_COPY_TH,
  ja: STUDIO_LANDING_COPY_JA,
  ko: STUDIO_LANDING_COPY_KO,
  de: STUDIO_LANDING_COPY_DE,
  fr: STUDIO_LANDING_COPY_FR,
  it: STUDIO_LANDING_COPY_IT,
  nl: STUDIO_LANDING_COPY_NL,
  ru: STUDIO_LANDING_COPY_RU,
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
