/**
 * SceneFlow AI Studio — Unified Help Academy, Interactive Tutorial & Just-In-Time (JIT) Configuration
 *
 * Powers:
 * 1. Global Just-In-Time (JIT) Context-Aware Help Drawer (`JitHelpDrawer`)
 * 2. Interactive Annotated Studio Screenshot Viewer (`AnnotatedStudioScreenshot`)
 * 3. SceneFlow Studio Academy & Training Hub (`/dashboard/help`)
 */

import { TIER_CATALOG } from '@/lib/billing/tierCatalog'
import {
  ADDON_CREDIT_SHELF_LIFE_DAYS,
  EXPLORER_CREDIT_SHELF_LIFE_DAYS,
} from '@/lib/credits/creditLots'
import type { FeatureRoomId } from '@/config/landing/featureRoomMedia'

export type JitContextId =
  | 'dashboard'
  | 'series'
  | 'blueprint'
  | 'production'
  | 'final-cut'
  | 'premiere'
  | 'agency-ops'
  | 'producer'
  | 'billing'

/** Maps studio JIT contexts to their 7-language narrated overview video room ID. */
export const JIT_CONTEXT_TO_FEATURE_ROOM: Partial<Record<JitContextId, FeatureRoomId>> = {
  series: 'series-desk',
  blueprint: 'blueprint-board',
  production: 'production-stage',
  'final-cut': 'screening-room',
  premiere: 'screening-room',
}

export interface ScreenshotHotspot {
  id: string
  number: number
  /** Percentage from left (0-100) for the numbered pin */
  x: number
  /** Percentage from top (0-100) for the numbered pin */
  y: number
  /** Spotlight rectangle (in % of 1200x675 canvas) */
  spotlight: {
    left: number
    top: number
    width: number
    height: number
  }
  label: string
  locationTag: string
  summary: string
  proTip?: string
  creditNote?: string
  actionLabel?: string
  actionEvent?: string
  actionHref?: string
}

export interface JitQuickStep {
  id: string
  stepNumber: number
  title: string
  description: string
  creditBadge?: string
  actionLabel?: string
  /** Dispatches `window.dispatchEvent(new CustomEvent(actionEvent))` */
  actionEvent?: string
  /** Navigates to URL if provided */
  actionHref?: string
}

export interface JitTroubleshootingItem {
  question: string
  answer: string
  fixActionLabel?: string
  fixActionEvent?: string
  fixActionHref?: string
}

export interface JitContextGuide {
  id: JitContextId
  title: string
  shortTitle: string
  subtitle: string
  badge: string
  estimatedTime: string
  screenshotSrc: string
  screenshotAlt: string
  summary: string
  hotspots: ScreenshotHotspot[]
  quickSteps: JitQuickStep[]
  creditGuardrail: {
    title: string
    typicalCost: string
    proSavingsRule: string
  }
  troubleshooting: JitTroubleshootingItem[]
}

export interface InteractiveTutorialStep {
  id: string
  stepNumber: number
  title: string
  duration: string
  contextId: JitContextId
  screenshotSrc: string
  focusHotspotNumber: number
  objective: string
  instructions: string[]
  keyTakeaway: string
  tryActionLabel: string
  tryActionEvent?: string
  tryActionHref?: string
}

export interface InteractiveTutorialCourse {
  id: string
  title: string
  subtitle: string
  level: 'Beginner' | 'Essential' | 'Pro Strategy' | 'Showrunner' | 'Agency Scale'
  totalDuration: string
  badgeColor: 'cyan' | 'purple' | 'emerald' | 'amber'
  outcome: string
  steps: InteractiveTutorialStep[]
}

export interface CreatorPlaybook {
  id: string
  persona: string
  tagline: string
  recommendedPlan: string
  recommendedPlanHref: string
  iconName: 'BookOpen' | 'Film' | 'Layers' | 'Building2'
  workflowSummary: string
  milestones: {
    phase: string
    action: string
    creditTip: string
  }[]
}

export interface CreditEstimatorPreset {
  id: string
  label: string
  runtimeLabel: string
  sceneCount: number
  keyframePairsPerScene: number
  videoClipsPerScene: number
  languagesCount: number
  description: string
}

export interface HelpKnowledgeArticle {
  id: string
  category: JitContextId
  title: string
  summary: string
  readTime: string
  tags: string[]
  bullets: string[]
  proTip: string
}

// =============================================================================
// 1. ROUTE-AWARE JUST-IN-TIME (JIT) CONTEXT GUIDES
// =============================================================================

