/**
 * Canonical English landing messages — source of truth for MT pipeline.
 * Config files remain for IDs/structure; display strings live here for i18n.
 */
import {
  AUDIENCE_PATHS,
  AUDIENCE_PATH_MODES,
  FINAL_CTA_COPY,
  HERO_COPY,
  HOW_IT_WORKS_HEADER,
  INSTITUTIONAL_ROI,
  MOR_FOOTER_LINE,
  ONE_TAKE_PIPELINE,
  SLOT_MACHINE_HEADER,
  VP_STRIP_PILLS,
  WHY_SCENEFLOW,
} from '@/config/landing/valuePropCopy'
import { TOOL_STACK_COPY } from '@/config/landing/toolStackCopy'
import {
  BEAT_FIRST_CARD,
  SCREENING_ROOM_COPY,
  WORKFLOW_PHASES,
} from '@/config/landing/workflowPhaseCopy'
import { VIDEO_CATEGORIES, USE_CASES_QUALIFYING_STATEMENT } from '@/config/landing/useCaseExamples'
import {
  HERO_VIDEO_LANGUAGE_PROMPT,
  HERO_VIDEO_LOCALES,
  HERO_VIDEO_MULTILANG_HINT,
} from '@/config/landing/heroVideoLocales'
import {
  USE_CASE_PERSONAS,
  USE_CASE_PERSONA_UI,
  USE_CASE_SEGMENT_CTAS,
} from '@/config/landing/useCasePersonasCopy'
import { ENGINEERING_TRUST_COPY } from '@/config/landing/engineeringTrustCopy'
import { TRUST_SAFEGUARD_COPY } from '@/config/landing/trustSafeguardCopy'
import { EXTENDED_SCENES_COPY } from '@/config/landing/extendedScenesCopy'
import { CORE_CAPABILITIES_COPY } from '@/config/landing/coreCapabilitiesCopy'
import { CREATIVE_RANGE_COPY } from '@/config/landing/creativeRangeCopy'
import { ENTERTAINMENT_STATS_COPY } from '@/config/landing/entertainmentStatsCopy'
import { EXIT_INTENT_COPY } from '@/config/landing/exitIntentCopy'
import {
  buildFeatureStoryboardMessageItems,
  FEATURE_CHAPTERS,
  FEATURE_STORYBOARD_SECTION,
  FEATURE_STORYBOARD_UI,
} from '@/config/landing/featureStoryboardCopy'
import { PRICING_LANDING_COPY } from '@/config/landing/pricingLandingCopy'
import { PRE_VIS_ENGINE_COPY } from '@/config/landing/preVisEngineCopy'
import { LANDING_SECTION_COLLAPSE_COPY } from '@/config/landing/landingSectionCollapseCopy'
import { getLandingPlans } from '@/lib/billing/tierCatalog'

