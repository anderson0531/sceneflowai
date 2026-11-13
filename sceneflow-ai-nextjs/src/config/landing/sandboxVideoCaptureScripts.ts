/**
 * Production-ready 35–40 second video scripts and step-by-step offline Sandbox
 * capture cues for replacing legacy feature videos without spending GCP credits.
 *
 * Host voice alignment: CHAR_ANA (`EXAVITQu4vr4xnSDxMaL` — Ana, Studio Host).
 */

export type SandboxVideoCaptureId =
  | 'baseline'
  | 'direction'
  | 'review'
  | 'agents'
  | 'collaboration'
  | 'four-room-tour'

export interface SandboxCaptureBeat {
  readonly timecode: string
  readonly sandboxRoute: string
  readonly uiAction: string
  readonly voiceoverEn: string
  readonly onScreenCallout: string
}

export interface SandboxVideoCaptureScript {
  readonly id: SandboxVideoCaptureId
  readonly title: string
  readonly targetDurationSeconds: number
  readonly targetSlotDescription: string
  readonly outputWebmPath: string
  readonly outputMp4Path: string
  readonly primarySandboxProject: 'demo-glass-ledger-ep1' | 'demo-harbor-books-memoir'
  readonly hookSummary: string
  readonly beats: readonly SandboxCaptureBeat[]
}