export const JIT_CONTEXT_GUIDES: Record<JitContextId, JitContextGuide> = {
  dashboard: {
    id: 'dashboard',
    title: 'Command Center & Project Launchpad',
    shortTitle: 'Dashboard',
    subtitle: 'Choose between a standalone Film Blueprint or a multi-episode Series Story Bible.',
    badge: 'Stage 0 • Launchpad',
    estimatedTime: '1 min setup',
    screenshotSrc: '/images/help/dashboard-command-screenshot.svg',
    screenshotAlt: 'SceneFlow Studio Command Center Dashboard with Start Project, Series Room, and Active Productions',
    summary:
      'The Command Center is where you start new films, manage multi-episode Series Bibles, monitor your credit vault, and resume in-flight productions.',
    hotspots: [
      {
        id: 'dash-start-project',
        number: 1,
        x: 32,
        y: 32,
        spotlight: { left: 22.5, top: 28.5, width: 18.5, height: 8.5 },
        label: 'Start New Film Project',
        locationTag: 'Hero Launchpad • Primary CTA',
        summary:
          'Launches the Blueprint Room where you can type a 1-sentence concept, paste a chapter from your book, or import a full screenplay.',
        proTip: 'You only need a rough idea to start—SceneFlow expands it into a 3-act film treatment automatically.',
        creditNote: '~25 credits for full treatment',
        actionLabel: 'Start New Project',
        actionHref: '/dashboard/studio/new-project',
      },
      {
        id: 'dash-series-studio',
        number: 2,
        x: 51,
        y: 32,
        spotlight: { left: 41.5, top: 28.5, width: 18.5, height: 8.5 },
        label: 'Open Series Room',
        locationTag: 'Hero Launchpad • Secondary CTA',
        summary:
          'Building a multi-episode story or chapter-by-chapter book adaptation? Start in Series Room so all episodes share one locked cast and location bible.',
        proTip: 'Creating a Series Bible first prevents you from having to recreate characters in Episode 2, 3, and beyond.',
        actionLabel: 'Open Series Room',
        actionHref: '/dashboard/series',
      },
      {
        id: 'dash-credits-badge',
        number: 3,
        x: 84,
        y: 4,
        spotlight: { left: 77.5, top: 1, width: 12, height: 5.5 },
        label: 'Live Credit Vault Meter',
        locationTag: 'Top Global Header',
        summary:
          'Displays your combined Monthly Subscription + Top-Up Vault balance. Credits expiring soonest are always spent first (FEFO)—typically your monthly subscription allotment, or an older pack nearing expiry so you never waste expiring credits.',
        proTip: 'Click the credit badge anytime to inspect per-feature usage or top up credits without leaving your workflow.',
        actionLabel: 'View Plans & Credits',
        actionHref: '/dashboard/settings/billing',
      },
      {
        id: 'dash-resume-card',
        number: 4,
        x: 38,
        y: 66,
        spotlight: { left: 20.5, top: 47, width: 38, height: 48 },
        label: 'Active Project Cards',
        locationTag: 'Recent Productions Grid',
        summary:
          'Each card shows the current workflow phase, Audience Resonance score, and scene count so you can jump straight back into production.',
        proTip: 'Duplicate a project before making radical experimental cuts if you want to compare two versions.',
        actionLabel: 'Browse All Projects',
        actionHref: '/dashboard/projects',
      },
    ],
    quickSteps: [
      {
        id: 'dash-step-1',
        stepNumber: 1,
        title: 'Pick Standalone Film vs. Multi-Episode Series',
        description:
          'Creating one standalone short film or trailer? Click "Start Project". Adapting multiple chapters or episodes? Start in "Series Room".',
        creditBadge: 'Free to browse',
        actionLabel: 'Start Standalone Film',
        actionHref: '/dashboard/studio/new-project',
      },
      {
        id: 'dash-step-2',
        stepNumber: 2,
        title: 'Take the 10-Minute Interactive Tour',
        description:
          'New to AI filmmaking? Run the interactive walkthrough to see how Blueprint, Continuity Vault, and Animatics fit together.',
        creditBadge: '0 credits',
        actionLabel: 'Open Interactive Academy',
        actionHref: '/dashboard/help?tab=tutorials',
      },
      {
        id: 'dash-step-3',
        stepNumber: 3,
        title: 'Verify Your Credit & BYOK Setup',
        description:
          'Check your available credits in Billing, or connect your optional Google Vertex AI key in Settings → BYOK Settings.',
        actionLabel: 'Open Billing & Credits',
        actionHref: '/dashboard/settings/billing',
      },
    ],
    creditGuardrail: {
      title: 'Start Small, Scale Smoothly',
      typicalCost: '25–45 credits to develop & greenlight a full story Blueprint',
      proSavingsRule:
        'Spend your first 5% of credits in the Blueprint Room perfecting the script before generating images or video.',
    },
    troubleshooting: [
      {
        question: 'Should I start in "Start Project" or "Series Room"?',
        answer:
          'If your story is a single self-contained video (under 15 minutes), use Start Project. If your characters will return across multiple chapters or episodes, start in Series Room so their faces and voices stay locked across episodes.',
        fixActionLabel: 'Go to Series Room',
        fixActionHref: '/dashboard/series',
      },
      {
        question: 'Why does the app ask for an active subscription on studio routes?',
        answer:
          'SceneFlow provisions dedicated cloud GPU pipelines for image, video, and voice synthesis plus Continuity Vault storage per subscriber. You can start with the $9 Explorer trial or any monthly plan.',
        fixActionLabel: 'View Plans & Explorer ($9)',
        fixActionHref: '/dashboard/settings/billing',
      },
    ],
  },

  series: {
    id: 'series',
    title: 'Series Room & Shared Story Bible',
    shortTitle: 'Series Room',
    subtitle: 'Build multi-episode shows or chapter-by-chapter adaptations with one shared cast & location vault.',
    badge: 'Series Architecture',
    estimatedTime: '3–5 mins',
    screenshotSrc: '/images/help/series-studio-screenshot.svg',
    screenshotAlt: 'Series Room showing shared Season Story Bible, locked cast, locations, and Episode Pipeline',
    summary:
      'Series Room lets you define your show universe once—protagonists, antagonists, voices, locations, and visual aesthetic—and automatically injects that Continuity Vault into every episode you generate.',
    hotspots: [
      {
        id: 'series-bible-header',
        number: 1,
        x: 34,
        y: 18,
        spotlight: { left: 2, top: 10.5, width: 96, height: 23.5 },
        label: 'Shared Story Bible & Continuity Vault',
        locationTag: 'Top Series Banner',
        summary:
          'Stores canonical character portraits, wardrobe descriptions, neural voice assignments, and master locations for the entire season.',
        proTip: 'Lock your main cast portraits in the Series Bible before launching Episode 2 so every episode shares identical character DNA.',
      },
      {
        id: 'series-cast-pills',
        number: 2,
        x: 15,
        y: 28,
        spotlight: { left: 3.5, top: 24, width: 43, height: 7.5 },
        label: 'Canonical Cast & Master Locations',
        locationTag: 'Bible Asset Pills',
        summary:
          'Every character and location approved here is automatically synced into each episode project without re-prompting.',
        proTip: 'Include specific lens and lighting notes in your Series Aesthetic so Episode 1 and Episode 10 look like the same film.',
      },
      {
        id: 'series-ep-cards',
        number: 3,
        x: 50,
        y: 62,
        spotlight: { left: 34.5, top: 41, width: 31, height: 55 },
        label: 'Episode Production Pipeline Cards',
        locationTag: 'Episode Grid',
        summary:
          'Track each episode from Outline → Blueprint Room → Production Stage → Completed Master. Click any episode card to open its studio workspace.',
        proTip: 'Produce Episode 1 all the way through Animatic first to validate your show pacing before batch-producing Episodes 2–5.',
      },
      {
        id: 'series-generate-next',
        number: 4,
        x: 88,
        y: 4,
        spotlight: { left: 80, top: 1.5, width: 18, height: 5.5 },
        label: 'Generate Next Episode Blueprint',
        locationTag: 'Top Right Action',
        summary:
          'Spins up the next episode project pre-populated with your Series Bible characters, locations, and story arc continuity.',
        creditNote: '~25 credits per episode blueprint',
      },
    ],
    quickSteps: [
      {
        id: 'series-step-1',
        stepNumber: 1,
        title: 'Create or Select Your Series Bible',
        description:
          'Enter your series logline, genre, and target episode count to generate a multi-episode story arc and shared cast.',
        creditBadge: '~30 credits',
        actionLabel: 'Browse Series Room',
        actionHref: '/dashboard/series',
      },
      {
        id: 'series-step-2',
        stepNumber: 2,
        title: 'Lock Recurring Characters & Locations',
        description:
          'Approve the reference portraits and voice assignments in the Series Bible so every episode inherits them automatically.',
        creditBadge: '10–15 cr / portrait',
      },
      {
        id: 'series-step-3',
        stepNumber: 3,
        title: 'Launch Episode 1 into Blueprint Room',
        description:
          'Click "Launch Episode Blueprint" on Episode 1 to refine its 3-act treatment and start Production Stage.',
      },
    ],
    creditGuardrail: {
      title: 'Zero Duplicate Asset Cost Across Episodes',
      typicalCost: 'Define cast once; reuse across 10–40 episodes for 0 extra character credits',
      proSavingsRule:
        'Never recreate recurring characters inside individual episodes—always add them to the Series Bible so they sync free of charge.',
    },
    troubleshooting: [
      {
        question: 'What if a character changes wardrobe in Episode 4?',
        answer:
          'You can add wardrobe outfits to the character inside Production Stage while keeping their core facial reference portrait and voice locked.',
      },
      {
        question: 'Can I adapt a book chapter-by-chapter in Series Room?',
        answer:
          'Yes! Treat each chapter as an Episode in Series Room. Your book characters and world locations stay locked while you produce one chapter at a time.',
      },
    ],
  },

  blueprint: {
    id: 'blueprint',
    title: 'The Blueprint Room & Audience Resonance™',
    shortTitle: 'Blueprint Room',
    subtitle: 'Transform your raw concept into a greenlit, 80+ Resonance film treatment before spending production credits.',
    badge: 'Phase 1 • Blueprint',
    estimatedTime: '3–5 mins',
    screenshotSrc: '/images/help/blueprint-room-screenshot.svg',
    screenshotAlt: 'SceneFlow Blueprint Room showing Concept Input, Hero Key Art, 3-Act Story Beats, and 86/100 Audience Resonance Score',
    summary:
      'The Blueprint Room is your AI Writer’s Room and Executive Producer. Generate your film treatment, inspect act-by-act story beats, and use Audience Resonance™ to fix pacing or character flaws while changes cost pennies.',
    hotspots: [
      {
        id: 'bp-concept-bar',
        number: 1,
        x: 48,
        y: 15,
        spotlight: { left: 21, top: 10, width: 48.5, height: 9.5 },
        label: 'Concept Prompt & Script Input',
        locationTag: 'Top Center Input',
        summary:
          'Enter a 1-sentence logline, a detailed synopsis, or paste an existing script/chapter. Click Regenerate to explore alternative narrative takes.',
        proTip: 'Include genre, protagonist flaw, and visual setting in your prompt for the sharpest initial treatment.',
        creditNote: '25 credits',
        actionLabel: 'Generate / Edit Concept',
        actionEvent: 'blueprint:enter-concept',
      },
      {
        id: 'bp-story-beats',
        number: 2,
        x: 48,
        y: 68,
        spotlight: { left: 21, top: 54.5, width: 48.5, height: 42 },
        label: 'Interactive 3-Act Beat Sheet',
        locationTag: 'Center Treatment Card',
        summary:
          'Review and edit the logline, protagonist stakes, and Act I / II / III scene breakdown directly or with AI co-writing.',
        proTip: 'Keep your first film between 5 and 8 scenes—tighter scripts have higher pacing scores and cost far fewer credits to render.',
        actionLabel: 'Refine Treatment Beats',
        actionEvent: 'blueprint:edit-sections',
      },
      {
        id: 'bp-resonance-radar',
        number: 3,
        x: 84,
        y: 35,
        spotlight: { left: 70.5, top: 10, width: 28, height: 75 },
        label: 'Audience Resonance™ Score & 1-Click Fixes',
        locationTag: 'Right Analysis Panel',
        summary:
          'Simulates audience and critic reception across Emotional Hook, Pacing, Character Stakes, and Visual Potential. Aim for 80/100+ before advancing.',
        proTip: 'Click "Apply Recommended Fix" to automatically weave the AI critic’s improvements into your treatment.',
        creditNote: '20 credits per analysis',
        actionLabel: 'Run Audience Resonance',
        actionEvent: 'blueprint:analyze-resonance',
      },
      {
        id: 'bp-start-production',
        number: 4,
        x: 88,
        y: 90,
        spotlight: { left: 72, top: 87, width: 25, height: 7 },
        label: 'Approve & Start Production Stage',
        locationTag: 'Bottom Right Greenlight CTA',
        summary:
          'Converts your approved treatment into a full scene-by-scene production script with camera directions, dialogue, and character lists.',
        proTip: 'Only click Start Production once your Audience Resonance score hits 80+ and you love the story beats.',
        actionLabel: 'Start Production Phase',
        actionEvent: 'blueprint:start-production',
      },
    ],
    quickSteps: [
      {
        id: 'bp-step-1',
        stepNumber: 1,
        title: 'Generate Your Film Treatment',
        description:
          'Enter your story concept or script and generate a complete 3-act Film Treatment with hero key art.',
        creditBadge: '~25 credits',
        actionLabel: 'Generate Treatment',
        actionEvent: 'blueprint:generate-treatment',
      },
      {
        id: 'bp-step-2',
        stepNumber: 2,
        title: 'Run Audience Resonance™ Analysis',
        description:
          'Evaluate your story against your target demographic across 5 narrative axes and identify weak beats.',
        creditBadge: '~20 credits',
        actionLabel: 'Analyze Resonance',
        actionEvent: 'blueprint:analyze-resonance',
      },
      {
        id: 'bp-step-3',
        stepNumber: 3,
        title: 'Apply 1-Click Fixes to Reach 80+ Score',
        description:
          'Apply the AI script doctor recommendations until your Resonance score reaches 80/100 or higher.',
        creditBadge: '~15 credits',
        actionLabel: 'Apply Resonance Fixes',
        actionEvent: 'blueprint:apply-fixes',
      },
      {
        id: 'bp-step-4',
        stepNumber: 4,
        title: 'Greenlight into Production Stage',
        description:
          'Lock the Blueprint and generate your scene-by-scene screenplay, cast list, and visual breakdown.',
        creditBadge: '~30 credits',
        actionLabel: 'Start Production →',
        actionEvent: 'blueprint:start-production',
      },
    ],
    creditGuardrail: {
      title: 'The 80+ Greenlight Rule Saves 70% of Credits',
      typicalCost: '45–75 credits total to write, test, and greenlight a complete Blueprint',
      proSavingsRule:
        'Fixing a weak Act II in the Blueprint Room costs 15 credits. Fixing it after rendering 20 motion video clips costs 1,500+ credits.',
    },
    troubleshooting: [
      {
        question: 'My Audience Resonance score is stuck around 72. How do I break 80?',
        answer:
          'Check the lowest-scoring axis in the Resonance panel (usually Pacing or Character Stakes) and click "Apply Recommended Fix". Tightening scene count from 12 to 8 often jumps Pacing by +10 points.',
        fixActionLabel: 'Analyze Resonance Now',
        fixActionEvent: 'blueprint:analyze-resonance',
      },
      {
        question: 'Can I change the Hero Key Art image?',
        answer:
          'Yes! Hover over the Hero image on your Treatment card and click Regenerate to create a new poster concept.',
        fixActionLabel: 'Regenerate Hero Image',
        fixActionEvent: 'blueprint:regenerate-hero',
      },
    ],
  },

  production: {
    id: 'production',
    title: 'Production Stage, Continuity Vault & Timeline',
    shortTitle: 'Production Stage',
    subtitle: 'Lock character faces & voices in the Continuity Vault, render start/end keyframes, and animate motion video clips.',
    badge: 'Phase 2 • Production Stage',
    estimatedTime: '5–15 mins',
    screenshotSrc: '/images/help/virtual-production-screenshot.svg',
    screenshotAlt: 'Production Stage workspace showing Continuity Vault on left, Start/End Keyframes and AI Video Motion in center, and Multitrack Audio Timeline at bottom',
    summary:
      'Production Stage is your digital soundstage. Lock your cast portraits, wardrobe, and voices on the left; generate reference-locked Start & End Keyframes in the center; mix Dialogue, SFX, and Score on the timeline; and animate hero shots into full motion video.',
    hotspots: [
      {
        id: 'prod-continuity-vault',
        number: 1,
        x: 13,
        y: 35,
        spotlight: { left: 1.5, top: 10, width: 24.5, height: 78 },
        label: 'Continuity Vault™ (Cast, Wardrobe & Locations)',
        locationTag: 'Left Reference Panel',
        summary:
          'Approve each character’s portrait, wardrobe, and neural voice here FIRST. SceneFlow automatically injects these visual references into every scene frame.',
        proTip: 'Never generate scene keyframes before locking your main character portraits—this is the secret to 100% facial consistency.',
        creditNote: '10–15 cr per portrait',
        actionLabel: 'Open Cast References',
        actionEvent: 'vision:characters',
      },
      {
        id: 'prod-keyframes-pair',
        number: 2,
        x: 51,
        y: 31,
        spotlight: { left: 28.5, top: 19, width: 45.5, height: 24 },
        label: 'Start & End Keyframe Pair',
        locationTag: 'Main Stage • Left & Center Frames',
        summary:
          'Every shot segment begins with a high-resolution Start and End Keyframe. Use them for an instant Animatic storyboard, or feed both into the video engine for controlled camera motion.',
        proTip: 'Generating keyframes costs 8x less than video. Perfect your lighting and composition in keyframes before clicking Animate!',
        creditNote: '10–15 cr per frame',
        actionLabel: 'Open Scene Gallery',
        actionEvent: 'production:scene-gallery',
      },
      {
        id: 'prod-video-motion',
        number: 3,
        x: 86,
        y: 31,
        spotlight: { left: 74.5, top: 19, width: 22, height: 24 },
        label: 'AI Video Motion Interpolation',
        locationTag: 'Main Stage • Right Video Monitor',
        summary:
          'Transforms your approved Start/End keyframes into smooth 1080p/4K cinematic video with accurate physics and camera movement.',
        proTip: 'You don’t have to animate every single shot! Many top creators animate 40% hero shots and keep 60% as dynamic Ken Burns keyframes.',
        creditNote: '80–150 cr per clip',
        actionLabel: 'Open Production Agent',
        actionEvent: 'sceneflow:open-production-builder',
      },
      {
        id: 'prod-multitrack-timeline',
        number: 4,
        x: 62,
        y: 82,
        spotlight: { left: 27, top: 65.5, width: 71.5, height: 32 },
        label: 'Multitrack Audio & Visual Timeline',
        locationTag: 'Bottom Studio Dock',
        summary:
          'Synchronizes visual segments with Character Dialogue, Narration, Foley SFX, and auto-ducked Cinematic Music.',
        proTip: 'Generate Dialogue audio before finalizing video clip durations so every shot matches the spoken line length.',
        creditNote: '5–15 cr per scene audio',
        actionLabel: 'Jump to Scene Audio',
        actionEvent: 'vision:scenes',
      },
    ],
    quickSteps: [
      {
        id: 'prod-step-1',
        stepNumber: 1,
        title: 'Lock Cast Portraits, Voices & Locations First',
        description:
          'Generate and approve character portraits, neural voices, and location references in the Reference Library.',
        creditBadge: '10–15 cr / ref',
        actionLabel: 'Open Cast References',
        actionEvent: 'vision:characters',
      },
      {
        id: 'prod-step-2',
        stepNumber: 2,
        title: 'Synthesize Dialogue, SFX & Musical Score',
        description:
          'Assign voices to each character and generate scene dialogue and atmosphere so your timeline timing is locked.',
        creditBadge: '5–15 cr / scene',
        actionLabel: 'Assign Voices & Audio',
        actionEvent: 'production:assign-voices',
      },
      {
        id: 'prod-step-3',
        stepNumber: 3,
        title: 'Render Start/End Keyframes & Preview Animatic',
        description:
          'Generate reference-locked keyframes for each segment and watch the full film in the Screening Room as an Animatic.',
        creditBadge: '10–15 cr / frame',
        actionLabel: 'Jump to Scene Keyframes',
        actionEvent: 'vision:scenes',
      },
      {
        id: 'prod-step-4',
        stepNumber: 4,
        title: 'Animate Hero Shots or Launch Production Agent',
        description:
          'Convert key shots into motion video manually, or launch the autonomous Production Agent to build Pre-Vis, Clips, Master, and Promo while you walk away.',
        creditBadge: 'Walk-Away Mode',
        actionLabel: 'Launch Production Agent',
        actionEvent: 'sceneflow:open-production-builder',
      },
    ],
    creditGuardrail: {
      title: 'The "Animatic First" Secret of Pro Directors',
      typicalCost: '~120 credits for an entire 6-scene Animatic vs. ~900 credits for full video',
      proSavingsRule:
        'Always watch your film in the Screening Room as a voiced Keyframe Animatic first. Only animate video clips on shots that pass your Animatic check.',
    },
    troubleshooting: [
      {
        question: 'Can SceneFlow build all my scenes, clips, and master while I walk away?',
        answer:
          'Yes! Click "Production Agent" in the Production Stage header to choose your scene scope (All Scenes, Chapter, or Custom), stages (Pre-Vis, Clips, Scenes, Master, Promo), Director Checkpoints, and notification frequency. It automatically optimizes shot direction and switches persistent policy blocks to Creative Clips.',
        fixActionLabel: 'Open Production Agent',
        fixActionEvent: 'sceneflow:open-production-builder',
      },
      {
        question: 'Why does my character look slightly different in Scene 4?',
        answer:
          'Make sure the character has an approved reference portrait in the Reference Library AND is tagged in Scene 4’s character list before generating the keyframe.',
        fixActionLabel: 'Check Cast References',
        fixActionEvent: 'vision:characters',
      },
      {
        question: 'A dialogue line is longer than the visual segment. How do I fix it?',
        answer:
          'SceneFlow automatically extends segment duration to match dialogue in Animatic mode, or you can split a long segment into two shots (Wide + Close-up) in Production Streams & Mixer.',
        fixActionLabel: 'Open Production Streams',
        fixActionEvent: 'production:streams',
      },
    ],
  },

  'final-cut': {
    id: 'final-cut',
    title: 'Final Cut Assembly & Screening Room',
    shortTitle: 'Final Cut & Screening',
    subtitle: 'Blend Animatic & Video streams, switch across 70+ dubbed languages, and share /s/ review links.',
    badge: 'Phase 3 • Final Cut',
    estimatedTime: '2–5 mins',
    screenshotSrc: '/images/help/final-cut-screening-screenshot.svg',
    screenshotAlt: 'Final Cut and Screening Room showing Master Video Player, 70+ Language Audio Switcher, and Reviewer Screening Link panel',
    summary:
      'Final Cut & Screening Room is your post-production suite and private screening theater. Seamlessly mix Animatic keyframes and motion video clips, preview dubbed audio tracks in 70+ languages, and share a /s/ link for timestamped feedback.',
    hotspots: [
      {
        id: 'fc-stream-selector',
        number: 1,
        x: 53,
        y: 4,
        spotlight: { left: 40.5, top: 1.5, width: 26.5, height: 5.5 },
        label: 'Master Video vs. Animatic Stream Toggle',
        locationTag: 'Top Center Toolbar',
        summary:
          'Switch between your pure Animatic cut, full Video cut, or Hybrid Smart Assembly (which uses motion video where rendered and smooth Ken Burns keyframes everywhere else).',
        proTip: 'Hybrid Smart Assembly lets you export a complete, watchable film at any stage of production!',
        actionLabel: 'Preview Screening Room',
        actionEvent: 'screening-room:preview',
      },
      {
        id: 'fc-multilingual-bar',
        number: 2,
        x: 34,
        y: 83,
        spotlight: { left: 2, top: 73, width: 65, height: 23.5 },
        label: '70+ Language Audio & Subtitle Switcher',
        locationTag: 'Below Screening Player',
        summary:
          'Generate and preview localized dialogue tracks and synced captions in Spanish, Portuguese, Mandarin, Hindi, Arabic, Thai, Japanese, French, German, and 70+ languages.',
        proTip: 'SceneFlow preserves each character’s vocal timbre across languages while keeping your SFX and musical score intact.',
        creditNote: '~15–30 cr per language track',
      },
      {
        id: 'fc-share-screening',
        number: 3,
        x: 83,
        y: 26,
        spotlight: { left: 68.5, top: 10, width: 29.5, height: 54 },
        label: 'Private /s/ Screening Link & Viewer Notes',
        locationTag: 'Right Collaboration Panel',
        summary:
          'Generate a password-optional /s/ watch link for co-creators, clients, or test audiences. Viewers can leave time-coded notes without needing a SceneFlow account.',
        proTip: 'Send an Animatic /s/ link to clients for sign-off BEFORE spending credits on final 4K video renders.',
        actionLabel: 'Create Screening Link',
        actionEvent: 'screening-room:create-screening',
      },
      {
        id: 'fc-export-master',
        number: 4,
        x: 83,
        y: 78,
        spotlight: { left: 70, top: 64.5, width: 26.5, height: 29 },
        label: 'MP4 Master Export & Premiere Kit',
        locationTag: 'Bottom Right Export Card',
        summary:
          'Renders your final normalized MP4 film (-14 LUFS broadcast audio) along with theatrical posters, thumbnails, and SRT caption bundles.',
        actionLabel: 'Assemble Final Cut',
        actionEvent: 'screening-room:assemble',
      },
    ],
    quickSteps: [
      {
        id: 'fc-step-1',
        stepNumber: 1,
        title: 'Watch Full-Screen in the Screening Room',
        description:
          'Play your assembled scenes back-to-back with transitions, dialogue, SFX, and auto-ducked score.',
        creditBadge: '0 credits',
        actionLabel: 'Preview Full Film',
        actionEvent: 'screening-room:preview',
      },
      {
        id: 'fc-step-2',
        stepNumber: 2,
        title: 'Share a /s/ Review Link for Feedback',
        description:
          'Generate a shareable screening link to collect timestamped notes from collaborators or clients.',
        creditBadge: '0 credits',
        actionLabel: 'Create Review Link',
        actionEvent: 'screening-room:create-screening',
      },
      {
        id: 'fc-step-3',
        stepNumber: 3,
        title: 'Export MP4 Master & Multi-Language Dubs',
        description:
          'Render your final 1080p/4K MP4 master and optional localized audio/subtitle streams.',
        creditBadge: '20–50 cr render',
        actionLabel: 'Assemble & Export',
        actionEvent: 'screening-room:assemble',
      },
    ],
    creditGuardrail: {
      title: 'Client Sign-Off Before Final Render',
      typicalCost: 'Sharing /s/ Screening Room links is 100% free (0 credits)',
      proSavingsRule:
        'Use free /s/ screening links to get stakeholder approval on pacing and dialogue before running final 4K renders.',
    },
    troubleshooting: [
      {
        question: 'What happens if some scenes have video and others only have keyframes?',
        answer:
          'Final Cut automatically plays motion video clips for scenes that have them and uses smooth cinematic pan-and-zoom (Ken Burns) keyframes for the rest so your movie plays without gaps.',
      },
      {
        question: 'How do I adjust music volume so it doesn’t overpower dialogue?',
        answer:
          'SceneFlow automatically ducks background music under dialogue lines during Screening Room playback and MP4 export.',
      },
    ],
  },

  premiere: {
    id: 'premiere',
    title: 'Premiere, Distribution & Launch Kit',
    shortTitle: 'Premiere',
    subtitle: 'Package your finished film with theatrical key art, festival synopses, and multi-language masters.',
    badge: 'Phase 4 • Premiere',
    estimatedTime: '2 mins',
    screenshotSrc: '/images/help/final-cut-screening-screenshot.svg',
    screenshotAlt: 'Premiere Launch Kit showing MP4 export, multi-language caption bundles, and promotional assets',
    summary:
      'Premiere prepares your finished master for YouTube, TikTok, film festivals, or client delivery with automated key art thumbnails, SEO metadata, and multi-language subtitle packages.',
    hotspots: [
      {
        id: 'prem-stream-check',
        number: 1,
        x: 53,
        y: 4,
        spotlight: { left: 40.5, top: 1.5, width: 26.5, height: 5.5 },
        label: 'Master Quality Verification',
        locationTag: 'Top Toolbar',
        summary: 'Verify your final 1080p/4K video master and audio loudness normalization before publishing.',
        proTip: 'Check both desktop and mobile framing if you plan to cut vertical 9:16 teasers.',
      },
      {
        id: 'prem-dub-export',
        number: 2,
        x: 34,
        y: 83,
        spotlight: { left: 2, top: 73, width: 65, height: 23.5 },
        label: 'Multi-Language Track & SRT Export',
        locationTag: 'Language Bar',
        summary: 'Download individual localized audio masters or multi-language `.srt` / `.vtt` subtitle files for YouTube multi-track audio.',
        proTip: 'Adding Spanish, Japanese, and Portuguese audio tracks to YouTube can 3x global watch time.',
      },
      {
        id: 'prem-screening-url',
        number: 3,
        x: 83,
        y: 26,
        spotlight: { left: 68.5, top: 10, width: 29.5, height: 54 },
        label: 'Hosted Screening Room Premiere Page',
        locationTag: 'Right Panel',
        summary: 'Publish a branded `/s/` screening page to showcase your film to investors, festivals, or audiences.',
        actionLabel: 'Create Screening Page',
        actionEvent: 'screening-room:create-screening',
      },
      {
        id: 'prem-promo-kit',
        number: 4,
        x: 83,
        y: 78,
        spotlight: { left: 70, top: 64.5, width: 26.5, height: 29 },
        label: '1-Click Premiere Launch Kit',
        locationTag: 'Bottom Right Promo Card',
        summary: 'Generate high-CTR 16:9 thumbnails, theatrical posters, loglines, and chapter markers directly from your film’s visual vault.',
        actionLabel: 'Open Promo Studio',
        actionEvent: 'studio:open-promo',
      },
    ],
    quickSteps: [
      {
        id: 'prem-step-1',
        stepNumber: 1,
        title: 'Download Your MP4 Master & SRT Captions',
        description: 'Export your final video file and subtitle bundle for YouTube, Vimeo, or festival submission.',
        actionLabel: 'Publish & Export',
        actionEvent: 'screening-room:publish',
      },
      {
        id: 'prem-step-2',
        stepNumber: 2,
        title: 'Generate Posters & High-CTR Thumbnails',
        description: 'Create promotional key art using your locked character and location references.',
        actionLabel: 'Open Promo Kit',
        actionEvent: 'studio:open-promo',
      },
      {
        id: 'prem-step-3',
        stepNumber: 3,
        title: 'Share Your Hosted Premiere Link',
        description: 'Send your `/s/` screening link to audiences or collaborators.',
        actionLabel: 'Create Screening Link',
        actionEvent: 'screening-room:create-screening',
      },
    ],
    creditGuardrail: {
      title: 'Multiply Reach with Multilingual Dubs',
      typicalCost: '15–30 credits to dub an existing film into a new language',
      proSavingsRule:
        'Once your visuals are rendered, dubbing into additional languages only re-synthesizes the dialogue track—visuals cost 0 extra credits!',
    },
    troubleshooting: [
      {
        question: 'Do I own commercial rights to my exported films?',
        answer:
          'Yes! All paid tiers (Starter, Pro, Studio) include full commercial usage rights for YouTube monetization, client work, and streaming distribution.',
      },
    ],
  },

  'agency-ops': {
    id: 'agency-ops',
    title: 'Agency Ops, Client CRM & Vault Hygiene',
    shortTitle: 'Agency Ops',
    subtitle: 'Manage multi-PM client pipelines, SLA aging alerts, margin scorecards, and Continuity Vault storage hygiene.',
    badge: 'White-Label Operations',
    estimatedTime: '3 mins',
    screenshotSrc: '/images/help/dashboard-command-screenshot.svg',
    screenshotAlt: 'SceneFlow Agency Ops & Client CRM dashboard showing active client accounts, PM workload scorecards, and Vault storage hygiene',
    summary:
      'Agency Ops (/dashboard/clients) unifies your Client CRM, PM Workload & Margin Scorecard, and Continuity Vault Storage Hygiene—so multi-PM teams can track hundreds of productions without bottlenecks or storage overages.',
    hotspots: [
      {
        id: 'agency-client-crm',
        number: 1,
        x: 32,
        y: 32,
        spotlight: { left: 22.5, top: 28.5, width: 18.5, height: 8.5 },
        label: 'Client Account Directory & Project Rollups',
        locationTag: 'Clients Tab',
        summary:
          'Group projects by client company, filter by locale or PM owner, and jump directly into client intake, Blueprint, or Screening Room deliverables.',
        actionLabel: 'Open Projects Kanban',
        actionHref: '/dashboard/projects',
      },
      {
        id: 'agency-pm-scorecard',
        number: 2,
        x: 51,
        y: 32,
        spotlight: { left: 41.5, top: 28.5, width: 18.5, height: 8.5 },
        label: 'PM Workload, SLA Aging & Margin Scorecard',
        locationTag: 'PM Scorecard Tab',
        summary:
          'Track active assignments per Project Manager, spot overdue SLA deliverables early, and monitor credit burn vs. monthly PM caps.',
        actionLabel: 'Manage Team & Roles',
        actionHref: '/dashboard/settings/producer',
      },
      {
        id: 'agency-vault-hygiene',
        number: 3,
        x: 84,
        y: 4,
        spotlight: { left: 77.5, top: 1, width: 12, height: 5.5 },
        label: 'Continuity Vault Storage Hygiene & 1-Click Purge',
        locationTag: 'Storage Hygiene Tab',
        summary:
          'Inspect per-project storage consumption across your Continuity Vault and purge unused draft takes in 1 click without touching locked masters or cast anchors.',
        actionLabel: 'View Vault Quotas',
        actionHref: '/dashboard/settings/billing',
      },
      {
        id: 'agency-kanban-scale',
        number: 4,
        x: 38,
        y: 66,
        spotlight: { left: 20.5, top: 47, width: 38, height: 48 },
        label: 'Unlimited Projects Search & 6-Column Kanban',
        locationTag: 'Projects Pipeline',
        summary:
          'Switch to Kanban view in Projects for drag-and-drop stage progression, bulk PM assignment, locale auto-routing, and 0-credit QA Reviewer sign-off.',
        actionLabel: 'Open Projects Pipeline',
        actionHref: '/dashboard/projects',
      },
    ],
    quickSteps: [
      {
        id: 'agency-step-1',
        stepNumber: 1,
        title: 'Assign PMs & QA Reviewers to Workspaces',
        description:
          'Invite Project Managers with monthly credit caps and 0-credit QA Reviewers in Settings → Producer & Team.',
        actionLabel: 'Configure Team & Seats',
        actionHref: '/dashboard/settings/producer',
      },
      {
        id: 'agency-step-2',
        stepNumber: 2,
        title: 'Track Deliverables on the 6-Column Kanban Board',
        description:
          'Filter by PM, client, status, or SLA urgency on /dashboard/projects to keep every production on schedule.',
        actionLabel: 'Open Projects Kanban',
        actionHref: '/dashboard/projects',
      },
      {
        id: 'agency-step-3',
        stepNumber: 3,
        title: 'Run Monthly Vault Storage Hygiene',
        description:
          'Purge superseded draft takes on completed films to keep active projects inside your included Vault GB quota.',
        actionLabel: 'Open Agency Ops',
        actionHref: '/dashboard/clients',
      },
    ],
    creditGuardrail: {
      title: 'Protect Agency Margins with PM Caps & QA Roles',
      typicalCost: 'QA Reviewers consume 0 credits while verifying continuity and cuts',
      proSavingsRule:
        'Assign a monthly credit cap per PM and use 1-Click Draft Purge on delivered projects before paying for extra 100 GB vault blocks.',
    },
    troubleshooting: [
      {
        question: 'How do team members switch between their personal workspace and our agency?',
        answer:
          'Invited PMs and QA Reviewers can use the Workspace Switcher in the sidebar to toggle between their personal account and any agency workspace they belong to.',
        fixActionLabel: 'Manage Team Access',
        fixActionHref: '/dashboard/settings/producer',
      },
    ],
  },

  producer: {
    id: 'producer',
    title: 'Producer Hub & White-Label Client Portals',
    shortTitle: 'Producer Hub',
    subtitle: 'Configure your studio brand, custom domain, zero-login client intake links, and multi-PM team permissions.',
    badge: 'White-Label Setup',
    estimatedTime: '3 mins',
    screenshotSrc: '/images/help/credits-byok-screenshot.svg',
    screenshotAlt: 'SceneFlow Producer Hub showing white-label brand identity, client intake links, and team seats',
    summary:
      'Producer & Team (/dashboard/settings/producer) lets Operator Pro ($149/mo) and Agency Scale ($599/mo) studios run a 100% white-label production business with branded client intake, Blueprint sign-off, Screening Room portals, and team seats.',
    hotspots: [
      {
        id: 'prodhub-brand',
        number: 1,
        x: 45,
        y: 21,
        spotlight: { left: 2, top: 10.5, width: 96, height: 21.5 },
        label: 'White-Label Brand Identity & Custom Domain',
        locationTag: 'Brand Settings',
        summary:
          'Set your studio logo, brand colors, support email, and custom domain (Studio tier) so clients see your brand on every intake and review link.',
      },
      {
        id: 'prodhub-intake',
        number: 2,
        x: 26,
        y: 52,
        spotlight: { left: 2, top: 34.5, width: 47, height: 36 },
        label: 'Zero-Login Client Story Intake Links',
        locationTag: 'Client Intake',
        summary:
          'Share private intake links where clients upload EXIF-stripped photos, dictate voice interviews, and sign likeness consent without creating an account.',
      },
      {
        id: 'prodhub-team',
        number: 3,
        x: 74,
        y: 52,
        spotlight: { left: 50.5, top: 34.5, width: 47.5, height: 36 },
        label: 'Multi-PM Invites, Credit Caps & Locale Routing',
        locationTag: 'Team & RBAC',
        summary:
          'Invite up to 3 seats on Operator Pro or 10 seats on Studio with role guardrails (admin, project_manager, qa_reviewer) and locale-based PM auto-routing.',
      },
      {
        id: 'prodhub-clients',
        number: 4,
        x: 60,
        y: 84,
        spotlight: { left: 2, top: 73, width: 96, height: 23.5 },
        label: 'Agency Ops & Series Delegation',
        locationTag: 'Operations Link',
        summary:
          'Delegate entire multi-episode series to specific PMs and monitor all active client deliveries from Agency Ops.',
        actionLabel: 'Open Agency Ops',
        actionHref: '/dashboard/clients',
      },
    ],
    quickSteps: [
      {
        id: 'prodhub-step-1',
        stepNumber: 1,
        title: 'Complete Your White-Label Brand Profile',
        description:
          'Accept the Producer Addendum and upload your studio name, logo, and support contact so client portals are branded immediately.',
        actionLabel: 'Open Producer Settings',
        actionHref: '/dashboard/settings/producer',
      },
      {
        id: 'prodhub-step-2',
        stepNumber: 2,
        title: 'Invite Project Managers or QA Reviewers',
        description:
          'Send signed invite links with monthly credit caps and optional locale routing for global multilingual clients.',
      },
      {
        id: 'prodhub-step-3',
        stepNumber: 3,
        title: 'Monitor Client Deliveries in Agency Ops',
        description:
          'Track every client project, SLA status, and Continuity Vault storage footprint in one command center.',
        actionLabel: 'Open Agency Ops',
        actionHref: '/dashboard/clients',
      },
    ],
    creditGuardrail: {
      title: 'Zero-Login Client Approvals Protect Your Compute',
      typicalCost: 'Client intake, Blueprint Pass, and Screening Room links cost 0 credits',
      proSavingsRule:
        'Lock client story approval via Blueprint Pass before rendering Veo 4K motion clips so revision rounds never eat your margin.',
    },
    troubleshooting: [
      {
        question: 'Which plans include White-Label Client Portals and Team Seats?',
        answer: `Operator Pro ($${TIER_CATALOG.pro.priceUsd}/mo) includes 100% white-label portals and ${TIER_CATALOG.pro.collaborationSeats} team seats; Agency Scale Studio ($${TIER_CATALOG.studio.priceUsd}/mo) adds custom domains and ${TIER_CATALOG.studio.collaborationSeats} team seats.`,
        fixActionLabel: 'Compare Plans',
        fixActionHref: '/dashboard/settings/billing',
      },
    ],
  },

  billing: {
    id: 'billing',
    title: 'Plans, Credit Vault & Vertex AI BYOK',
    shortTitle: 'Credits & BYOK',
    subtitle: 'Understand Subscription + 12-Month Add-On credits, Vault storage, and Google Vertex AI BYOK.',
    badge: 'Studio Economics',
    estimatedTime: '2 mins',
    screenshotSrc: '/images/help/credits-byok-screenshot.svg',
    screenshotAlt: 'SceneFlow Billing, Plans (Explorer, Hobbyist, Starter, Operator Pro, Studio), Credit Pool breakdown, and Vertex AI BYOK',
    summary: `SceneFlow uses a transparent FEFO (First-Expiring, First-Out) dual-pool credit system: credits expiring soonest are always spent first—typically your Monthly Subscription allotment, or an older pack nearing expiry so you never waste expiring credits. Subscriber Add-On packs remain valid for ${Math.round(ADDON_CREDIT_SHELF_LIFE_DAYS / 30)} months (${ADDON_CREDIT_SHELF_LIFE_DAYS} days) from purchase (Explorer trial credits expire after ${EXPLORER_CREDIT_SHELF_LIFE_DAYS} days). Operator Pro and Studio subscribers can also connect their own Google Vertex AI API key (BYOK).`,
    hotspots: [
      {
        id: 'bill-dual-pool',
        number: 1,
        x: 45,
        y: 21,
        spotlight: { left: 2, top: 10.5, width: 96, height: 21.5 },
        label: 'Dual Credit Pool (Monthly + 12-Month Add-On Vault)',
        locationTag: 'Top Credit Vault Banner',
        summary:
          'Credits expiring soonest are always spent first (FEFO)—typically your monthly subscription allotment, or an older pack nearing expiry so you never waste expiring credits. Subscriber Add-On packs ($25 / $100 / $250) last 12 months from purchase.',
        proTip: 'If a big episode render needs extra headroom mid-month, grab a 12-month Add-On pack without changing your base plan.',
      },
      {
        id: 'bill-explorer-starter',
        number: 2,
        x: 26,
        y: 52,
        spotlight: { left: 2, top: 34.5, width: 47, height: 36 },
        label: `Explorer ($${TIER_CATALOG.explorer.priceUsd}), Hobbyist ($${TIER_CATALOG.hobbyist.priceUsd}/mo) & Starter ($${TIER_CATALOG.starter.priceUsd}/mo)`,
        locationTag: 'Left Plan Cards',
        summary: `Explorer ($${TIER_CATALOG.explorer.priceUsd} one-time, ${TIER_CATALOG.explorer.credits.toLocaleString()} cr, ${TIER_CATALOG.explorer.storageGb} GB 30-day trial) lets you test the full pipeline. Hobbyist ($${TIER_CATALOG.hobbyist.priceUsd}/mo, ${TIER_CATALOG.hobbyist.credits.toLocaleString()} cr, ${TIER_CATALOG.hobbyist.storageGb} GB) hosts solo storytellers & Vault assets, while Starter ($${TIER_CATALOG.starter.priceUsd}/mo, ${TIER_CATALOG.starter.credits.toLocaleString()} cr, ${TIER_CATALOG.starter.storageGb} GB) powers chapter-by-chapter indie creators.`,
        proTip: `${TIER_CATALOG.starter.credits.toLocaleString()} credits on Starter is enough for 2–3 full Animatic chapters plus 15–20 hero motion video clips every month.`,
      },
      {
        id: 'bill-pro-studio',
        number: 3,
        x: 74,
        y: 52,
        spotlight: { left: 50.5, top: 34.5, width: 47.5, height: 36 },
        label: `Operator Pro ($${TIER_CATALOG.pro.priceUsd}/mo) & Agency Scale Studio ($${TIER_CATALOG.studio.priceUsd}/mo)`,
        locationTag: 'Right Plan Cards',
        summary: `Operator Pro (${TIER_CATALOG.pro.credits.toLocaleString()} cr/mo, ${TIER_CATALOG.pro.storageGb} GB, ${TIER_CATALOG.pro.collaborationSeats} seats) and Studio (${TIER_CATALOG.studio.credits.toLocaleString()} cr/mo, ${TIER_CATALOG.studio.storageGb} GB, ${TIER_CATALOG.studio.collaborationSeats} seats) unlock 100% White-Label Client Portals, 4K Veo 3.1, custom voice cloning, priority queues, and Vertex AI BYOK.`,
        proTip: 'Need a production break while preserving your Continuity Vault and client links? Pause-to-Vault is $19/mo.',
      },
      {
        id: 'bill-byok',
        number: 4,
        x: 60,
        y: 84,
        spotlight: { left: 2, top: 73, width: 96, height: 23.5 },
        label: 'Bring Your Own Key (Google Vertex AI BYOK)',
        locationTag: 'Bottom Hybrid Architecture Card',
        summary:
          'Connect your own Google Vertex AI API key in Settings → BYOK Settings for direct-billed studio compute while keeping SceneFlow orchestration.',
        actionLabel: 'Configure BYOK Key',
        actionHref: '/dashboard/settings/byok',
      },
    ],
    quickSteps: [
      {
        id: 'bill-step-1',
        stepNumber: 1,
        title: 'Choose the Right Plan for Your Cadence',
        description: `Start with Explorer ($${TIER_CATALOG.explorer.priceUsd}) for a test flight, Hobbyist ($${TIER_CATALOG.hobbyist.priceUsd}/mo) or Starter ($${TIER_CATALOG.starter.priceUsd}/mo) for solo chapters, Operator Pro ($${TIER_CATALOG.pro.priceUsd}/mo) for white-label client work, or Studio ($${TIER_CATALOG.studio.priceUsd}/mo) for multi-PM agencies.`,
        actionLabel: 'Manage Subscription',
        actionHref: '/dashboard/settings/billing',
      },
      {
        id: 'bill-step-2',
        stepNumber: 2,
        title: 'Connect Optional Google Vertex AI BYOK Key',
        description:
          'Operator Pro and Studio accounts can plug in a Google Vertex AI key under Settings → BYOK Settings.',
        actionLabel: 'Open BYOK Settings',
        actionHref: '/dashboard/settings/byok',
      },
      {
        id: 'bill-step-3',
        stepNumber: 3,
        title: 'Use the Interactive Credit Calculator',
        description:
          'Estimate exact credit usage for your runtime and visual style before starting production.',
        actionLabel: 'Open Credit Calculator',
        actionHref: '/dashboard/help?tab=calculator',
      },
    ],
    creditGuardrail: {
      title: 'Where Credits Go: Text (5%) vs. Images/Audio (20%) vs. Video (75%)',
      typicalCost: 'Blueprint (25 cr) • Keyframe (10–15 cr) • Scene Audio (10 cr) • Motion Video (80–150 cr)',
      proSavingsRule:
        'Because motion video accounts for ~75% of credit usage, locking your Blueprint and Keyframes first stretches your credits 3x further.',
    },
    troubleshooting: [
      {
        question: 'What happens if a cloud render fails or times out?',
        answer:
          'SceneFlow automatically refunds credits if an upstream AI provider fails to return a valid image, audio track, or video clip.',
      },
      {
        question: 'How long do Add-On credit packs and Explorer credits last?',
        answer: `Credits expiring soonest are always spent first (FEFO)—typically your monthly subscription allotment, or an older pack nearing expiry so you never waste expiring credits. Monthly plan credits refresh each billing cycle, Subscriber Add-On packs remain valid for 12 months (${ADDON_CREDIT_SHELF_LIFE_DAYS} days) from purchase, and one-time Explorer trial credits are valid for ${EXPLORER_CREDIT_SHELF_LIFE_DAYS} days.`,
        fixActionLabel: 'Open Billing & Credit Vault',
        fixActionHref: '/dashboard/settings/billing',
      },
    ],
  },
}