const FAQ_ITEMS = [
  {
    question: 'How does the SceneFlow workflow run from idea to publish-ready video?',
    answer:
      'SceneFlow uses a structured workflow: Series (optional) → Blueprint → Production → Final Cut → Premiere. Blueprint defines story structure and target audience with Audience Resonance. Production generates script, pre-vis, beat video, and rendered scene streams. Final Cut assembles selected streams into one master MP4 — not a timeline editor. Premiere handles screenings, analytics insights, YouTube publish, and export bundles.',
  },
  {
    question: 'How is SceneFlow different from Gemini Studio or Google Flow?',
    answer:
      'Gemini Studio and Google Flow focus on prompt-and-generate clips. SceneFlow bundles the full production workflow: structured phases with editable baselines, Reference Library and Beat Frames for consistency, Audience Resonance before expensive renders, automated Mixer and stream assembly, and Screening Room validation before publish — all in one guided studio. Model usage cost is similar whether you use SceneFlow, your own provider accounts, or BYOK — SceneFlow saves hours of copy-paste, re-generation, and manual video assembly per video.',
  },
  {
    question: 'Can I edit AI-generated scripts, visuals, and audio?',
    answer:
      'Yes. All generated output remains editable. You can rewrite scripts, adjust scene direction, regenerate specific beats, tune voiceover, and refine timing in the Production Mixer. Final Cut only stitches finished streams — creative changes stay upstream in Production.',
  },
  {
    question: 'How does Target Audience Resonance work now?',
    answer:
      'Audience Resonance combines narrative-structure analysis (clarity, pacing, emotional arc) with target-persona fit against the audience you define in Blueprint — not post-publish retention data. You get section-level recommendations and one-click fixes at Series, Blueprint, and script review before heavy rendering.',
  },
  {
    question: 'Can I produce multilingual listing or marketing videos?',
    answer:
      'Yes. You can generate and localize videos in 70+ languages with aligned timing workflows. Teams typically create one master cut, then produce language variants for global buyers, customers, or regional audiences.',
  },
  {
    question: 'What does Premiere do if Screening Room is the review phase?',
    answer:
      'Screening Room is the review surface inside Premiere — and for Production pre-vis preview. Share /s/ links, collect stakeholder feedback and optional engagement analytics (with viewer consent), review Scoring and Visual insights, then publish via YouTube wizard or export bundles.',
  },
  {
    question: 'Do I need technical or editing experience?',
    answer:
      'No. SceneFlow is built for non-technical creators and teams. You start with guided inputs and editable AI baselines at each phase — not complex prompt engineering or multi-tool stacks.',
  },
  {
    question: 'How does the Explorer Plan work?',
    answer:
      'For $9, you get 750 credits to test the full workflow with a one-time purchase. It is designed as a practical test flight so you can run real concept-to-video tasks before choosing a monthly plan.',
  },
  {
    question: 'How are credits and BYOK handled?',
    answer:
      'Credits are tracked in-platform so teams can manage budget by workflow phase. Pro and Studio plans also support Bring Your Own Key (BYOK) for supported providers, giving additional cost control for organizations with existing provider contracts.',
  },
  {
    question: 'What can I realistically create with SceneFlow?',
    answer:
      'Teams use SceneFlow for real estate tours, education content, podcasts with visual storytelling, news explainers, branded campaigns, and cinematic episode series. The same workflow supports short-form and long-form production.',
  },
  {
    question: 'How does SceneFlow handle clips longer than 8 seconds?',
    answer:
      'Veo generates 4–8 second clips per API step. SceneFlow chains native extension steps (+7 seconds each) after an approved initial clip—so a long dialogue beat can reach ~15–30 seconds or more as ordered segments, not one unlimited render. Beat-first approval splits long lines before you spend credits.',
  },
  {
    question: 'What moderation and risk mitigation is available?',
    answer:
      'Every generation runs through Google Vertex AI safety filters. When the primary path is blocked by policy, Extended Creative Services with Guardrails may complete delivery after an additional content review pass. Additional moderation and risk mitigation is available across Blueprint, script, pre-vis, and segment video using the same credit model as other Studio tools. Segment video also receives signed content provenance records.',
  },
  {
    question: 'What happens if Google safety filters block my prompt?',
    answer:
      'SceneFlow retries with prompt adjustments and method changes on the primary Google path. If policy limits persist, Extended Creative Services with Guardrails may complete the clip after an additional review—subject to the same content standards. You are not charged for a completed clip when generation is blocked.',
  },
] as const

