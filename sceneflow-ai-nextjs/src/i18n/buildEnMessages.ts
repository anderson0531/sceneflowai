/**
 * Canonical English landing messages — source of truth for MT pipeline.
 * Config files remain for IDs/structure; display strings live here for i18n.
 */
import {
  AUDIENCE_PATHS,
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
import {
  BEAT_FIRST_CARD,
  SCREENING_ROOM_COPY,
  WORKFLOW_PHASES,
} from '@/config/landing/workflowPhaseCopy'
import { VIDEO_CATEGORIES } from '@/config/landing/useCaseExamples'
import {
  HERO_VIDEO_LANGUAGE_PROMPT,
  HERO_VIDEO_LOCALES,
  HERO_VIDEO_MULTILANG_HINT,
} from '@/config/landing/heroVideoLocales'

const FAQ_ITEMS = [
  {
    question: 'How does the SceneFlow workflow run from idea to publish-ready video?',
    answer:
      'SceneFlow uses a structured workflow: Series (optional) → Blueprint → Production → Final Cut → Premiere. Blueprint defines story structure and target audience with Audience Resonance. Production generates script, storyboard, beat video, and rendered scene streams. Final Cut assembles selected streams into one master MP4 — not a timeline editor. Premiere handles screenings, analytics insights, YouTube publish, and export bundles.',
  },
  {
    question: 'How is SceneFlow different from Gemini Studio or Google Flow?',
    answer:
      'Gemini Studio and Google Flow focus on prompt-and-generate clips. SceneFlow bundles the full production workflow: structured phases with editable baselines, Reference Library and Beat Frames for consistency, Audience Resonance before expensive renders, automated Mixer and stream assembly, and Screening Room validation before publish — all in one guided studio.',
  },
  {
    question: 'Can I edit AI-generated scripts, visuals, and audio?',
    answer:
      'Yes. All generated output remains editable. You can rewrite scripts, adjust scene direction, regenerate specific beats, tune voiceover, and refine timing in the Production Mixer. Final Cut only stitches finished streams — creative changes stay upstream in Production.',
  },
  {
    question: 'How does Target Audience Resonance work now?',
    answer:
      'Director/Audience dual scoring has been deprecated. SceneFlow now uses Target Audience Resonance analysis at key points: Series, Blueprint, and script-level review in Production. You get actionable recommendations to optimize clarity, pacing, emotion, and audience fit before heavy rendering.',
  },
  {
    question: 'Can I produce multilingual listing or marketing videos?',
    answer:
      'Yes. You can generate and localize videos in 70+ languages with aligned timing workflows. Teams typically create one master cut, then produce language variants for global buyers, customers, or regional audiences.',
  },
  {
    question: 'What does Premiere do if Screening Room is the review phase?',
    answer:
      'Screening Room is the review surface inside Premiere — and for Production storyboard preview. Share /s/ links, collect stakeholder feedback and optional engagement analytics (with viewer consent), review Scoring and Visual insights, then publish via YouTube wizard or export bundles.',
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
] as const

export function buildEnMessages() {
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
      howItWorks: 'How It Works',
      useCases: 'Use Cases',
      platformWalkthrough: 'Platform Walkthrough',
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
      paths: AUDIENCE_PATHS.map((p) => ({
        id: p.id,
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
      badge: 'Production Applications',
      title: 'Whatever Video You Can Imagine,',
      titleAccent: 'Build It in SceneFlow',
      subtitle:
        'Real-estate showcases, education, podcasts, news formats, branded campaigns, and cinematic stories — one automated studio from concept to publish-ready master.',
      ui: {
        useCases: 'Use Cases',
        sectors: '{count} SECTORS',
        demoComingSoon: 'Demo coming soon',
        selectExample: 'Select an example to preview its demo',
      },
      categories: VIDEO_CATEGORIES.map((cat) => ({
        id: cat.id,
        title: cat.title,
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
        'A complete guide to the SceneFlow AI Studio workflow, from collaboration reviews to final cinematic output.',
      subheading: 'Studio feature deep dive',
      close: 'Close',
      viewDetails: 'View Details',
      beatFirst: BEAT_FIRST_CARD,
      screeningRoom: SCREENING_ROOM_COPY,
    },
    faq: {
      badge: 'Got Questions?',
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about SceneFlow AI',
      items: FAQ_ITEMS.map((f) => ({ question: f.question, answer: f.answer })),
    },
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
    },
  }
}

export type LandingMessages = ReturnType<typeof buildEnMessages>