/**
 * Automatically resolves the active `JitContextId` from any Next.js pathname
 * (and optional query string / URLSearchParams for `?view=streams|screening`).
 */
export function getJitContextIdForPath(
  pathname: string | null | undefined,
  search?: string | URLSearchParams | null
): JitContextId {
  const clean = (pathname || '/dashboard').toLowerCase()
  if (clean.includes('/dashboard/clients')) return 'agency-ops'
  if (clean.includes('/dashboard/settings/producer')) return 'producer'
  if (clean.includes('/dashboard/series')) return 'series'
  if (clean.includes('/dashboard/studio')) return 'blueprint'
  if (clean.includes('/dashboard/workflow/vision')) {
    let viewParam: string | null = null
    if (search instanceof URLSearchParams) {
      viewParam = search.get('view')
    } else if (typeof search === 'string' && search) {
      const normalized = search.startsWith('?') ? search.slice(1) : search
      viewParam = new URLSearchParams(normalized).get('view')
    } else if (clean.includes('?')) {
      viewParam = new URLSearchParams(clean.split('?')[1]).get('view')
    }
    if (viewParam === 'streams') return 'final-cut'
    if (viewParam === 'screening') return 'premiere'
    return 'production'
  }
  if (clean.includes('/dashboard/workflow/final-cut')) return 'final-cut'
  if (clean.includes('/dashboard/workflow/premiere')) return 'premiere'
  if (clean.includes('/dashboard/settings')) return 'billing'
  return 'dashboard'
}

