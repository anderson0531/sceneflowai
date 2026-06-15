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
import {
  SIMPLE_WALKTHROUGH_HEADER,
  SIMPLE_WALKTHROUGH_STEPS,
  SIMPLE_WALKTHROUGH_UI,
} from '@/config/landing/simpleWalkthroughCopy'
import { getLandingPlans } from '@/lib/billing/tierCatalog'

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
      showDetails: 'Show details',
      hideDetails: 'Hide details',
      seeExamples: 'See examples',
      examplesFor: 'Examples for {label}:',
      andMore: ', and more.',
      expandImage: 'Expand image',
      closePreview: 'Close preview',
      playNarration: 'Play narration',
      pauseNarration: 'Pause narration',
      narrationComingSoon: 'Narration coming soon',
      modes: AUDIENCE_PATH_MODES,
      paths: AUDIENCE_PATHS.map((p) => {
        const persona = USE_CASE_PERSONAS[p.id as keyof typeof USE_CASE_PERSONAS]
        return {
          id: p.id,
          hash: p.hash,
          icon: p.icon,
          label: p.label,
          outcome: p.outcome,
          narrative: p.narrative,
          useCases: [...p.useCases],
          example: {
            challengeTitle: persona.challenge.title,
            challengeDescription: persona.challenge.description,
            solutionTitle: persona.solution.title,
            solutionDescription: persona.solution.description,
            win: persona.win,
          },
        }
      }),
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
    simpleWalkthrough: {
      ...SIMPLE_WALKTHROUGH_HEADER,
      steps: SIMPLE_WALKTHROUGH_STEPS.map((step) => ({
        id: step.id,
        stepLabel: step.stepLabel,
        shortDescription: step.shortDescription,
        detailedDescription: step.detailedDescription,
        media: step.media,
        ...(step.subPoints ? { subPoints: [...step.subPoints] } : {}),
        ...(step.screenshotSlot ? { screenshotSlot: step.screenshotSlot } : {}),
      })),
      ui: SIMPLE_WALKTHROUGH_UI,
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
        selectExample: 'SELECT A USE CASE TO LEARN MORE',
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
    platformWalkthrough: {
      badge: 'Under the hood',
      title: 'Detailed Platform Walkthrough',
      subtitle:
        'Expand for guided clips on series planning, reference continuity, production depth, Screening Room, and trust & safety — for technical reviewers and deeper dives.',
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
    landingSections: LANDING_SECTION_COLLAPSE_COPY,
    finalCta: FINAL_CTA_COPY,
    footer: {
      description:
        'End-to-end automated video production — from concept to publish-ready master. One guided studio: Blueprint → Production → Screening Room.',
      product: 'Product',
      resources: 'Resources',
      legal: 'Legal',
      links: {
        features: 'Features',
        pricing: 'Pricing',
        howItWorks: 'How It Works',
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