export function buildEnMessages() {
  const { explorer: explorerPlan, subscriptions: subscriptionPlans } = getLandingPlans()

  return {
    metadata: {
      title: 'SceneFlow AI - AI-Powered Video Creation',
      description:
        'Transform your ideas into professional videos with AI-powered workflow automation',
    },
    nav: {
      workflow: 'The Workflow',
      platformWalkthrough: 'Platform Walkthrough',
      plansPricing: 'Plans & Pricing',
      more: 'More',
      useCases: 'Use Cases',
      audienceResonance: 'Audience Resonance',
      trustSafety: 'Trust & Safety',
      platformTrust: 'Platform & Trust',
      faq: 'FAQ',
      signIn: 'Sign In',
      startProject: 'Start a Project',
      dashboard: 'Dashboard',
      adminPanel: 'Admin Panel',
      signOut: 'Sign Out',
      goToDashboard: 'Go to Dashboard',
      userFallback: 'User',
      searchLanguages: 'Search languages...',
      noLanguagesFound: 'No languages found',
    },
    floatingNav: {
      compare: 'Compare',
      looksAndFormats: 'Looks & Formats',
      howItWorks: 'How It Works',
      useCases: 'Use Cases',
      preVisEngine: 'Pre-Vis Engine',
      platformWalkthrough: 'Platform Walkthrough',
      trustSafety: 'Trust & Safety',
      platform: 'Platform',
      pricing: 'Pricing',
      faq: 'FAQ',
    },
    hero: {
      ...HERO_COPY,
      languagePrompt: HERO_VIDEO_LANGUAGE_PROMPT,
      multilangHint: HERO_VIDEO_MULTILANG_HINT,
      playWithNarration: 'Play with narration',
      tapToHear: 'Tap to hear',
      fullscreen: 'Fullscreen',
      heroVideoLanguages: Object.fromEntries(
        HERO_VIDEO_LOCALES.map((l) => [l.id, { label: l.label, nativeLabel: l.nativeLabel }])
      ),
      soon: 'Soon',
    },
    valueProp: {
      pills: VP_STRIP_PILLS.map((p) => ({ label: p.label, detail: p.detail })),
    },
    audiencePaths: {
      prompt: 'Who are you? Pick your path',
      seeExamples: 'See examples',
      examplesFor: 'Examples for {label}:',
      andMore: ', and more.',
      expandImage: 'Expand image',
      closePreview: 'Close preview',
      modes: AUDIENCE_PATH_MODES,
      paths: AUDIENCE_PATHS.map((p) => ({
        id: p.id,
        hash: p.hash,
        icon: p.icon,
        label: p.label,
        outcome: p.outcome,
        useCases: [...p.useCases],
      })),
    },
    whySceneFlow: {
      ...WHY_SCENEFLOW,
      themHeader: 'Typical clip-generation tools',
      usHeader: 'SceneFlow bundles',
    },
    beatFirstPipeline: {
      ...ONE_TAKE_PIPELINE,
      footerLine: 'Fewer slot-machine regenerations — approve visuals before final video spend',
    },
    trustSafeguard: TRUST_SAFEGUARD_COPY,
    extendedScenes: EXTENDED_SCENES_COPY,
    creativeRange: CREATIVE_RANGE_COPY,
    toolStack: TOOL_STACK_COPY,
    comparison: {
      ...SLOT_MACHINE_HEADER,
      caption:
        'One studio replaces fragmented prompt tools, manual edits, and multi-platform handoffs',
      imageAlt:
        'Traditional production overhead vs SceneFlow automated studio — faster concept to publish-ready video',
    },
    howItWorks: {
      ...HOW_IT_WORKS_HEADER,
      optionalBadge: 'Optional',
      optionalSuffix: ' (optional)',
      readyTitle: 'Ready to test the full pipeline?',
      explorerCta: 'Start with Explorer — $9',
      phases: WORKFLOW_PHASES.map((p) => ({
        id: p.id,
        stepLabel: p.stepLabel,
        subtitle: p.subtitle,
        description: p.description,
        keySteps: [...p.keySteps],
        keyFeatures: [...p.keyFeatures],
        optional: p.optional ?? false,
      })),
    },
    useCases: {
      badge: 'Use Case Examples',
      title: 'Whatever Video You Can Imagine,',
      titleAccent: 'Build It in SceneFlow',
      subtitle:
        'Entertainment and creator series, real-estate showcases, education, podcasts, news formats, and branded campaigns — one automated studio from concept to publish-ready master.',
      qualifyingStatement: USE_CASES_QUALIFYING_STATEMENT,
      entertainmentStats: ENTERTAINMENT_STATS_COPY,
      ui: {
        useCases: 'Use Cases',
        sectors: '{count} SECTORS',
        demoComingSoon: 'Demo coming soon',
        selectExample: 'Select an example to preview its demo',
        ...USE_CASE_PERSONA_UI,
      },
      personas: USE_CASE_PERSONAS,
      segmentCtas: USE_CASE_SEGMENT_CTAS,
      categories: VIDEO_CATEGORIES.map((cat) => ({
        id: cat.id,
        title: cat.title,
        ...(cat.qualifyingStatement ? { qualifyingStatement: cat.qualifyingStatement } : {}),
        examples: cat.examples.map((ex) => ({
          id: ex.id,
          label: ex.label,
          description: ex.description,
        })),
      })),
    },
    institutionalRoi: {
      badge: 'For in-house teams & institutions',
      ...INSTITUTIONAL_ROI,
      typicalCost: 'Typical cost',
      timeline: 'Timeline',
    },
    platformWalkthrough: {
      badge: 'Guided Tour',
      title: 'Platform Walkthrough',
      subtitle:
        'Nine guided clips covering the full SceneFlow Studio workflow — from series planning through trust, safety, and publish-ready output.',
      subheading: FEATURE_STORYBOARD_SECTION.subheading,
      chapterHint: FEATURE_STORYBOARD_SECTION.chapterHint,
      expandChapter: FEATURE_STORYBOARD_SECTION.expandChapter,
      collapseChapter: FEATURE_STORYBOARD_SECTION.collapseChapter,
      underTheHoodLabel: FEATURE_STORYBOARD_SECTION.underTheHood,
      chapters: FEATURE_CHAPTERS.map((chapter) => ({
        id: chapter.id,
        label: chapter.label,
        defaultExpanded: chapter.defaultExpanded,
      })),
      close: 'Close',
      viewDetails: 'View Details',
      beatFirst: BEAT_FIRST_CARD,
      screeningRoom: SCREENING_ROOM_COPY,
      ui: FEATURE_STORYBOARD_UI,
      items: buildFeatureStoryboardMessageItems().map((item) => ({
        id: String(item.id),
        title: item.title,
        description: item.description,
        keyFeatures: [...item.keyFeatures],
        screenshotSlot: item.screenshotSlot,
        videoSlot: item.videoSlot,
        ...(item.underTheHood
          ? {
              underTheHood: {
                title: item.underTheHood.title,
                body: item.underTheHood.body,
                bullets: [...item.underTheHood.bullets],
              },
            }
          : {}),
      })),
    },
    engineeringTrust: ENGINEERING_TRUST_COPY,
    coreCapabilities: CORE_CAPABILITIES_COPY,
    preVisEngine: PRE_VIS_ENGINE_COPY,
    exitIntent: EXIT_INTENT_COPY,
    pricing: {
      ...PRICING_LANDING_COPY,
      plans: {
        explorer: {
          name: explorerPlan.name,
          description: explorerPlan.description,
          features: [...explorerPlan.features],
        },
        subscriptions: subscriptionPlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          features: [...plan.features],
        })),
      },
    },
    faq: {
      badge: 'Got Questions?',
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about SceneFlow AI',
      items: FAQ_ITEMS.map((f) => ({ question: f.question, answer: f.answer })),
    },
    landingSections: LANDING_SECTION_COLLAPSE_COPY,
    finalCta: FINAL_CTA_COPY,
    footer: {
      description:
        'End-to-end automated video production — from concept to publish-ready master. One guided studio: Blueprint → Production → Final Cut → Premiere.',
      product: 'Product',
      resources: 'Resources',
      legal: 'Legal',
      links: {
        features: 'Features',
        pricing: 'Pricing',
        howItWorks: 'How It Works',
        faq: 'FAQ',
        gettingStarted: 'Getting Started',
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
        trustSafety: 'Trust & Safety',
        refunds: 'Refund Policy',
        contact: 'Contact Us',
      },
      tagline: 'Made with ❤️ for creators',
      taglineSub: 'From Idea to Published Video',
      securePayments: 'Secure payments processed by Whop, our Merchant of Record',
      morLine: MOR_FOOTER_LINE,
      copyright: '© 2026 SceneFlow AI. All rights reserved.',
      address:
        'Life Focus, LLC • 14205 N Mo Pac Expy Ste 570, Austin, Texas 78728-6529 • Contact: brian@sfai.studio',
      poweredBy: 'Powered by Google Cloud',
    },
    floatingCta: {
      seePricing: 'See Pricing',
      tryNine: 'Try $9',
      tryForNine: 'Try for $9',
      dismiss: 'Dismiss',
    },
    common: {
      watermark: 'SceneFlow AI Studio',
      pause: 'Pause',
      play: 'Play',
      mute: 'Mute',
      unmute: 'Unmute',
      expandVideo: 'Expand Video',
    },
  }
}

export type LandingMessages = ReturnType<typeof buildEnMessages>