export function getJitContextForPath(
  pathname: string | null | undefined,
  search?: string | URLSearchParams | null
): JitContextGuide {
  return JIT_CONTEXT_GUIDES[getJitContextIdForPath(pathname, search)]
}

/**
 * Fallback route when a user clicks a room-scoped action button while on another page
 * (e.g., `/dashboard/help` or `/dashboard`) where room event listeners are not mounted.
 */
export function getFallbackHrefForContext(contextId: JitContextId): string {
  switch (contextId) {
    case 'series':
      return '/dashboard/series'
    case 'blueprint':
      return '/dashboard/studio/new-project'
    case 'production':
    case 'final-cut':
    case 'premiere':
      return '/dashboard/projects'
    case 'agency-ops':
      return '/dashboard/clients'
    case 'producer':
      return '/dashboard/settings/producer'
    case 'billing':
      return '/dashboard/settings/billing'
    case 'dashboard':
    default:
      return '/dashboard'
  }
}

// =============================================================================
// 2. INTERACTIVE GUIDED TUTORIAL COURSES
// =============================================================================

export const INTERACTIVE_TUTORIALS: InteractiveTutorialCourse[] = [
  {
    id: 'first-film-10m',
    title: 'Your First Film in 10 Minutes',
    subtitle: 'Go from a 1-sentence idea to a fully voiced, scored, and playable film step by step.',
    level: 'Beginner',
    totalDuration: '10 mins',
    badgeColor: 'cyan',
    outcome: 'Master the 5-stage SceneFlow pipeline and produce your first playable short film.',
    steps: [
      {
        id: 'ff-1',
        stepNumber: 1,
        title: 'Launch a New Blueprint from a Simple Idea',
        duration: '2 mins',
        contextId: 'blueprint',
        screenshotSrc: '/images/help/blueprint-room-screenshot.svg',
        focusHotspotNumber: 1,
        objective: 'Turn a single sentence or chapter excerpt into a structured 3-act Film Treatment.',
        instructions: [
          'Click "Start Project" from the Dashboard or left sidebar to enter the Blueprint Room.',
          'Type your story premise (even 1–2 sentences is enough) including genre and visual mood.',
          'Click "Generate Treatment" (~25 credits) to create your title, logline, hero key art, and 3-act beat sheet.',
        ],
        keyTakeaway:
          'You never need to know screenplay formatting—SceneFlow structures your acts and visual beats automatically.',
        tryActionLabel: 'Open Blueprint Room',
        tryActionHref: '/dashboard/studio/new-project',
      },
      {
        id: 'ff-2',
        stepNumber: 2,
        title: 'Hit 80+ on Audience Resonance™ Before Advancing',
        duration: '2 mins',
        contextId: 'blueprint',
        screenshotSrc: '/images/help/blueprint-room-screenshot.svg',
        focusHotspotNumber: 3,
        objective: 'Validate your story pacing and emotional hook using AI audience simulation.',
        instructions: [
          'In the right-hand Audience Resonance panel, click "Analyze Resonance" (~20 credits).',
          'Inspect your score across Emotional Hook, Pacing, Character Stakes, and Visual Potential.',
          'Click "Apply Recommended Fix" to automatically weave the highest-impact narrative improvements into your treatment until you reach 80/100+.',
        ],
        keyTakeaway:
          'Fixing story pacing in the Blueprint Room costs 15 credits; fixing it after video rendering costs 1,000+ credits.',
        tryActionLabel: 'Trigger Resonance Analysis',
        tryActionEvent: 'blueprint:analyze-resonance',
      },
      {
        id: 'ff-3',
        stepNumber: 3,
        title: 'Lock Character Faces & Voices in the Continuity Vault',
        duration: '2 mins',
        contextId: 'production',
        screenshotSrc: '/images/help/virtual-production-screenshot.svg',
        focusHotspotNumber: 1,
        objective: 'Guarantee 100% character and location consistency across every scene.',
        instructions: [
          'Click "Start Production" to enter Production Stage.',
          'Before generating scene frames, open the Reference Library / Continuity Vault on the left.',
          'Generate and approve each main character’s portrait, wardrobe, and neural voice.',
        ],
        keyTakeaway:
          'Once a character portrait is locked in the Continuity Vault, every scene keyframe automatically inherits their exact face and outfit.',
        tryActionLabel: 'Open Cast References',
        tryActionEvent: 'vision:characters',
      },
      {
        id: 'ff-4',
        stepNumber: 4,
        title: 'Build Your Voiced Animatic (Keyframes + Multitrack Audio)',
        duration: '2 mins',
        contextId: 'production',
        screenshotSrc: '/images/help/virtual-production-screenshot.svg',
        focusHotspotNumber: 2,
        objective: 'Create a playable storyboard film with dialogue, SFX, and score before rendering expensive video.',
        instructions: [
          'Click "Generate Scene Audio" to synthesize character dialogue, narration, SFX, and background music.',
          'Render the Start & End Keyframes for each scene segment.',
          'Open the Screening Room tab to watch your complete voiced Animatic from start to finish!',
        ],
        keyTakeaway:
          'An Animatic lets you experience 100% of your movie’s story, emotion, and timing for less than 15% of the credit cost of full video.',
        tryActionLabel: 'Jump to Scene Keyframes',
        tryActionEvent: 'vision:scenes',
      },
      {
        id: 'ff-5',
        stepNumber: 5,
        title: 'Animate Hero Shots into Motion Video & Export in Screening Room',
        duration: '2 mins',
        contextId: 'final-cut',
        screenshotSrc: '/images/help/final-cut-screening-screenshot.svg',
        focusHotspotNumber: 1,
        objective: 'Upgrade key segments to full motion video and share or export your master.',
        instructions: [
          'Select your favorite keyframes in Production Stage and click "Animate Video" to interpolate smooth cinematic motion.',
          'Switch to Production Streams & Screening Room to watch your hybrid or full-video master.',
          'Click "Share /s/ Review Link" to send a watch link to friends/clients, or "Export MP4 Master" to download.',
        ],
        keyTakeaway:
          'Production Streams seamlessly blend motion video clips and Ken Burns keyframes so you can export a polished film at any budget.',
        tryActionLabel: 'Preview in Screening Room',
        tryActionEvent: 'screening-room:preview',
      },
    ],
  },

  {
    id: 'continuity-mastery',
    title: 'Character & World Continuity Mastery',
    subtitle: 'How to keep faces, outfits, props, and lighting identical across 20+ scenes or 30 episodes.',
    level: 'Essential',
    totalDuration: '6 mins',
    badgeColor: 'purple',
    outcome: 'Eliminate AI "face drift" and maintain Hollywood-grade visual continuity.',
    steps: [
      {
        id: 'cm-1',
        stepNumber: 1,
        title: 'Approve Neutral, Well-Lit Canonical Portraits',
        duration: '2 mins',
        contextId: 'production',
        screenshotSrc: '/images/help/virtual-production-screenshot.svg',
        focusHotspotNumber: 1,
        objective: 'Create clean reference anchors in the Continuity Vault.',
        instructions: [
          'Open the Character Reference panel in Production Stage (or Series Room).',
          'Ensure each character description specifies age, distinct facial structure, hair, and signature wardrobe.',
          'Generate and lock the portrait before rendering any scene keyframes.',
        ],
        keyTakeaway: 'Specificity in silhouette and wardrobe ("cobalt dive suit with brass collar") anchors AI diffusion far better than vague adjectives.',
        tryActionLabel: 'Open Character References',
        tryActionEvent: 'vision:characters',
      },
      {
        id: 'cm-2',
        stepNumber: 2,
        title: 'Lock Master Locations & Key Props',
        duration: '2 mins',
        contextId: 'production',
        screenshotSrc: '/images/help/virtual-production-screenshot.svg',
        focusHotspotNumber: 1,
        objective: 'Keep recurring rooms, vehicles, and signature objects consistent.',
        instructions: [
          'Generate Location References for any set that appears in more than one scene.',
          'Create Object References for hero props (e.g., an ancient compass, a custom vehicle).',
          'Verify that scenes set in that location link to the approved Location Reference.',
        ],
        keyTakeaway: 'Linking a Location Reference automatically injects architectural layout, color palette, and lens style into every shot.',
        tryActionLabel: 'Open Location References',
        tryActionEvent: 'vision:locations',
      },
      {
        id: 'cm-3',
        stepNumber: 3,
        title: 'Use Start & End Keyframe Anchoring for Video Motion',
        duration: '2 mins',
        contextId: 'production',
        screenshotSrc: '/images/help/virtual-production-screenshot.svg',
        focusHotspotNumber: 3,
        objective: 'Prevent character morphing during 6-second video motion clips.',
        instructions: [
          'Always inspect both the Start Keyframe and End Keyframe of a segment first.',
          'When both keyframes feature your locked character reference, the video engine interpolates between two verified anchors.',
          'Click "Animate Video" only after both keyframes look sharp.',
        ],
        keyTakeaway: 'Start + End keyframe anchoring constrains video motion so characters never drift mid-shot.',
        tryActionLabel: 'Open Keyframe Stage',
        tryActionEvent: 'production:scene-gallery',
      },
    ],
  },

  {
    id: 'animatic-first-savings',
    title: 'Animatic-First Filmmaking (Save 70% of Credits)',
    subtitle: 'How smart indie filmmakers produce full chapters on a Starter budget without wasting video renders.',
    level: 'Pro Strategy',
    totalDuration: '5 mins',
    badgeColor: 'emerald',
    outcome: 'Stretch 4,500 credits into multiple finished chapters every month.',
    steps: [
      {
        id: 'af-1',
        stepNumber: 1,
        title: 'Why Hollywood Never Shoots Without an Animatic',
        duration: '1 min',
        contextId: 'blueprint',
        screenshotSrc: '/images/help/blueprint-room-screenshot.svg',
        focusHotspotNumber: 2,
        objective: 'Understand the 1:10:100 credit ratio between Text, Keyframes, and Video.',
        instructions: [
          'Rewriting a scene in Blueprint costs ~15 credits.',
          'Rendering a scene’s keyframes + full voice/SFX audio costs ~35 credits.',
          'Rendering 3 motion video takes for that same scene costs ~350 credits.',
        ],
        keyTakeaway: 'Never test whether a scene "works" using video generation—test it in Blueprint and Animatic mode.',
        tryActionLabel: 'Open Blueprint Room',
        tryActionEvent: 'blueprint:edit-sections',
      },
      {
        id: 'af-2',
        stepNumber: 2,
        title: 'Build the Full Audio + Keyframe Cut First',
        duration: '2 mins',
        contextId: 'production',
        screenshotSrc: '/images/help/virtual-production-screenshot.svg',
        focusHotspotNumber: 4,
        objective: 'Assemble dialogue, Foley SFX, music, and keyframes across all scenes.',
        instructions: [
          'Generate Dialogue TTS and Music for all scenes so the emotional rhythm is set.',
          'Generate Start/End keyframes for all segments (~10–15 cr per image).',
          'Watch the entire film in Screening Room using the Animatic stream.',
        ],
        keyTakeaway: 'With dynamic Ken Burns camera pans, synced voices, and spatial sound effects, a SceneFlow Animatic already feels like a motion comic film.',
        tryActionLabel: 'Jump to Scene Audio',
        tryActionEvent: 'vision:scenes',
      },
      {
        id: 'af-3',
        stepNumber: 3,
        title: 'Selectively Upgrade 30–50% "Money Shots" to Motion Video',
        duration: '2 mins',
        contextId: 'final-cut',
        screenshotSrc: '/images/help/final-cut-screening-screenshot.svg',
        focusHotspotNumber: 1,
        objective: 'Combine hero motion video clips with Ken Burns keyframes in Production Streams.',
        instructions: [
          'Pick the most kinetic moments in each scene (e.g., the reveal, the action beat, the emotional close-up) and animate those into motion video.',
          'Leave dialogue reaction shots or establishing stills as high-res animated keyframes.',
          'Export the hybrid master in Production Streams for maximum visual impact at 30% of the credit cost.',
        ],
        keyTakeaway: 'Audiences remember your hero shots and audio emotion—hybrid assembly gives you cinema quality on an indie budget.',
        tryActionLabel: 'Open Production Streams',
        tryActionEvent: 'screening-room:assemble',
      },
    ],
  },

  {
    id: 'series-and-global-dubbing',
    title: 'Multi-Episode Series & 70+ Language Global Release',
    subtitle: 'Scale a recurring show universe and publish simultaneously in English, Spanish, Portuguese, Mandarin, Hindi, Arabic, Thai, and 70+ languages.',
    level: 'Showrunner',
    totalDuration: '6 mins',
    badgeColor: 'amber',
    outcome: 'Build a reusable Series Bible and multiply global viewership with 1-click dubbing.',
    steps: [
      {
        id: 'sg-1',
        stepNumber: 1,
        title: 'Architect Your Season in Series Room',
        duration: '3 mins',
        contextId: 'series',
        screenshotSrc: '/images/help/series-studio-screenshot.svg',
        focusHotspotNumber: 1,
        objective: 'Create a shared Story Bible that feeds 10–40 episodes automatically.',
        instructions: [
          'Open Series Room (`/dashboard/series`) and create a new Series.',
          'Lock your canonical cast portraits, character voices, and master locations in the Series Bible.',
          'Generate Episode 1, 2, and 3 blueprints directly from the Episode Pipeline grid.',
        ],
        keyTakeaway: 'Every episode automatically inherits your Series Bible assets with zero duplicate setup.',
        tryActionLabel: 'Open Series Room',
        tryActionHref: '/dashboard/series',
      },
      {
        id: 'sg-2',
        stepNumber: 2,
        title: 'Dub Your Master into 70+ Languages in Final Cut',
        duration: '3 mins',
        contextId: 'final-cut',
        screenshotSrc: '/images/help/final-cut-screening-screenshot.svg',
        focusHotspotNumber: 2,
        objective: 'Localize dialogue and captions without re-rendering a single frame of video.',
        instructions: [
          'In Final Cut / Screening Room, select the Language Track bar below the player.',
          'Choose target languages (e.g., Spanish, Japanese, French, German, Portuguese).',
          'SceneFlow translates the script to match timing, synthesizes matching character voices, and keeps your original SFX and music bed untouched.',
        ],
        keyTakeaway: 'Adding 4–5 language audio tracks on YouTube or social channels unlocks international audiences for ~20 credits per language.',
        tryActionLabel: 'Preview Screening Room',
        tryActionEvent: 'screening-room:preview',
      },
    ],
  },

  {
    id: 'white-label-agency-scale',
    title: 'Run a White-Label Video Studio & Multi-PM Agency',
    subtitle: 'Deliver memoirs, real estate tours, and training videos under your own brand with multiple PMs, QA reviewers, and zero-login client portals.',
    level: 'Agency Scale',
    totalDuration: '6 mins',
    badgeColor: 'emerald',
    outcome: 'Configure branded client portals, delegate series to PMs, and protect margins with Kanban SLA tracking & Vault hygiene.',
    steps: [
      {
        id: 'wl-1',
        stepNumber: 1,
        title: 'Brand Your White-Label Portals & Invite Team Seats',
        duration: '2 mins',
        contextId: 'producer',
        screenshotSrc: '/images/help/credits-byok-screenshot.svg',
        focusHotspotNumber: 1,
        objective: 'Replace SceneFlow branding with your studio identity on Client Intake, Blueprint Pass, and Screening Room links.',
        instructions: [
          'Open Settings → Producer & Team (/dashboard/settings/producer) and upload your studio logo, brand palette, support email, and optional custom domain.',
          'Invite Project Managers with monthly credit caps and 0-credit QA Reviewers using signed invite links.',
          'Configure optional locale auto-routing so incoming Spanish, Portuguese, Mandarin, Hindi, Arabic, or Thai clients route to the right PM.',
        ],
        keyTakeaway: 'Every client portal link requires zero client login—reducing friction for families and busy corporate stakeholders.',
        tryActionLabel: 'Open Producer & Team',
        tryActionHref: '/dashboard/settings/producer',
      },
      {
        id: 'wl-2',
        stepNumber: 2,
        title: 'Track 100+ Projects with Kanban SLA & Series Delegation',
        duration: '2 mins',
        contextId: 'agency-ops',
        screenshotSrc: '/images/help/dashboard-command-screenshot.svg',
        focusHotspotNumber: 4,
        objective: 'Keep multiple PMs aligned across hundreds of productions without bottlenecks.',
        instructions: [
          'Open Projects (/dashboard/projects) and toggle the 6-column Kanban view for drag-and-drop stage transitions and SLA aging alerts.',
          'Use bulk actions to assign PMs, update due dates, or filter across clients, statuses, and locales.',
          'Delegate entire multi-episode seasons to a PM in Series Room while invited staff use the sidebar Workspace Switcher to toggle workspaces.',
        ],
        keyTakeaway: 'QA Reviewers can inspect continuity, Blueprints, and Screening Room cuts with 0 credit spend permissions.',
        tryActionLabel: 'Open Projects Kanban',
        tryActionHref: '/dashboard/projects',
      },
      {
        id: 'wl-3',
        stepNumber: 3,
        title: 'Monitor Margins & Reclaim Continuity Vault Storage',
        duration: '2 mins',
        contextId: 'agency-ops',
        screenshotSrc: '/images/help/dashboard-command-screenshot.svg',
        focusHotspotNumber: 3,
        objective: 'Maximize gross margin and keep active projects inside your included Continuity Vault GB.',
        instructions: [
          'Open Agency Ops (/dashboard/clients) to inspect the Client CRM directory and PM Workload & Margin Scorecard.',
          'Switch to the Storage Hygiene tab to see which completed projects hold superseded draft image/video takes.',
          'Click 1-Click Draft Purge on delivered projects to reclaim Vault GB while preserving final masters and cast reference locks.',
        ],
        keyTakeaway: 'Purging unused drafts keeps high-volume agencies inside their included 150 GB (Pro) or 750 GB (Studio) Vault quota.',
        tryActionLabel: 'Open Agency Ops',
        tryActionHref: '/dashboard/clients',
      },
    ],
  },
]