export const SANDBOX_VIDEO_CAPTURE_SCRIPTS: readonly SandboxVideoCaptureScript[] = [
  {
    id: 'baseline',
    title: 'Clip 1 — Instant Expert Baseline (No Blank Page)',
    targetDurationSeconds: 36,
    targetSlotDescription:
      'Superpower 01 ("Instant Expert Baseline") & TwoModes comparison theater modal',
    outputWebmPath: '/video/landing/two-modes-comparison-en.webm',
    outputMp4Path: '/video/landing/two-modes-comparison-en.mp4',
    primarySandboxProject: 'demo-harbor-books-memoir',
    hookSummary:
      'Shows how a natural "Tell me your story" intake conversation auto-builds a multi-age cast, beat sheet, and scene script in minutes.',
    beats: [
      {
        timecode: '00:00–00:07',
        sandboxRoute: '/dashboard/blueprint?sandbox=1&demoProject=demo-harbor-books-memoir',
        uiAction:
          'Open Blueprint intake prompt showing the Harbor Books family story conversation and click into generated Treatment Beats.',
        voiceoverEn:
          'Most AI video tools hand you an empty prompt box and wish you luck. SceneFlow starts like a real producer: "Tell me your story."',
        onScreenCallout: 'Story-First Intake → Zero Blank-Page Paralysis',
      },
      {
        timecode: '00:07–00:18',
        sandboxRoute: '/dashboard/blueprint?sandbox=1&demoProject=demo-harbor-books-memoir',
        uiAction:
          'Scroll smoothly across the auto-generated Beat Sheet and expand the Multi-Age Cast cards (Arthur Age 28 & Age 78, Elena Age 26 & Age 76).',
        voiceoverEn:
          'From a five-minute conversation, SceneFlow builds an expert baseline—structuring emotional beats and locking distinct character cards at Age 28 and Age 78.',
        onScreenCallout: 'Auto Multi-Age Cast Lock (1976 Youth ↔ 2026 Present)',
      },
      {
        timecode: '00:18–00:28',
        sandboxRoute: '/dashboard/workflow/vision/demo-harbor-books-memoir?sandbox=1',
        uiAction:
          'Transition to Production Stage showing the formatted multi-scene script, dialogue, camera framing, and Pre-vis credit budget pill.',
        voiceoverEn:
          'Step onto the Production Stage and your full screenplay, camera coverage, and Pre-vis credit forecast are already staged—before you spend a cent on 4K video.',
        onScreenCallout: 'Complete Script + Pre-Vis Credit Forecast Ready',
      },
      {
        timecode: '00:28–00:36',
        sandboxRoute: '/dashboard/workflow/vision/demo-harbor-books-memoir?sandbox=1',
        uiAction:
          'Play Beat 1 preview in the storyboard player with warm narration and cedar bookshop visuals.',
        voiceoverEn:
          'Whether you are delivering a five-hundred-dollar family memoir or an original pilot, you start at ninety percent—and direct the final ten.',
        onScreenCallout: 'Start at 90% · Direct the Final 10%',
      },
    ],
  },
  {
    id: 'direction',
    title: 'Clip 2 — Voice & Typed Director Control (Multi-Age & Wardrobe Lock)',
    targetDurationSeconds: 38,
    targetSlotDescription:
      'Superpower 02 ("Voice & Typed Director Control") & DirectControl spotlight modal',
    outputWebmPath: '/video/landing/direct-control-en.webm',
    outputMp4Path: '/video/landing/direct-control-en.mp4',
    primarySandboxProject: 'demo-harbor-books-memoir',
    hookSummary:
      'Demonstrates conversational direction, switching character era/wardrobe on Shot Director without slot-machine regeneration.',
    beats: [
      {
        timecode: '00:00–00:09',
        sandboxRoute: '/dashboard/workflow/vision/demo-harbor-books-memoir?sandbox=1',
        uiAction:
          'Open Continuity Cast Library showing Arthur Lin (Age 28) vs Arthur Lin (Age 78) linked by longitudinal identity lock.',
        voiceoverEn:
          'Generic video generators morph your actors every time you cut. In SceneFlow, every life stage and wardrobe is locked in your Continuity Vault.',
        onScreenCallout: 'Longitudinal Identity Lock Across Decades',
      },
      {
        timecode: '00:09–00:21',
        sandboxRoute: '/dashboard/workflow/vision/demo-harbor-books-memoir?sandbox=1',
        uiAction:
          'Open Shot Director on Scene 1 Beat 1, toggle Arthur (Age 78) wardrobe from "Saturday Bookshop Cardigan" to "Golden Anniversary Blazer", and click microphone/typed direction.',
        voiceoverEn:
          'Want to restage a shot? Just speak or type like a director: switch Arthur into his Golden Anniversary Blazer and push in slowly on the brass keys.',
        onScreenCallout: '1-Click Per-Shot Wardrobe + Spoken Direction',
      },
      {
        timecode: '00:21–00:30',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Cut to The Glass Ledger Scene 1 Beat 1 version switcher (v1 vs v2) and inspect the locked Archive Vault & Quartz Codex references.',
        voiceoverEn:
          'Compare frame versions side-by-side while your set architecture, lighting palette, and hero props stay anchored automatically.',
        onScreenCallout: 'Zero Slot-Machine Rerolls · Surgical Frame Control',
      },
      {
        timecode: '00:30–00:38',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Preview the finished anamorphic clip of Elara Vance at the oak archive table.',
        voiceoverEn:
          'Full creative authority when you want it—without ever touching a cryptic technical prompt.',
        onScreenCallout: 'Your Voice. Your Cast. Frame-Accurate.',
      },
    ],
  },
  {
    id: 'review',
    title: 'Clip 3 — Audience Resonance & FlowDirector Greenlight Gates',
    targetDurationSeconds: 35,
    targetSlotDescription:
      'Superpower 03 ("Audience Resonance & FlowDirector") & Blueprint Room overview',
    outputWebmPath: '/video/landing/feature-rooms/blueprint-board-en.webm',
    outputMp4Path: '/video/landing/feature-rooms/blueprint-board-en.mp4',
    primarySandboxProject: 'demo-glass-ledger-ep1',
    hookSummary:
      'Shows the 3-gate Audience Resonance scorecard (Series, Blueprint, Script) and 1-click FlowDirector fixes before rendering.',
    beats: [
      {
        timecode: '00:00–00:08',
        sandboxRoute: '/dashboard/series/demo-series-glass-ledger?sandbox=1',
        uiAction:
          'Open Series Audience Resonance panel showing 91/100 season score and episode arc breakdown.',
        voiceoverEn:
          'Why discover a pacing flaw after spending fifty dollars rendering video? SceneFlow puts an executive story analyst in every room.',
        onScreenCallout: 'Gate 1: Series Audience Resonance (91 / 100)',
      },
      {
        timecode: '00:08–00:20',
        sandboxRoute: '/dashboard/blueprint?sandbox=1&demoProject=demo-glass-ledger-ep1',
        uiAction:
          'Open Blueprint Audience Resonance radar chart (92/100) and highlight FlowDirector actionable recommendation card ("Plant Harbor District Stakes Earlier").',
        voiceoverEn:
          'Audience Resonance scores emotional hook, clarity, and retention for your exact target buyer—then FlowDirector applies surgical rewrites in one click.',
        onScreenCallout: 'Gate 2: Blueprint Diagnosis + 1-Click FlowDirector Fix',
      },
      {
        timecode: '00:20–00:29',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Open Script Review tab on Production Stage showing Director 93 & Audience 92 scene-by-scene scores.',
        voiceoverEn:
          'Run one final check at the Script gate—or send a clean Blueprint link to your client so they sign off before production even starts.',
        onScreenCallout: 'Gate 3: Script Greenlight & Client Pre-Approval',
      },
      {
        timecode: '00:29–00:35',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Click "Go to Production" highlighting locked beats and greenlight badge.',
        voiceoverEn:
          'Every story beat stress-tested. Every credit spent with confidence.',
        onScreenCallout: 'Greenlight Before You Render',
      },
    ],
  },
  {
    id: 'agents',
    title: 'Clip 4 — Autonomous Batch Production Agents (50%–80% Lower Cost)',
    targetDurationSeconds: 36,
    targetSlotDescription:
      'Superpower 04 ("Autonomous Production Agents") & Production Stage overview',
    outputWebmPath: '/video/landing/production-agent-en.webm',
    outputMp4Path: '/video/landing/production-agent-en.mp4',
    primarySandboxProject: 'demo-glass-ledger-ep1',
    hookSummary:
      'Shows Reference Express, Audio Agent, Stills Agent, and Clips Agent building an entire episode in parallel.',
    beats: [
      {
        timecode: '00:00–00:08',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Show Production Stage header with Reference Library (3 cast, 2 locations, 2 props) 100% locked.',
        voiceoverEn:
          'Once your script and Continuity Vault are approved, you do not have to babysit thirty manual timeline tracks.',
        onScreenCallout: 'Continuity Vault Locked → Ready for Batch Agents',
      },
      {
        timecode: '00:08–00:19',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Open Audio Agent / Mixer tracks showing multi-character dialogue, ambient harbor rain SFX, and underscore all synced across Scenes 1–3.',
        voiceoverEn:
          'Dispatch the Audio Agent to voice every character, layer room-tone sound effects, and score the emotional turns across every scene at once.',
        onScreenCallout: 'Audio Agent: Multi-Character Voices + SFX + Score',
      },
      {
        timecode: '00:19–00:29',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Scroll the Stills & Clips workbench showing continuity-locked start/end keyframes and rendered motion segments.',
        voiceoverEn:
          'Stills Agent and Clips Agent generate continuity-anchored keyframes and cinema motion in parallel—cutting total delivery cost by fifty to eighty percent.',
        onScreenCallout: 'Stills & Clips Agents · 50%–80% Lower Cost to Deliver',
      },
      {
        timecode: '00:29–00:36',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Play the assembled Animatic-to-Video cut seamlessly in Production Mixer.',
        voiceoverEn:
          'Hours of manual editing compressed into minutes of executive supervision.',
        onScreenCallout: 'Autonomous Assembly · Executive Control',
      },
    ],
  },
  {
    id: 'collaboration',
    title: 'Clip 5 — Zero-Login Client Screening Room & 70+ Language Streams',
    targetDurationSeconds: 36,
    targetSlotDescription:
      'Superpower 05 ("Shared Links & Screening Room") & PublishCut / Screening Room overview',
    outputWebmPath: '/video/landing/publish-cut-en.webm',
    outputMp4Path: '/video/landing/publish-cut-en.mp4',
    primarySandboxProject: 'demo-glass-ledger-ep1',
    hookSummary:
      'Demonstrates sending a private zero-login Screening Room link, switching localized audio streams, and exporting 4K + 9:16 deliverables.',
    beats: [
      {
        timecode: '00:00–00:09',
        sandboxRoute: '/share/screening-room/glass-ledger-screening',
        uiAction:
          'Open the clean zero-login Screening Room player for The Glass Ledger and play the 4K master.',
        voiceoverEn:
          'Forget uploading gigabyte drafts to messy drive folders. Share a private Screening Room link that opens instantly—no client login required.',
        onScreenCallout: 'Zero-Login Private Client Screening Link',
      },
      {
        timecode: '00:09–00:20',
        sandboxRoute: '/share/screening-room/glass-ledger-screening',
        uiAction:
          'Click timecoded feedback comment marker and toggle the in-scene language selector across English, Spanish, Mandarin, and Thai.',
        voiceoverEn:
          'Clients leave frame-accurate notes right on the timeline, and switch between seventy-plus localized language streams with ambient sound preserved.',
        onScreenCallout: 'Frame-Accurate Notes + 70+ In-Scene Language Streams',
      },
      {
        timecode: '00:20–00:29',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Show Final Cut / Export panel with 16:9 4K Master, 9:16 Social Trailer cutdown, and 100% Commercial Ownership badge.',
        voiceoverEn:
          'When approved, export your clean 4K master and vertical social trailers with one hundred percent commercial ownership.',
        onScreenCallout: '4K Master + 9:16 Promo Pack · 100% Commercial Rights',
      },
      {
        timecode: '00:29–00:36',
        sandboxRoute: '/share/screening-room/glass-ledger-screening',
        uiAction:
          'Hold on the approved Screening Room badge and final cinema title card.',
        voiceoverEn:
          'Delight your clients, scale globally, and keep every dollar you earn.',
        onScreenCallout: 'Client Approved · Ready to Invoice',
      },
    ],
  },
  {
    id: 'four-room-tour',
    title: 'Clip 6 — Four Connected Rooms in 40 Seconds (Visual Studio Tour)',
    targetDurationSeconds: 40,
    targetSlotDescription:
      'Visual Studio Tour header overview & Series Room overview slot',
    outputWebmPath: '/video/landing/feature-rooms/series-desk-en.webm',
    outputMp4Path: '/video/landing/feature-rooms/series-desk-en.mp4',
    primarySandboxProject: 'demo-glass-ledger-ep1',
    hookSummary:
      'Walks visitors through the exact 4 live Studio doors (Series Room → Blueprint Room → Production Stage → Screening Room) right before they try them on Production Examples.',
    beats: [
      {
        timecode: '00:00–00:10',
        sandboxRoute: '/dashboard/series/demo-series-glass-ledger?sandbox=1',
        uiAction:
          'Door 1 — Series Room: pan across the 6-episode slate, shared Cast & Locations bible, and 91/100 Resonance badge.',
        voiceoverEn:
          'SceneFlow connects four purpose-built rooms into one pipeline. Start in the Series Room to lock your season bible, cast, and world once.',
        onScreenCallout: '01 · Series Room — Multi-Episode Story & Continuity Bible',
      },
      {
        timecode: '00:10–00:20',
        sandboxRoute: '/dashboard/blueprint?sandbox=1&demoProject=demo-glass-ledger-ep1',
        uiAction:
          'Door 2 — Blueprint Room: show causal Story Beats, multi-age/era character lock, and Audience Resonance scorecard.',
        voiceoverEn:
          'Move into the Blueprint Room to shape story beats, lock character continuity, and greenlight your narrative before spending video credits.',
        onScreenCallout: '02 · Blueprint Room — Story Intake, Cast Lock & Resonance',
      },
      {
        timecode: '00:20–00:30',
        sandboxRoute: '/dashboard/workflow/vision/demo-glass-ledger-ep1?sandbox=1',
        uiAction:
          'Door 3 — Production Stage: show Shot Director, Audio/Stills/Clips Agents, and multi-track Production Mixer.',
        voiceoverEn:
          'Step onto the Production Stage to direct camera and wardrobe by voice or let autonomous agents assemble voices, stills, and 4K clips.',
        onScreenCallout: '03 · Production Stage — Shot Director, Agents & Mixer',
      },
      {
        timecode: '00:30–00:40',
        sandboxRoute: '/share/screening-room/glass-ledger-screening',
        uiAction:
          'Door 4 — Screening Room: play the finished cut with localized dubbing streams and client approval controls.',
        voiceoverEn:
          'Finish in the Screening Room for zero-login client sign-off and global dubbing. Try all four live doors in the examples right below.',
        onScreenCallout: '04 · Screening Room — Client Sign-Off & 70+ Languages',
      },
    ],
  },
]