// =============================================================================
// 3. ROLE-BASED CREATOR PLAYBOOKS
// =============================================================================

export const CREATOR_PLAYBOOKS: CreatorPlaybook[] = [
  {
    id: 'storyteller-author',
    persona: 'First-Time Storyteller & Author',
    tagline: 'I have a book, script, or vivid story in my head—and zero filmmaking or editing experience.',
    recommendedPlan: `Explorer ($${TIER_CATALOG.explorer.priceUsd}) → Hobbyist ($${TIER_CATALOG.hobbyist.priceUsd}/mo)`,
    recommendedPlanHref: '/dashboard/settings/billing',
    iconName: 'BookOpen',
    workflowSummary:
      'Let SceneFlow act as your screenwriter, storyboard artist, voice cast, and sound designer. Focus 100% on story emotion.',
    milestones: [
      {
        phase: '1. Blueprint Room',
        action: 'Paste a book chapter or 2-sentence premise and use Audience Resonance™ 1-Click Fixes until your score is 82+.',
        creditTip: 'Spend ~45 credits here until every act beat gives you chills.',
      },
      {
        phase: '2. Continuity Vault',
        action: 'Approve your main characters’ faces and pick expressive neural voices for each role.',
        creditTip: '~40 credits locks a 3-person cast for your entire project.',
      },
      {
        phase: '3. Voiced Animatic First',
        action: 'Generate scene keyframes + full dialogue/music and watch your story come alive in the Screening Room.',
        creditTip: 'A complete 5-scene voiced Animatic uses only ~150 credits!',
      },
    ],
  },
  {
    id: 'indie-chapter-creator',
    persona: 'Chapter-by-Chapter Indie Filmmaker',
    tagline: 'I want to release serialized cinematic chapters on a predictable monthly credit budget.',
    recommendedPlan: `Starter ($${TIER_CATALOG.starter.priceUsd}/mo • ${TIER_CATALOG.starter.credits.toLocaleString()} cr)`,
    recommendedPlanHref: '/dashboard/settings/billing',
    iconName: 'Film',
    workflowSummary:
      'Use Series Room to lock your world once, then produce each chapter using Hybrid Smart Assembly (Keyframes + Hero Motion Video Clips).',
    milestones: [
      {
        phase: '1. Series Bible Setup',
        action: 'Build your cast and locations in Series Room so Chapter 2+ costs 0 credits for character setup.',
        creditTip: 'Shared Series Vault saves ~100 credits per subsequent chapter.',
      },
      {
        phase: '2. Hybrid Keyframe + Motion Video Strategy',
        action: 'Render keyframes for 100% of shots, then animate the top 40% emotional/action shots into motion video.',
        creditTip: 'Cuts per-chapter credit usage from ~2,200 cr down to ~850 cr.',
      },
      {
        phase: '3. Audience `/s/` Previews',
        action: 'Share `/s/` screening links with Patreon/community supporters for early feedback.',
        creditTip: 'Hosted `/s/` links are 100% free and include timestamped comments.',
      },
    ],
  },
  {
    id: 'series-showrunner',
    persona: 'Operator Pro & White-Label Video Studio',
    tagline: 'I produce episodic shows or client productions (memoirs, real estate, training) with multi-language reach.',
    recommendedPlan: `Operator Pro ($${TIER_CATALOG.pro.priceUsd}/mo • ${TIER_CATALOG.pro.credits.toLocaleString()} cr)`,
    recommendedPlanHref: '/dashboard/settings/billing',
    iconName: 'Layers',
    workflowSummary:
      'High-velocity 4K production with 100% White-Label Client Portals, 3 team seats, 150 GB Vault hosting, and 70+ language dubbing.',
    milestones: [
      {
        phase: '1. Branded Intake & Blueprint Pass',
        action: 'Collect client stories via zero-login intake and hit 85+ Audience Resonance before spending video credits.',
        creditTip: '20 credits per Resonance check prevents expensive mid-production rewrites.',
      },
      {
        phase: '2. Full Motion 4K Production',
        action: 'Batch-generate keyframes and Veo 3.1 motion video clips across 8–10 scenes with 10,000 included monthly credits.',
        creditTip: 'Unlocks $250 Bulk Add-On packs ($0.010/cr) valid for 12 months.',
      },
      {
        phase: '3. 70+ Language Stem-Separated Dubbing',
        action: 'Export Spanish, Portuguese, Mandarin, Hindi, Arabic, Thai, and 70+ language tracks in Production Streams.',
        creditTip: '~20 credits per language track multiplies international reach.',
      },
    ],
  },
  {
    id: 'hybrid-agency-studio',
    persona: 'Multi-PM White-Label Agency & Production House',
    tagline: 'We run dozens of client productions across multiple PMs with custom domains, SLA tracking, and Vertex AI BYOK.',
    recommendedPlan: `Agency Scale Studio ($${TIER_CATALOG.studio.priceUsd}/mo • ${TIER_CATALOG.studio.credits.toLocaleString()} cr + BYOK)`,
    recommendedPlanHref: '/dashboard/settings/billing',
    iconName: 'Building2',
    workflowSummary:
      'Combine 45,000 included priority credits, 750 GB Client Vault, 10 PM/QA seats, Agency Ops CRM, and Google Vertex AI BYOK.',
    milestones: [
      {
        phase: '1. Multi-PM Delegation & Kanban SLA',
        action: 'Assign PMs with monthly credit caps and 0-credit QA Reviewers in Producer & Team, then track all deliveries on Projects Kanban.',
        creditTip: 'Send zero-login Blueprint Pass & `/s/` links for sign-off before 4K rendering.',
      },
      {
        phase: '2. Google Vertex AI BYOK Routing',
        action: 'Connect your corporate Google Vertex AI key in Settings → BYOK Settings for direct-billed studio throughput.',
        creditTip: 'Route heavy batch renders to your own GCP commitment while keeping SceneFlow orchestration.',
      },
      {
        phase: '3. Vault Storage Hygiene & 4K Delivery',
        action: 'Deliver normalized 4K masters, SRT bundles, and key art, then run 1-Click Draft Purge in Agency Ops to reclaim Vault GB.',
        creditTip: 'Full commercial licensing and custom domain portals included.',
      },
    ],
  },
]

// =============================================================================
// 4. INTERACTIVE CREDIT & PRODUCTION ESTIMATOR PRESETS
// =============================================================================

export const CREDIT_ESTIMATOR_PRESETS: CreditEstimatorPreset[] = [
  {
    id: 'short-teaser',
    label: '90-Sec Concept Teaser / Trailer',
    runtimeLabel: '~1.5 mins (5 scenes)',
    sceneCount: 5,
    keyframePairsPerScene: 2,
    videoClipsPerScene: 1,
    languagesCount: 1,
    description: `Ideal for testing a new story concept on the $${TIER_CATALOG.explorer.priceUsd} Explorer trial or Hobbyist ($${TIER_CATALOG.hobbyist.priceUsd}/mo).`,
  },
  {
    id: 'indie-chapter',
    label: '4-Min Serialized Chapter (Hybrid Cut)',
    runtimeLabel: '~4 mins (8 scenes)',
    sceneCount: 8,
    keyframePairsPerScene: 3,
    videoClipsPerScene: 1,
    languagesCount: 2,
    description: `The sweet spot for Starter ($${TIER_CATALOG.starter.priceUsd}/mo) creators combining rich keyframes with hero motion video shots.`,
  },
  {
    id: 'cinema-episode',
    label: '8-Min Full-Motion Episode',
    runtimeLabel: '~8 mins (12 scenes)',
    sceneCount: 12,
    keyframePairsPerScene: 3,
    videoClipsPerScene: 3,
    languagesCount: 4,
    description: `Designed for Operator Pro ($${TIER_CATALOG.pro.priceUsd}/mo) studios producing full motion video episodes with 4-language dubbing.`,
  },
  {
    id: 'season-production',
    label: '10-Episode Season Arc (Agency Scale)',
    runtimeLabel: '~60 mins total (80 scenes)',
    sceneCount: 80,
    keyframePairsPerScene: 3,
    videoClipsPerScene: 2,
    languagesCount: 6,
    description: `Full season production on Agency Scale Studio ($${TIER_CATALOG.studio.priceUsd}/mo) with shared Series Bible continuity and global localization.`,
  },
]

export function calculateEstimatedCredits(params: {
  sceneCount: number
  keyframePairsPerScene: number
  videoClipsPerScene: number
  languagesCount: number
}) {
  const blueprintAndResonance = 65 // Treatment (25) + Resonance (20) + Breakdown (20)
  const continuityRefs = 75 // ~5 character & location references
  const keyframesCost = params.sceneCount * params.keyframePairsPerScene * 2 * 12 // 12 cr per keyframe
  const audioAndScoreCost = params.sceneCount * 14 // Dialogue + SFX + Music per scene
  const videoMotionCost = params.sceneCount * params.videoClipsPerScene * 110 // Avg 110 cr per motion video clip
  const dubbingCost = Math.max(0, params.languagesCount - 1) * params.sceneCount * 4
  const exportCost = 25

  const animaticTotal = blueprintAndResonance + continuityRefs + keyframesCost + audioAndScoreCost
  const fullProductionTotal = animaticTotal + videoMotionCost + dubbingCost + exportCost

  let recommendedTier = `Explorer ($${TIER_CATALOG.explorer.priceUsd} Trial • ${TIER_CATALOG.explorer.credits.toLocaleString()} cr)`
  let recommendedTierHref = '/dashboard/settings/billing?checkoutTier=explorer'
  if (fullProductionTotal > TIER_CATALOG.pro.credits) {
    recommendedTier = `Studio — Agency Scale ($${TIER_CATALOG.studio.priceUsd}/mo • ${TIER_CATALOG.studio.credits.toLocaleString()} cr)`
    recommendedTierHref = '/dashboard/settings/billing?checkoutTier=studio'
  } else if (fullProductionTotal > TIER_CATALOG.starter.credits) {
    recommendedTier = `Operator Pro ($${TIER_CATALOG.pro.priceUsd}/mo • ${TIER_CATALOG.pro.credits.toLocaleString()} cr)`
    recommendedTierHref = '/dashboard/settings/billing?checkoutTier=pro'
  } else if (fullProductionTotal > TIER_CATALOG.hobbyist.credits) {
    recommendedTier = `Starter — Filmmaker ($${TIER_CATALOG.starter.priceUsd}/mo • ${TIER_CATALOG.starter.credits.toLocaleString()} cr)`
    recommendedTierHref = '/dashboard/settings/billing?checkoutTier=starter'
  } else if (fullProductionTotal > TIER_CATALOG.explorer.credits) {
    recommendedTier = `Hobbyist — Creator & Vault ($${TIER_CATALOG.hobbyist.priceUsd}/mo • ${TIER_CATALOG.hobbyist.credits.toLocaleString()} cr)`
    recommendedTierHref = '/dashboard/settings/billing?checkoutTier=hobbyist'
  }

  return {
    blueprintAndResonance,
    continuityRefs,
    keyframesCost,
    audioAndScoreCost,
    videoMotionCost,
    dubbingCost,
    exportCost,
    animaticTotal,
    fullProductionTotal,
    recommendedTier,
    recommendedTierHref,
  }
}

// =============================================================================
// 5. SEARCHABLE KNOWLEDGE BASE ARTICLES
// =============================================================================

export const HELP_KNOWLEDGE_ARTICLES: HelpKnowledgeArticle[] = [
  {
    id: 'kb-blueprint-80',
    category: 'blueprint',
    title: 'How Audience Resonance™ Evaluates & Fixes Your Script',
    summary: 'Learn how the 5-axis narrative radar scores your treatment and why 80/100 is the greenlight benchmark.',
    readTime: '3 min read',
    tags: ['blueprint', 'audience resonance', 'score', 'script', 'pacing', 'greenlight'],
    bullets: [
      'Audience Resonance simulates target viewer reception across Emotional Hook, Pacing, Character Stakes, Originality, and Visual Cinema Potential.',
      'Each analysis identifies specific scene bottlenecks (e.g., passive protagonist in Act II) and generates 1-click rewrite patches.',
      'Reaching 80/100+ before clicking "Start Production" prevents you from spending image and video credits on scenes that would later be cut.',
    ],
    proTip: 'Run Audience Resonance once after your initial treatment, click "Apply Recommended Fix", and re-analyze to confirm your 80+ score.',
  },
  {
    id: 'kb-production-agent',
    category: 'production',
    title: 'Walk-Away Production Agent, Checkpoints & Creative Policy Fallback',
    summary: 'How to perfect your script in under an hour and let the Production Agent autonomously build Pre-Vis, Clips, Master, and Promo.',
    readTime: '4 min read',
    tags: ['production agent', 'automation', 'walk away', 'creative clips', 'policy', 'checkpoints', 'screening room'],
    bullets: [
      'Open the Production Agent Builder to select All Scenes, a specific Act/Chapter, or Custom Scenes across 5 deliverable stages: Pre-Vis, Clips, Scenes, Master, and Promo.',
      'During the Clips stage, if a dramatic shot triggers a standard content-policy filter, the agent automatically rewrites Shot Direction for safety compliance and reruns the shot. If it still blocks, it seamlessly switches that shot to Creative Clips (frame-anchored motion) so your batch never stalls.',
      'Choose Fully Autonomous Walk-Away mode or set Director Checkpoints (Pause After Pre-Vis or Pause After Each Scene) and receive Screening Room review links in your Notification Center.',
    ],
    proTip: 'Use "Pause After Pre-Vis" on new scripts to review the full voiced animatic in the Screening Room before the agent spends motion video credits.',
  },
  {
    id: 'kb-continuity-lock',
    category: 'production',
    title: 'Preventing Character Drift with the Continuity Vault™',
    summary: 'Step-by-step guide to locking faces, wardrobe outfits, voices, and recurring locations across every scene.',
    readTime: '4 min read',
    tags: ['continuity', 'characters', 'wardrobe', 'locations', 'reference library', 'keyframes'],
    bullets: [
      'Always generate and approve Character Portraits in the Reference Library BEFORE rendering scene keyframes.',
      'When a character is tagged in a scene segment, SceneFlow automatically binds their canonical reference image and wardrobe notes into the image and video prompt pipeline.',
      'For multi-episode shows, define recurring cast members in Series Room so every episode inherits the same reference anchors.',
    ],
    proTip: 'Give characters a distinct silhouette and color signature (e.g., "crimson bomber jacket, silver cybernetic temple") for rock-solid frame-to-frame recall.',
  },
  {
    id: 'kb-keyframes-vs-video',
    category: 'production',
    title: 'Start/End Keyframes vs. AI Motion Video',
    summary: 'How to pair start/end keyframes with AI video generation for controlled camera movement.',
    readTime: '4 min read',
    tags: ['video', 'motion', 'keyframes', 'animatic', 'camera motion', 'production'],
    bullets: [
      'Every visual segment starts with a Start Keyframe and End Keyframe (~10–15 credits each).',
      'In Animatic mode, SceneFlow applies smooth Ken Burns camera motion across your keyframes synced to dialogue.',
      'When you click "Animate Video" (~80–150 credits), the video engine interpolates true 3D motion between your approved Start and End keyframes.',
    ],
    proTip: 'You can mix motion video clips and Ken Burns keyframes in the same scene! Animate your hero action shots and keep dialogue reactions as keyframes to save 60% of credits.',
  },
  {
    id: 'kb-multitrack-audio',
    category: 'production',
    title: 'Multitrack Audio: Voices, Foley SFX, Music & 70+ Languages',
    summary: 'How to cast expressive neural voices, layer atmospheric sound effects, and dub your film into 70+ languages.',
    readTime: '3 min read',
    tags: ['audio', 'voices', 'music', 'sfx', 'dubbing', 'languages', 'translation'],
    bullets: [
      'Assign distinct character voices in the Reference Library plus a dedicated Narrator voice.',
      'Generate Dialogue first so segment durations automatically adapt to the spoken performance.',
      'In Final Cut / Screening Room, select additional language tracks to automatically translate and dub dialogue while keeping SFX and music intact.',
    ],
    proTip: 'SceneFlow automatically ducks background music by -9dB during spoken dialogue lines so voices remain crystal clear.',
  },
  {
    id: 'kb-screening-links',
    category: 'final-cut',
    title: 'Sharing `/s/` Screening Room Links & Collecting Notes',
    summary: 'How to share your animatic or finished master with collaborators, clients, or audiences for free.',
    readTime: '2 min read',
    tags: ['screening room', 'share link', 'review', 'collaboration', 'final cut', 'export'],
    bullets: [
      'Click "Share /s/ Review Link" in Final Cut or Screening Room to create a hosted watch URL (`/s/[token]`).',
      'Reviewers can watch on desktop or mobile without needing a SceneFlow login and leave timestamped feedback.',
      'Switch between Animatic and Master Video streams anytime before exporting your final MP4.',
    ],
    proTip: 'Sharing `/s/` links costs 0 credits—use them to validate story and pacing with collaborators before final 4K rendering.',
  },
  {
    id: 'kb-credits-byok',
    category: 'billing',
    title: 'Dual Credit Pools, Plans & Google Vertex AI BYOK',
    summary: 'Everything you need to know about Monthly vs. 12-Month Add-On credits, Vault storage, and Vertex AI BYOK.',
    readTime: '3 min read',
    tags: ['credits', 'billing', 'plans', 'byok', 'vertex ai', 'top up', 'expiry'],
    bullets: [
      `Credits expiring soonest are always spent first (FEFO)—typically your monthly subscription allotment, or an older pack nearing expiry so you never waste expiring credits. Subscriber Add-On packs remain valid for 12 months (${ADDON_CREDIT_SHELF_LIFE_DAYS} days) from purchase (Explorer trial credits expire after ${EXPLORER_CREDIT_SHELF_LIFE_DAYS} days).`,
      `Plans: Explorer ($${TIER_CATALOG.explorer.priceUsd} one-time · ${TIER_CATALOG.explorer.credits.toLocaleString()} cr), Hobbyist ($${TIER_CATALOG.hobbyist.priceUsd}/mo · ${TIER_CATALOG.hobbyist.credits.toLocaleString()} cr), Starter ($${TIER_CATALOG.starter.priceUsd}/mo · ${TIER_CATALOG.starter.credits.toLocaleString()} cr), Operator Pro ($${TIER_CATALOG.pro.priceUsd}/mo · ${TIER_CATALOG.pro.credits.toLocaleString()} cr), and Studio ($${TIER_CATALOG.studio.priceUsd}/mo · ${TIER_CATALOG.studio.credits.toLocaleString()} cr).`,
      'Operator Pro and Studio subscribers can connect their own Google Vertex AI API key in Settings → BYOK Settings (/dashboard/settings/byok).',
    ],
    proTip: 'If an upstream AI generation call ever errors out, SceneFlow automatically refunds the credits to your balance.',
  },
  {
    id: 'kb-agency-scale-ops',
    category: 'agency-ops',
    title: 'White-Label Agency Scale: Multi-PM Kanban, Series Delegation & Vault Hygiene',
    summary: 'How agencies manage 100+ client productions across multiple Project Managers with SLA tracking, QA roles, and 1-click draft purge.',
    readTime: '4 min read',
    tags: ['agency', 'clients', 'crm', 'kanban', 'sla', 'pm', 'qa reviewer', 'workspace switcher', 'storage', 'purge', 'series delegation'],
    bullets: [
      'Server-side Projects search and the 6-column Kanban board (/dashboard/projects) support unlimited productions with PM filtering, SLA aging badges, and bulk assignment.',
      'Assign up to 3 seats on Operator Pro or 10 seats on Studio with role guardrails (admin, project_manager, 0-credit qa_reviewer) and locale-based PM auto-routing.',
      'Agency Ops (/dashboard/clients) combines Client CRM rollups, PM Workload & Margin Scorecards, and Continuity Vault Storage Hygiene with 1-Click Draft Purge.',
    ],
    proTip: 'Invited team members switch seamlessly between their personal workspace and agency workspace via the sidebar Workspace Switcher.',
  },
  {
    id: 'kb-flowdirector-qa',
    category: 'production',
    title: 'FlowDirector Scene Video QA & Self-Healing Shot Error Investigator',
    summary: 'How SceneFlow automatically scores rendered clips, diagnoses blocked or failed shots, and recovers with 1-click fixes.',
    readTime: '3 min read',
    tags: ['flowdirector', 'qa', 'error', 'investigate', 'policy', 'creative clips', 'kling', 'veo', 'troubleshooting'],
    bullets: [
      'FlowDirector QA evaluates rendered scene clips on Audience Resonance and Director Compliance, offering 1-click targeted remakes on weak shots.',
      'If a still or video clip hits a provider timeout, likeness flag, or safety filter, click "Investigate" on the error card for ranked 1-click self-healing fixes (prompt soften, non-celebrity reference lock, or Creative Clips F2V fallback).',
      'Failed upstream provider calls automatically refund credits (0 credits charged) and let you escalate diagnostics directly to Engineering Support.',
    ],
    proTip: 'Always try the 1-click "Investigate" diagnostic before re-running the exact same blocked prompt manually.',
  },
  {
    id: 'kb-white-label-portals',
    category: 'producer',
    title: 'Producer Hub: Zero-Login Client Intake, Consent Ledger & White-Label Portals',
    summary: 'Deliver branded Intake, Blueprint Pass, Continuity, and Screening Room links under your own studio identity and custom domain.',
    readTime: '3 min read',
    tags: ['white-label', 'producer', 'intake', 'custom domain', 'consent', 'exif', 'client portal', 'memoir'],
    bullets: [
      'Configure your studio name, logo, colors, support email, and custom domain (Studio tier) in Settings → Producer & Team.',
      'Zero-login Client Story Intake links automatically strip EXIF GPS metadata from uploaded family photos and record digital likeness & voice consent.',
      'Clients approve treatments via Blueprint Pass and leave timestamped feedback in white-label Screening Room links without creating a SceneFlow account.',
    ],
    proTip: 'Send a Blueprint Pass link for written client sign-off before rendering motion video clips to lock scope and protect margin.',
  },
  {
    id: 'kb-mobile-companion-pwa',
    category: 'dashboard',
    title: 'Mobile Companion PWA: On-the-Go Monitoring, Voice Intake & Push Alerts',
    summary: 'Install SceneFlow on iOS or Android to monitor walk-away renders, triage client notes, and dictate new project concepts by voice.',
    readTime: '2 min read',
    tags: ['mobile', 'pwa', 'phone', 'iphone', 'android', 'notifications', 'push', 'voice', 'companion'],
    bullets: [
      'Open sceneflowai.studio on your phone and tap "Add to Home Screen" / Install to launch the dedicated Mobile Companion PWA.',
      'Enable push notifications to get pinged the instant a walk-away Production Agent run finishes or a client leaves Screening Room feedback.',
      'Tap "Initiate Project" in the companion header to dictate a concept by voice and optionally request PM kickoff support.',
    ],
    proTip: 'Need full timeline editing? Use a desktop or tablet viewport—your phone Companion stays fast and distraction-free for approvals and monitoring.',
  },
]
