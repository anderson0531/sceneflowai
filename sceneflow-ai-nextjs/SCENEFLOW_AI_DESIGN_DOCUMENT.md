# SceneFlow AI - Application Design Document

**Version**: 2.37  
**Last Updated**: December 30, 2025  
**Status**: Production

---

## 🤖 AI Session Checklist

**For AI Coding Assistants: Complete this checklist at the start of EVERY session.**

### Before Making Changes

- [ ] **Read this document** - Especially the Design Decisions Log and Critical Architecture Patterns
- [ ] **Check Deprecated Features** - Don't recreate removed functionality
- [ ] **Review Planned Features** - Avoid duplicate implementations
- [ ] **Understand state patterns** - `script.script.scenes` is the ONLY source of truth for scene data

### Key Rules

1. **Never create separate `scenes` state** - Use `script?.script?.scenes || []`
2. **Update `script` state, not `scenes`` - When modifying scene data
3. **Check if feature exists** - Before implementing anything new
4. **AnimaticsStudio is DEPRECATED** - Use Screening Room (ScriptPlayer) instead

### After Making Changes

- [ ] **Update Design Decisions Log** - Add new decisions with date and rationale
- [ ] **Update Deprecated Features** - If removing functionality
- [ ] **Update Key File Locations** - If adding new important files
- [ ] **Commit with descriptive message** - Reference what was changed and why

### Quick Reference

| Need | Location |
|------|----------|
| Scene data | `script.script.scenes` |
| Characters | `visionPhase.characters` |
| Screening Room | `src/components/vision/ScriptPlayer.tsx` |
| Scene images | `src/components/vision/SceneGallery.tsx` |
| Image prompt builder | `src/components/vision/ScenePromptBuilder.tsx` |
| Image editing | `src/components/vision/ImageEditModal.tsx` |
| Image edit API | `src/app/api/image/edit/route.ts` |
| Direction prompt builder | `src/components/vision/SceneDirectionBuilder.tsx` |
| Direction API | `src/app/api/scene/generate-direction/route.ts` |
| Wardrobe AI Assist | `src/app/api/character/generate-wardrobe/route.ts` |
| Ken Burns | `src/lib/animation/kenBurns.ts` |
| Script QA | `src/lib/script/qualityAssurance.ts` |
| Establishing Shot UI | `src/components/vision/scene-production/SceneProductionManager.tsx` |
| Segment Generation API | `src/app/api/scenes/[sceneId]/generate-segments/route.ts` |
| Scene Reference Generator | `src/components/vision/SceneReferenceGeneratorModal.tsx` |
| Scene Reference API | `src/app/api/vision/generate-scene-reference/route.ts` |
| Backdrop Generator | `src/lib/vision/backdropGenerator.ts` |
| Backdrop Generator Modal | `src/components/vision/BackdropGeneratorModal.tsx` |
| Backdrop Generation API | `src/app/api/vision/generate-backdrop/route.ts` |
| Intelligent Method Selection | `src/lib/vision/intelligentMethodSelection.ts` |
| Reference Builder | `src/lib/vision/referenceBuilder.ts` |
| Video Editing Dialog | `src/components/vision/scene-production/VideoEditingDialog.tsx` |
| Smart Prompt Modules | `src/components/vision/scene-production/SmartPromptModules.tsx` |
| Video Prompt Compiler | `src/components/vision/scene-production/videoPromptCompiler.ts` |
| Segment Prompt Builder | `src/components/vision/scene-production/SegmentPromptBuilder.tsx` |
| Segment Studio | `src/components/vision/scene-production/SegmentStudio.tsx` |
| Method Prompt Builder | `src/components/vision/scene-production/methodPromptBuilder.ts` |
| Prompt Sync Service | `src/components/vision/scene-production/promptSyncService.ts` |
| **Content Moderation** | |
| Hive AI Service | `src/services/HiveModerationService.ts` | Hive AI API integration for text/image/video/audio |
| Moderation Sampling | `src/lib/moderation/moderationSampling.ts` | Hybrid sampling rates and risk keywords |
| Moderation Middleware | `src/lib/moderation/withHiveModeration.ts` | Pre/post generation checks |
| Moderation Migration | `src/lib/database/migrateModerationViolations.ts` | User violation tracking fields |
| **Credits & Pricing** | |
| Credit Costs | `src/lib/credits/creditCosts.ts` | Pricing constants for all AI operations |
| Profit Guardrails | `src/lib/credits/guardrails.ts` | Download limits, storage lifecycle, rate limits |
| Project Calculator | `src/lib/credits/projectCalculator.ts` | Full project cost estimation with strategy comparison |
| Cost Calculator UI | `src/components/credits/ProjectCostCalculator.tsx` | Interactive cost calculator component |
| Project Costs Hook | `src/hooks/useProjectCosts.ts` | Extracts actual scene/audio counts from project data |
| Storage Management | `src/services/StorageManagementService.ts` | GCS storage operations, archive/restore |
| Storage Manager UI | `src/components/storage/StorageManager.tsx` | Storage management dashboard |
| **Dashboard Components** | |
| Project Card | `src/app/dashboard/components/ProjectCard.tsx` | Project list card with cost tracking |
| Projects Page | `src/app/dashboard/projects/page.tsx` | Projects list with filtering |
| **Intelligence Library** | `src/lib/intelligence/` | Keyframe State Machine AI decision-making |
| Action Weights | `src/lib/intelligence/ActionWeights.ts` | Inverse proportionality for imageStrength/guidanceScale |
| Prompt Enhancer | `src/lib/intelligence/PromptEnhancer.ts` | Identity lock injection based on action type |
| Frame Generator | `src/lib/intelligence/FrameGenerator.ts` | State machine for Start/End frame workflow |
| Segment Pair Card | `src/components/vision/scene-production/SegmentPairCard.tsx` | Start→End frame visualization UI |
| Segment Frame Timeline | `src/components/vision/scene-production/SegmentFrameTimeline.tsx` | Keyframe State Machine container |
| Frame Generation API | `src/app/api/production/generate-segment-frames/route.ts` | Generate Start/End frames with intelligence |
| **Director's Console** | `src/components/vision/scene-production/DirectorConsole.tsx` | Call Action batch rendering dashboard |
| Director Dialog | `src/components/vision/scene-production/DirectorDialog.tsx` | Video generation config modal (4-tab) |
| useSegmentConfig | `src/hooks/useSegmentConfig.ts` | Auto-draft logic for segment generation |
| useVideoQueue | `src/hooks/useVideoQueue.ts` | Batch rendering queue management |
| Scene Video Player | `src/components/vision/scene-production/SceneVideoPlayer.tsx` | Full scene playback for rendered segments |
| **Audio Integration** | | |
| Voice Selection | `src/lib/audio/voiceSelection.ts` | Intelligent ElevenLabs voice selection based on screenplay context |
| Audio Recorder Hook | `src/hooks/useAudioRecorder.ts` | Browser-based voice recording via MediaRecorder API |
| **Upload APIs** | | |
| Image Upload | `src/app/api/upload/image/route.ts` | Upload keyframe images to Vercel Blob |
| Audio Upload | `src/app/api/upload/audio/route.ts` | Upload audio files to Vercel Blob |

### Terminology Mapping (UI → Code)

The user-facing terminology differs from internal code names for branding purposes:

| UI Label | Code Name | Route/Component | Notes |
|----------|-----------|-----------------|-------|
| **Virtual Production** | `vision` | `/dashboard/workflow/vision/[projectId]` | Workflow phase 2. Industry term (The Mandalorian, etc.) |
| **The Soundstage** | `ScriptPanel` | `src/components/vision/ScriptPanel.tsx` | Script + scene editing panel inside Vision page |
| **The Blueprint** | `blueprint` | `/dashboard/studio/[projectId]` | Workflow phase 1 (ideation & scripting) |
| **Final Cut** | `polish` | `/dashboard/workflow/generation` | Workflow phase 3 (screening & editing) |
| **The Premiere** | `launch` | `/dashboard/workflow/creation/[projectId]` | Workflow phase 4 (final export) |
| **Screening Room** | `ScriptPlayer` | `src/components/vision/ScriptPlayer.tsx` | Animatic playback component |

---

## Design Decisions Log

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2025-12-30 | Project Cost Calculator: Real Data Preloading (v2.37) | **Fixed NaN display and added automatic preloading of project data after script generation**. Problem: 1) Project Cost Calculator always used default values (10 scenes, 3 segments) instead of actual project data, 2) NaN displayed in "Your Project Needs" calculation due to division by zero, 3) Missing audio credit constants caused undefined values, 4) No clear distinction between budget calculation and cost breakdown sections. **Solution - 6 Components**: 1) **useProjectCosts Hook** (`/src/hooks/useProjectCosts.ts` ~120 lines) - Extracts actual counts from guide.beatSheet and scenes: scene count from beatSheet.length, estimates segments per scene from duration (1 segment per 8 seconds), defaults to 2 takes, counts dialogue lines/SFX/music from scenes array, calculates total duration from beat.estimatedDuration fields, returns null if no script data (falls back to defaults). Returns Partial<FullProjectParameters> for merging with defaults, 2) **Audio Credit Constants** (`/src/lib/credits/creditCosts.ts`) - Added DIALOGUE_PER_LINE: 5 (80 chars average * 80 credits/1k), SOUND_EFFECT: 15 (same as ELEVENLABS_SFX), MUSIC_TRACK: 25 (same as ELEVENLABS_MUSIC), TTS_PER_MINUTE: 320 (~4000 chars/min * 80 credits/1k). Enables accurate audio cost estimation in project calculator, 3) **NaN Fix** (`ProjectCostCalculator.tsx`) - Added null guard in percentage calculation: `breakdown.total.credits > 0 ? (item.cost.credits / breakdown.total.credits) * 100 : 0`. Prevents NaN when breakdown.total.credits is undefined or zero, 4) **initialParams Prop** (`ProjectCostCalculator.tsx`) - Added optional `initialParams?: Partial<FullProjectParameters>` to component props. Deep merges with DEFAULT_PROJECT_PARAMS on mount: `{ ...DEFAULT_PROJECT_PARAMS.scenes, ...initialParams.scenes }` for each category. Allows preloading from actual project data while maintaining defaults for missing fields, 5) **UI Label Updates** (`ProjectCostCalculator.tsx`) - Changed "Your Project Needs:" to "Project Budget Calculation" for clarity. Changed "Cost Breakdown" to "Cost Breakdown by Service" to distinguish from Paddle credit purchase options (which appear in Best Value Options section), 6) **ProjectCard Integration** (`/src/app/dashboard/components/ProjectCard.tsx`) - Imports useProjectCosts hook and calls `useProjectCosts(project.id)`. Passes result as `initialParams={projectCosts || undefined}` to ProjectCostCalculator. Calculator now automatically loads actual scene/segment/audio counts after script generation. **Data Flow**: Blueprint generates beatSheet → useProjectCosts extracts counts → ProjectCard passes to calculator → UI displays real estimates → User can adjust sliders if needed. **Segments Estimation**: Since segments aren't stored in script data (generated during production), hook estimates from duration: 1 segment per 8 seconds of video (Veo 3.1 segment length). **Availability**: Counts available immediately after beatSheet generation in Blueprint (no need to wait for full script panel). **Files Created**: `useProjectCosts.ts`. **Files Modified**: `creditCosts.ts` (added 4 constants), `ProjectCostCalculator.tsx` (initialParams prop, NaN fix, labels), `ProjectCard.tsx` (hook integration). | ✅ Implemented |
| 2025-12-30 | Hive AI Content Moderation Integration (v2.36) | **Implemented comprehensive Hive AI content moderation with Hybrid Smart Sampling strategy**. Problem: SceneFlow AI needed enterprise-grade multi-layer content moderation to ensure generated images, videos, and audio comply with content policies while minimizing costs and unfunded generations. **Solution - 8 Key Components**: 1) **HiveModerationService** (`/src/services/HiveModerationService.ts` ~450 lines) - Hive AI API integration for text ($0.0005/1K chars), image ($0.001/unit), video ($0.03/min), audio ($0.02/min) moderation with configurable thresholds and multi-model classification, 2) **Hybrid Smart Sampling Strategy** (`/src/lib/moderation/moderationSampling.ts` ~280 lines) - Tier-based sampling rates: Trial 50%, Starter 30%, Pro 20%, Studio 15%, Enterprise 10%. Always 100% check on: prompts, uploads, exports, first generation per scene, 60+ risk keywords that boost sampling to 80%, 3) **Moderation Middleware** (`/src/lib/moderation/withHiveModeration.ts` ~350 lines) - Pre-generation prompt screening, post-generation visual checks, export-gate final checks, auto-refund on first block (manual review for repeat offenders), fallback to OpenAI-only if Hive unavailable, 4) **Platform Cost Model** (`/src/lib/credits/creditCosts.ts`) - Added `PLATFORM_OVERHEAD_COSTS` section with Hive API rates and `calculateModerationCost()` function for project estimation, 5) **Cost Calculator Integration** (`/src/lib/credits/projectCalculator.ts`) - Added `platformCosts` to `DetailedCostBreakdown` interface including moderation, infrastructure, payment processing overhead, 6) **User Violation Tracking** (`/src/models/User.ts`) - Added `moderation_violations_count`, `last_violation_at`, `moderation_suspended_until` fields for repeat offender detection with escalating sampling rates, 7) **Route Integrations** - Prompt pre-screening in `/api/scenes/[sceneId]/generate-segments` and `/api/image/edit`, upload moderation in `/api/upload/image` and `/api/upload/audio`, export-gate in `/api/export/video/status/[renderId]`, 8) **Database Migration** (`/src/lib/database/migrateModerationViolations.ts`) - Migration script for User model violation tracking fields with partial indexes. **Cost Analysis**: Estimated Year 1 cost ~$3,424 for Hybrid approach vs ~$25,000 for 100% coverage, absorbed as platform overhead (<1% of revenue). **Coverage**: 95%+ effective coverage through strategic sampling and 100% prompt pre-screening. **Files Created**: `HiveModerationService.ts`, `moderationSampling.ts`, `withHiveModeration.ts`, `moderation/index.ts`, `migrateModerationViolations.ts`, `migrate-moderation-violations.ts`. **Files Modified**: `creditCosts.ts`, `projectCalculator.ts`, `User.ts`, `generate-segments/route.ts`, `image/edit/route.ts`, `upload/image/route.ts`, `upload/audio/route.ts`, `export/video/status/[renderId]/route.ts`. | ✅ Implemented |
| 2025-12-30 | Hive AI Content Moderation Setup (v2.35) | **Added Hive AI credentials to Vercel environment variables in preparation for multi-layer content moderation integration**. Problem: SceneFlow AI needs enterprise-grade content moderation beyond OpenAI's basic API to ensure all generated images, videos, and audio comply with content policies before storage/delivery. **Solution - Environment Configuration**: 1) **Vercel Environment Variables** - Added `HIVE_AI_ACCESS_KEY_ID` and `HIVE_AI_SECRET_KEY` to both Production and Preview environments via Vercel CLI, 2) **env.example Update** - Added Hive AI section with placeholder values and documentation link (https://thehive.ai), 3) **Design Document Update** - Added Hive AI credentials to Section 10.3 Environment Variables list. **Planned Integration** (future phase): HiveModerationService for visual/audio/text moderation, middleware wrapper for generation endpoints, moderation_logs database table, admin review dashboard for flagged content. **API Capabilities**: Visual moderation (NSFW, violence, hate symbols), audio moderation (hate speech, profanity), text moderation (toxicity, PII), video moderation frame-by-frame analysis. **Files Changed**: `env.example`, `SCENEFLOW_AI_DESIGN_DOCUMENT.md`. | ✅ Configured |
| 2025-12-30 | Paddle Payment Approval Readiness (v2.34) | **Comprehensive policy and landing page updates for payment processor approval**. Problem: SceneFlow AI needs payment processor (Paddle) approval, requiring clear policies, legal compliance features, and trust indicators. **Solution - 8 Components**: 1) **SignUpForm Policy Links** - Fixed broken `href="#"` links to actual `/terms` and `/privacy` routes. Added `target="_blank"` for external opening. Changed checkbox text to "I am 18 years or older and agree to..." combining age verification with terms acceptance, 2) **Merchant of Record Disclosure (Pricing)** - Added secure payments badge with shield icon and disclosure text: "Payments processed by our authorized Merchant of Record, who handles tax calculation and compliance." Shows major credit cards accepted and tax exclusion notice, 3) **Refund Policy Enhancement** - Added highlighted box with generic MoR statement and tax refund handling: "Sales tax, VAT, or GST collected at the time of purchase will be refunded proportionally with any approved refund." Includes TODO comment for post-Paddle-approval update, 4) **Contact Page** (`/contact`) - New dedicated contact page with 6 contact channels (Support, Billing, Abuse, Legal, Trust, General) each with email, description, response time. Includes company information section and "Before You Contact Us" guidance. Related policies linked at bottom, 5) **Footer Updates** - Added "Contact Us" link to legal section. Added payment compliance notice with shield icon and MoR disclosure above copyright. Shows "Secure payments processed by our authorized Merchant of Record", 6) **Trust & Safety Hive AI Reference** - Updated content moderation section to list multi-layer moderation: OpenAI Moderation API, custom keyword filtering, AI-powered visual moderation via Hive AI, audio content analysis. Prepares documentation for upcoming Hive integration, 7) **Cookie Consent Banner** - New `CookieConsent.tsx` component with GDPR-compliant UI. Shows on first visit after 1s delay. Three options: Accept All, Essential Only, Customize. Settings panel with toggles for Essential (always on), Analytics, Marketing. Saves preferences to localStorage with consent date. Exports `useCookieConsent()` hook for conditional script loading, 8) **Age Verification** - Merged 18+ requirement into SignUpForm checkbox. Users must confirm age before account creation. **Pre-Approval Language Strategy**: All MoR references use "authorized Merchant of Record payment partner" instead of naming Paddle directly. This shows understanding of MoR model while remaining accurate for pre-approval state. Post-approval update will be a single search-replace operation. **Key Files**: `SignUpForm.tsx`, `Pricing.tsx`, `refunds/page.tsx`, `contact/page.tsx` (new), `Footer.tsx`, `trust-safety/page.tsx`, `CookieConsent.tsx` (new), `layout.tsx`. | ✅ Implemented |
| 2025-12-30 | Project Card Status, Progress & Cost Enhancements (v2.33) | **Fixed project card status selector, progress bar, and replaced Credits with Cost section**. Problem: 1) Status selector had duplicate "Active" options (one sending 'active', one sending 'in-progress'), 2) Progress bar showed ~5% for phase 2 projects (should show 30-50%), 3) Status selector was buried below Review Scores, 4) Credits display lacked budget/actual/estimated tracking. **Solution - 4 Key Fixes**: 1) **Status Normalization** - Removed duplicate 'active' menu item, kept only 'in-progress'. Added handling for both 'in-progress' (frontend) and 'in_progress' (database) variants. Filter dropdown now uses 'in-progress' value to match DB, 2) **Progress Bar Calculation** - Changed from counting completed steps to using step position. Now uses 5 phases (20% each) + 10% in-progress bonus. Phase 2 shows 30%, Phase 3 shows 50%, etc. Added 'creation' step to WORKFLOW_STEPS for consistency with STEP_STYLES, 3) **Status Position** - Moved PROJECT STATUS dropdown inline below title, before metadata row. Compact pill-style trigger instead of full-width dropdown, 4) **Cost Section** - Replaced simple "Credits: X" with full cost tracking: Actual ($), Budget ($), Est. Left ($). Added budget variance indicator (over/under with %). Added "Calculator" button that opens modal with ProjectCostCalculator component. Extended ProjectMetadata with `creditsUsed`, `creditsBudget`, `estimatedTotalCredits`, `actualCostUsd`, `budgetCostUsd`, `estimatedCompletionCostUsd`, `costCalculatorParams`. **Workflow Step Update**: WORKFLOW_STEPS now includes 5 phases: blueprint, vision, creation, polish, launch (was 4 phases without creation). WORKFLOW_STEP_LABELS updated with 'creation: The Creation Hub'. WorkflowStep type extended in enhanced-project.ts to include new phases while maintaining legacy aliases for backwards compatibility. **Key Files**: `ProjectCard.tsx` (layout, status, cost section, modal), `workflowSteps.ts` (5 phases), `projects/page.tsx` (filter fix), `enhanced-project.ts` (types). | ✅ Implemented |
| 2025-12-30 | SceneCredit Currency & Profit Guardrails (v2.32) | **Comprehensive pricing model refactor with profit guardrails and production cost calculator**. Problem: Pricing model lacked documented guardrails, credit values were inconsistent across files, and users had no visibility into production costs. **Solution - 6 Key Components**: 1) **SceneCredit Currency** - Established $1 = 100 credits exchange rate for intuitive pricing. 1 credit = $0.01, 2) **Profit Guardrails** - Video floor (120 credits/8s minimum), download bandwidth tax (5 credits after 3 downloads), storage decay (30-day auto-archive to GCS Coldline, 50 credits to restore), context window cap (10k tokens, 50 credit overage), upscale queue premium (2x for instant), 3) **Subscription Plan Alignment** - Trial: $4.99/1,500 credits (one-time), Starter: $49/4,500, Pro: $149/15,000, Studio: $599/75,000, Enterprise: custom. Breakage targets: 15-30% unused credits, 4) **Storage Add-ons** - Separate Paddle subscriptions: $5/25GB, $15/100GB, $50/500GB. GCS Coldline for archived files, manual un-archive on plan upgrade, 5) **Project Cost Calculator** - Full parameter controls: scenes, segments/scene, takes/segment, video model (Fast/Quality), frames/scene, retakes, voiceover, voice clones, upscale minutes, storage months. Strategy comparison (Fast vs Fast+Topaz vs 4K native). Plan recommendation engine, 6) **Production Recommendations** - Default strategy: Veo Fast + Topaz upscale for ~40% cost savings vs native 4K. Frame-first workflow with ~2 takes per segment average. **Reference Case**: 10-min video = ~23,400 credits (~$234). **Key Files**: `creditCosts.ts`, `guardrails.ts` (new), `projectCalculator.ts` (new), `ProjectCostCalculator.tsx`, `StorageManagementService.ts` (new), `Pricing.tsx`. | ✅ In Progress |
| 2025-12-28 | Voice Clone Recording Feature (v2.31) | **Added in-browser voice recording for voice cloning alongside file upload**. Problem: Users had to record audio externally and upload MP3 files to clone their voice. This added friction and required external tools. **Solution - Browser-Based Voice Recording**: 1) **useAudioRecorder Hook** (`/hooks/useAudioRecorder.ts` ~280 lines) - Custom hook using MediaRecorder API for audio-only capture. Handles `navigator.mediaDevices.getUserMedia({ audio: true })` with echo cancellation, noise suppression, and auto-gain. Tracks recording state (idle/preparing/recording/paused/stopped), elapsed time, and outputs Blob with object URL. Includes permission state detection, error handling for denied/not-found scenarios, and cleanup on unmount. Exports `audioBlob2File()` utility to convert Blob to File for FormData upload and `formatRecordingTime()` for MM:SS display, 2) **Training Scripts** - Three phonetically diverse scripts for voice training (~40-50 seconds each): Standard Script (rainbow passage), Dramatic Monologue (emotional range), Conversational (natural speech). Each script shows estimated duration and scrollable text in a styled card, 3) **VoiceClonePanel Recording Mode** - Added Upload/Record mode toggle with visual tab switching. Record mode shows: script selector, script display area, recording controls (Start Recording → animated recording indicator with timer → Stop Recording), permission error banners, 4) **Playback Review** - After recording stops, shows audio player with native controls, recording duration, "Re-record" and "Use Recording" buttons. User can listen to recording before committing, 5) **File Integration** - "Use Recording" converts blob to File and adds to files array (max 25). Users can mix uploaded files with recorded samples. All samples sent to existing `/api/tts/elevenlabs/voice-clone` endpoint which already supports WebM format. **Browser Compatibility**: MediaRecorder with `audio/webm;codecs=opus` supported in Chrome/Edge/Firefox. Falls back to `audio/ogg` or `audio/mp4` if needed. Safari has limited support. **Key Files**: `useAudioRecorder.ts` (new), `VoiceClonePanel.tsx` (enhanced). | ✅ Implemented |
| 2025-12-27 | Cloud Run FFmpeg Video Export (v2.30) | **Replaced Shotstack with GCP Cloud Run Jobs + FFmpeg for 100x cost reduction ($0.25/min → $0.002/min)**. Problem: Shotstack API was expensive for video rendering at $0.25 per minute of rendered video. For feature-length animatics (90+ minutes), costs were prohibitive. **Solution - Self-Hosted FFmpeg on Cloud Run Jobs**: 1) **Docker Container** (`/docker/ffmpeg-renderer/`) - Alpine Linux with FFmpeg 6.0, Python 3.11, gcloud CLI. `render.py` downloads job spec from GCS, downloads assets (images/audio), executes FFmpeg with Ken Burns effects (zoompan filter), uploads rendered MP4 to GCS, updates database status via callback, 2) **GCS Storage** (`/lib/gcs/renderStorage.ts`) - Job specs stored as JSON, rendered outputs stored with 7-day lifecycle policy for auto-cleanup, 3) **Cloud Run Jobs Service** (`/lib/video/CloudRunJobsService.ts`) - Triggers async Cloud Run Jobs via gcloud CLI or REST API, 24-hour timeout supports long renders, 4) **RenderJob Model** (`/models/RenderJob.ts`) - Sequelize model tracks job status (QUEUED/PROCESSING/COMPLETED/FAILED), progress, output URLs, errors, 5) **API Routes** - `/api/export/screening-room` builds job spec and triggers Cloud Run Job, `/api/export/video/status/[renderId]` polls RenderJob table, `/api/export/render-callback` receives status updates from Cloud Run container, 6) **Deployment Script** (`/scripts/deploy-ffmpeg-renderer.sh`) - Creates GCS bucket, Artifact Registry, builds/pushes Docker image, creates Cloud Run Job with IAM permissions. **Ken Burns Implementation**: FFmpeg zoompan filter with configurable start/end zoom (1.0→1.15 default), center-focused pan, 24fps output. **Cost Breakdown**: Cloud Run ~$0.00002/second CPU + $0.000002/second memory = ~$0.002/minute vs Shotstack $0.25/minute = **125x savings**. **No Shotstack Fallback**: Shotstack integration completely removed - returns clear error message if Cloud Run not configured. Files: `/docker/ffmpeg-renderer/*`, `/lib/gcs/renderStorage.ts`, `/lib/video/CloudRunJobsService.ts`, `/lib/video/renderTypes.ts`, `/models/RenderJob.ts`, `/api/export/screening-room/route.ts`, `/api/export/video/status/[renderId]/route.ts`, `/api/export/render-callback/route.ts`, `/scripts/deploy-ffmpeg-renderer.sh`. | ✅ Implemented |
| 2025-12-21 | Backward Navigation Film Treatment Restoration (v2.29) | **When navigating from Virtual Production back to The Blueprint, the approved Film Treatment is now restored from the project database.** Problem: Users navigating backward from Vision page to Blueprint/Studio page would see empty or stale treatment data because the `filmTreatmentVariant` (the approved treatment that was used to create the project) was not being loaded back into the UI state. **Solution**: Updated `src/app/dashboard/studio/[projectId]/page.tsx` data loading logic to: 1) **Priority load filmTreatmentVariant** - When project has `metadata.filmTreatmentVariant` (set when user approves treatment and proceeds to Vision), it takes priority over `filmTreatment` text, 2) **Hydrate guide store** - Calls `updateTreatment()` with variant content (content/synopsis/logline), 3) **Merge with existing variants** - Adds approved variant to `treatmentVariants` array if not already present, ensuring it appears in variant selector, 4) **Restore beats and runtime** - Hydrates `beatsView` and `estimatedRuntime` from the approved variant's `beats` and `total_duration_seconds` fields, 5) **Collapse input** - Sets `isInputExpanded: false` since project already has treatment. **Files Changed**: `page.tsx` (studio). **Workflow**: User creates treatment in Blueprint → Approves and proceeds to Vision (creates project with filmTreatmentVariant) → Works in Vision → Navigates back to Blueprint → Treatment is now visible and editable. | ✅ Implemented |
| 2025-12-21 | Upload/Download Media Integration (v2.28) | **Added comprehensive upload and download capabilities for frames, videos, and audio files.** Users can now integrate external visual and audio content into their projects. **Key Features**: 1) **Frame Upload/Download** - SegmentPairCard now has Upload/Download buttons on frame images (overlay on hover) and footer buttons. Users can upload custom keyframe images or download generated ones. 2) **Video Upload** - DirectorConsole now has upload button on each segment card, allowing users to upload pre-rendered video segments. 3) **Audio Upload** - ScriptPanel now has upload buttons for all 5 audio types: Description narration, Narration, Dialogue (per-line), Music, and SFX (per-item). Each audio type shows upload button both when audio exists (alongside Download) and when empty (alongside Generate). **New API**: `/api/upload/image/route.ts` - Mirrors audio upload pattern, accepts image/*, 10MB limit, stores to Vercel Blob. **UI Pattern**: Hidden file input with programmatic click, Tooltip-wrapped icon buttons, consistent styling per section (blue for description, green for narration, yellow for dialogue, purple for music, amber for SFX). **Handler**: `handleUploadFrame` in page.tsx uploads to image API and updates segment via `applySceneProductionUpdate`. | ✅ Implemented |
| 2025-12-21 | Frame Generation Vertex AI Migration (v2.27) | **Migrated frame generation APIs from consumer Gemini API to GCP Vertex AI for higher rate limits**. Problem: Users encountering 429 RESOURCE_EXHAUSTED errors during frame generation because the code was using the consumer Gemini API (`generativelanguage.googleapis.com`) with strict rate limits (~2 RPM) instead of GCP Vertex AI (`aiplatform.googleapis.com`) which has much higher quotas. **Solution**: Updated frame generation routes to use the existing `callVertexAIImagen` function from `/lib/vertexai/client.ts`. **Key Changes**: 1) `generate-segment-frames/route.ts` - Replaced `generateImageWithGemini` import with `callVertexAIImagen`, adapted reference image format to include `referenceType: 'REFERENCE_TYPE_SUBJECT'` and `subjectType: 'SUBJECT_TYPE_PERSON'`, 2) `generate-end-frame/route.ts` - Same migration pattern. **Technical Notes**: Vertex AI uses `imagen-3.0-capability-001` (with reference images) or `imagen-3.0-generate-001` (without references) vs Gemini's `gemini-3-pro-image-preview`. Auth switches from `GEMINI_API_KEY` to service account via `GOOGLE_APPLICATION_CREDENTIALS_JSON`. | ✅ Implemented |
| 2025-12-21 | Narration-Driven Segmentation & Audio Integration (v2.26) | **Narration as the foundation for intelligent segment generation with audio track visualization**. Problem: Segments were generated based on dialogue and action alone, with no consideration for voiceover narration timing or content. The narration is an essential part of the story and should drive segment duration and visual content. **Solution - 5 Key Components**: 1) **Voice Selection Utility** (`/lib/audio/voiceSelection.ts` ~200 lines) - `selectOptimalNarrationVoice(context)` analyzes screenplay genre, tone, era, and mood to recommend optimal ElevenLabs voice. Maps to voice IDs: Adam (narrator/documentary), Antoni (drama/intense), Josh (serious/thriller), Drew (friendly/comedy), Clyde (mysterious/noir). `analyzeScreenplayContext(screenplay)` extracts context from logline, genre, tone, and first scene, 2) **Narration-Driven Segment Generation API** (`generate-segments/route.ts`) - Added `narrationDriven`, `narrationText`, `narrationDuration`, `narrationAudioUrl` to request interface. `analyzeNarrationForBeats()` helper extracts emotional tone, suggested visuals, and timing per narration beat. When narrationDriven=true, calculates segment count from narration duration (target ~6s per segment). Enhanced AI prompt includes narration beat instructions for atmospheric visual backdrop generation, 3) **SceneProductionManager UI Enhancements** - Added "Narration-Driven Mode" toggle in Timing tab with purple Mic2 icon. When enabled, auto-calculates segment duration from narration audio. Added narration preview section in References tab with audio player, narration text display, and sync indicator. New state: `narrationDriven`, `narrationDuration`. SegmentGenerationOptions extended with narration fields, 4) **Director's Console Audio Tracks** (`DirectorConsole.tsx`) - New "Audio Tracks" section displays: Narration track (purple, with audio player if narrationAudioUrl exists), Dialogue track (blue, shows line count and first line), SFX placeholder (for post-production), Music placeholder (Veo 3.1 doesn't support background music). Visual note explains Veo 3.1 supports voice/SFX but music is post-production, 5) **Video Generation Audio Context** (`generate-asset/route.ts`) - Added `audioContext` interface with `hasNarration`, `narrationText`, `emotionalTone`, `dialogueBeat`, `suggestedAtmosphere`. Prompt enhanced with audio-visual sync context before Veo generation for atmospheric guidance. **Veo 3.1 Audio Constraints**: Supports voice and SFX generation but NOT background music or multi-language audio. Music must be added in post-production. **Key Files**: `voiceSelection.ts` (new), `generate-segments/route.ts`, `SceneProductionManager.tsx`, `DirectorConsole.tsx`, `generate-asset/route.ts`, `page.tsx`, `ScriptPanel.tsx`. **Future v2.27**: AudioTimeline component with waveform visualization, SegmentStudio narration sync preview with beat alignment. | ✅ Implemented |
| 2025-12-20 | Regeneration Capabilities for Segments, Frames, and Videos | **Added comprehensive regeneration features to accommodate script/screenplay changes**. Problem: When scripts are revised, users needed to regenerate visual content (segments, frames, videos) with proper reference library integration for character consistency. **Solution - 3 Regeneration Pathways**: 1) **Resegmentation with References** (`SceneProductionManager.tsx`) - Enhanced segment generation dialog with new "References" tab. Users can select specific characters, scene references, and object references to include in AI prompt. Added `includeReferencesInPrompts`, `optimizeForTransitions`, `selectedCharacterIds`, `selectedSceneRefIds`, `selectedObjectRefIds` to SegmentGenerationOptions. Reference selections passed to generate-segments API for context-aware segmentation, 2) **Frame Regeneration** (`SegmentStudio.tsx`) - Added RefreshCw regenerate buttons on Start Frame and End Frame previews. `handleRegenerateStartFrame()` and `handleRegenerateEndFrame()` functions trigger frame generation with isRegenerate flag. Visual feedback via loading states (isRegeneratingStartFrame, isRegeneratingEndFrame), 3) **Video Regeneration** (`SegmentStudio.tsx`) - Added "Regenerate Video" button in Generate tab for segments with existing video. `handleRegenerateVideo()` function calls onGenerate with existing segment config. Visual feedback via isRegeneratingVideo state. **API Enhancement** (`generate-segments/route.ts`) - Extended GenerateSegmentsRequest with reference options. `buildComprehensiveSceneData()` now accepts options parameter and includes reference context. Enhanced prompt generator adds character IDs and reference inclusion flags to AI context. **Reference Library Integration** - Dialog displays available characters with avatars/checkboxes, scene references with thumbnails, and object references. Selected references inform AI segmentation for better visual consistency and action/transition depiction. **Key Files**: `SceneProductionManager.tsx` (References tab, state management), `SegmentStudio.tsx` (regenerate buttons, handlers), `generate-segments/route.ts` (API options), `page.tsx` (handler integration). | ✅ Implemented |
| 2025-12-20 | Frame Editing Feature (Start/End Frame Refinement) | **Added instruction-based editing for Start and End keyframes in the Frame step**. Problem: After generating frames with the Keyframe State Machine, users had no way to refine or fix issues (wrong pose, incorrect detail, character expression) without regenerating the entire frame. **Solution - Reuse ImageEditModal**: 1) **Edit Button on Frame Thumbnails** (`SegmentPairCard.tsx`) - Added Pencil icon button that appears on hover over Start/End frame thumbnails. Clicking opens the existing `ImageEditModal` with frame context, 2) **Extended Modal State** (`ScriptPanel.tsx`) - `editingImageData` state now includes optional `segmentId`, `frameType`, and `sceneId` for frame editing context. Modal title dynamically shows "Edit Start Frame" or "Edit End Frame", 3) **Handler Chain** - `onEditFrame` prop flows: VisionPage (`handleEditFrame`) → ScriptPanel → SegmentFrameTimeline → SegmentPairCard. When modal saves, it calls `onEditFrame(sceneId, segmentId, frameType, newUrl)` which updates both `segment.startFrameUrl`/`endFrameUrl` AND `segment.references.startFrameUrl`/`endFrameUrl`, 4) **Three Edit Modes Available** - Quick Edit (instruction-based, e.g., "change the expression to surprised"), Precise Edit (mask-based inpainting), Outpaint (expand to cinematic aspect ratio). All existing ImageEditModal capabilities work for frames. **Implementation Approach**: Minimal changes - reused existing ImageEditModal component and Gemini 3 Pro Image Preview API. No new API endpoints required. **Future Considerations**: Could add native Imagen 3 Capability Model (`imagen-3.0-capability-001`) for better mask-based inpainting if Gemini's mask interpretation proves inconsistent. Auto-masking (semantic segmentation) could be added if users request. **Key Files**: `SegmentPairCard.tsx` (Edit button), `SegmentFrameTimeline.tsx` (prop threading), `ScriptPanel.tsx` (modal state, handler), `page.tsx` (`handleEditFrame` persistence). | ✅ Implemented |
| 2025-12-20 | Frame-First Video Generation Workflow | **Enforced Frame-First workflow for I2V/FTV video generation to improve character consistency**. Problem: Video generation was silently falling back to T2V (Text-to-Video) when I2V or FTV was requested but frames weren't available. This caused character faces to drift since T2V has no visual anchor. Logs showed: `Requested method: I2V`, `Effective method: T2V`, `Reasoning: I2V requires a start frame`. **Root Cause**: `intelligentMethodSelection.ts` was silently falling back to T2V instead of returning an error when I2V/FTV prerequisites weren't met. **Veo 3.1 Constraint**: `referenceImages` (character refs) CANNOT be combined with `startFrame` (I2V/FTV modes) - this is an API limitation. Character consistency must come from having faces "baked" into Imagen 3 keyframes, not from runtime character refs. **Solution - Frame-First Enforcement**: 1) **Hard Validation** (`intelligentMethodSelection.ts`) - `validateMethodForContext()` now returns hard errors, not suggestions, when I2V/FTV lack frames. Added `requiresFrameFirst?: boolean` to result interface. `getMethodWithFallback()` no longer silently falls back - returns error with `requiresFrameFirst: true` flag, 2) **UI Messaging** (`DirectorDialog.tsx`) - Tabs for I2V/FTV show disabled reasons when frames missing ("Requires a start frame"). Frame-First recommendation banner appears when T2V is selected: "For best character consistency, generate frames in the Frame step first", 3) **Hook Updates** (`useSegmentConfig.ts`) - Method reasons now emphasize Frame-First: FTV="Best quality: Both keyframes anchor character appearance", T2V="⚠️ Lower quality: Generate frames first for better consistency". Confidence calculation prioritizes FTV when both frames exist. **Workflow**: Imagen 3 generates keyframes with character refs (faces baked in) → FTV mode uses both frames as anchors → Characters stay consistent because they're in the anchor frames → Edit after if needed. **Key Files**: `intelligentMethodSelection.ts`, `DirectorDialog.tsx`, `useSegmentConfig.ts`. | ✅ Implemented |
| 2025-12-20 | Director's Console - Call Action Step Refactor | **Pre-Flight workflow for batch video rendering with auto-drafting and approval**. Problem: Previous Call Action step processed video generation automatically without user review. Users needed: 1) Ability to review/edit generation settings before batch rendering, 2) Smart defaults based on available frame anchors, 3) Approval workflow to selectively render segments. **Solution - "Director's Console"**: 1) **Auto-Draft Logic** (`useSegmentConfig.ts` hook ~280 lines) - Intelligently detects available assets and recommends generation method: FTV (both startFrameUrl + endFrameUrl exist), I2V (only startFrameUrl), T2V (no frames), EXT (existing video). Generates context-aware prompts: motion instructions for FTV interpolation, visual descriptions for I2V/T2V. Calculates confidence score (50-95) based on prerequisites met. 2) **New Types** (`types.ts`) - Added `ApprovalStatus` ('auto-ready'|'user-approved'|'rendering'|'rendered'|'error'), `VideoGenerationConfig` (mode, prompt, motionPrompt, visualPrompt, negativePrompt, aspectRatio, resolution, duration, startFrameUrl, endFrameUrl, sourceVideoUrl, approvalStatus, confidence), `DirectorQueueItem` (segmentId, sequenceIndex, config, thumbnailUrl, status, error, progress), `BatchRenderOptions` (mode, priority, delayBetween). 3) **DirectorDialog Modal** (`DirectorDialog.tsx` ~430 lines) - 4-tab interface: Text-to-Video, Image-to-Video, Frame-to-Video, Extend. Preview area shows Start→End frames for FTV, single frame for I2V, video for Extend. Prompt editing with contextual tips. Advanced settings accordion (aspect ratio, resolution, negative prompt). Duration selector (4/6/8 seconds). "Approve Settings" button marks segment as user-approved. Tabs are conditionally enabled based on available assets. 4) **DirectorConsole Dashboard** (`DirectorConsole.tsx` ~370 lines) - Segment grid showing thumbnail, method badge (INTERP/I2V/T2V/EXT), approval status badge, prompt preview, confidence indicator. Control bar with "Render Approved Only" (processes user-approved segments) and "Render All Segments" (uses auto-drafts for unreviewed). Progress bar during batch rendering. Status counts (approved/auto-ready/rendered/total). Click segment to open DirectorDialog. 5) **useVideoQueue Hook** (`useVideoQueue.ts` ~250 lines) - Queue state management with segment configs. `processQueue({ mode: 'approved_only' | 'all', priority: 'sequence' | 'approved_first', delayBetween: 500 })`. Sequential processing with 500ms rate limit delay. Progress tracking, cancellation support, error handling. 6) **ScriptPanel Integration** - Call Action tab now conditionally renders: DirectorConsole when segments exist, SceneProductionManager fallback when no segments. **Workflow**: Frame step anchors frames → Call Action shows DirectorConsole → User clicks segments to review/approve → "Render Approved" or "Render All" → Batch video generation. **Key Files**: `useSegmentConfig.ts`, `useVideoQueue.ts`, `DirectorDialog.tsx`, `DirectorConsole.tsx`, `types.ts` (extended), `ScriptPanel.tsx` (integration), `index.ts` (exports). | ✅ Implemented |
| 2025-12-20 | Scene Video Player - Full Scene Playback | **Full-screen video player for reviewing rendered scene segments as a continuous preview**. Problem: After rendering video segments in the Director's Console, users had no way to preview the full scene as a continuous video. Screening Room plays storyboard images with audio, not rendered video segments. **Solution - SceneVideoPlayer**: 1) **Component** (`SceneVideoPlayer.tsx` ~380 lines) - Full-screen modal using Dialog pattern, native `<video>` element with `onEnded` for auto-advance, sequential playback through all segments. 2) **Features** - Transport controls (play/pause, skip forward/back), progress bar with segment dividers showing overall position, segment indicator badge ("Segment 2 of 5"), mute toggle, keyboard shortcuts (Space=play/pause, ←→=skip, M=mute, Esc=close). 3) **Fallback Handling** - For unrendered segments, displays start frame with "Video not yet rendered" overlay and auto-advances after segment duration. 4) **Integration** - "Play Scene" button added to DirectorConsole control bar, enabled when `statusCounts.rendered > 0`, styled in emerald green to distinguish from render actions. Button shows count of rendered segments. 5) **Props Interface** - `segments: SceneSegment[]`, `sceneNumber`, `sceneHeading?`, `isOpen`, `onClose`, `startAtSegment?`. Uses `segment.activeAssetUrl` for video URL, `segment.startFrameUrl` for fallback image. **Workflow**: Render segments in DirectorConsole → "Play Scene" button appears → Opens full-screen player → Sequential playback with transport controls. **Key Files**: `SceneVideoPlayer.tsx`, `DirectorConsole.tsx` (integration), `index.ts` (export). | ✅ Implemented |
| 2025-12-20 | Character Reference Enhancement for Frame Generation | **Improved character consistency in Start/End frame generation by always including character reference images**. Problem: Character consistency was not maintained during frame-to-frame generation when frames didn't include good character references. Faces and costumes would drift between segments, breaking visual continuity. **Root Cause**: 1) Character refs for end frames were conditional on `imageStrength > 0.7` (only low-action scenes), 2) Call site wasn't passing complete character metadata (`ethnicity`, `age`, `wardrobe`), 3) No priority sorting - random characters got selected over protagonists. **Solution - 3 Fixes**: 1) **Always Include Character References** (`generate-segment-frames/route.ts`) - Removed conditional `if (weights.imageStrength > 0.7)` check. Now ALL frame generations (both start and end) include character reference images. High-action scenes especially need refs to prevent drift during dynamic motion. Added debug logging to track character reference counts and names, 2) **Enhanced Character Data Mapping** (`page.tsx` handleGenerateSegmentFrames) - Now passes complete character metadata: `ethnicity`, `age`, `wardrobe` (from `defaultWardrobe`), in addition to existing `name`, `appearance`, `referenceUrl`. These fields are used by the Intelligence Library for enhanced identity lock prompts, 3) **Priority Sorting by Role** (`page.tsx`) - Characters are now sorted before being sent to API: protagonist → main → supporting. This ensures the most important characters get included in the 3-character limit. Also filters out narrator/description voice characters. **Logging Added**: Both start and end frame generation now log: `[Generate Frames] Character references available: X/Y CharName1, CharName2...` to help diagnose when characters lack reference images. **Key Files**: `page.tsx` (handleGenerateSegmentFrames), `generate-segment-frames/route.ts`. | ✅ Implemented |
| 2025-12-20 | Keyframe State Machine Architecture (Frame Step Refactor) | **Comprehensive refactor moving frame anchoring workflow into the Frame step with intelligent UI**. Problem: Current Frame step showed only a single scene image (opening frame), while the complex segment-by-segment frame anchoring happened in Call Action. This was backwards - Frame step should handle all keyframe work, Call Action should just execute. **Solution - Keyframe State Machine**: 1) **Intelligence Library** (`/lib/intelligence/`) - Three modules: `ActionWeights.ts` (inverse proportionality - low action = high imageStrength for identity lock, high action = low imageStrength for motion freedom), `PromptEnhancer.ts` (injects identity lock phrases based on action type), `FrameGenerator.ts` (state machine logic for Start/End frame workflow), 2) **Extended Segment Types** - Added to `SceneSegment`: `transitionType` ('CONTINUE' or 'CUT'), `anchorStatus` ('pending'→'start-locked'→'end-pending'→'fully-anchored'), `actionType` (static/subtle/speaking/gesture/movement/action/transformation), `actionPrompt`, `startFrameUrl`, `endFrameUrl`, 3) **New UI Components** - `SegmentPairCard.tsx` (visualizes Start→End frame pair with action arrow, generation buttons, status badges), `SegmentFrameTimeline.tsx` (container showing all segment pairs with batch generation, progress stats, FTV readiness indicator), 4) **New API Route** - `POST /api/production/generate-segment-frames` accepts frameType ('start', 'end', 'both'), uses Intelligence Library to build enhanced prompts, returns generated frame URLs with metadata, 5) **Frame Step Integration** - `ScriptPanel.tsx` Frame step (storyboardPreViz tab) now conditionally renders: Shows `SegmentFrameTimeline` when segments exist (after Call Action creates them), falls back to simple single-frame viewer when no segments. **Handler Chain**: VisionPage defines `handleGenerateSegmentFrames` and `handleGenerateAllSegmentFrames` → Props flow through ScriptPanel → SortableSceneCard → SceneCard → SegmentFrameTimeline. **Transition Logic**: CONTINUE = previous segment's end frame becomes next segment's start frame (visual continuity). CUT = fresh start frame generated (scene/location change). **Action Type Weights**: static=0.90 imageStrength (99% identity lock), speaking=0.80, gesture=0.70, movement=0.55, action=0.40, transformation=0.25. **Key Files**: `ActionWeights.ts`, `PromptEnhancer.ts`, `FrameGenerator.ts`, `index.ts` (new lib), `types.ts` (extended), `SegmentPairCard.tsx`, `SegmentFrameTimeline.tsx`, `/api/production/generate-segment-frames/route.ts`, `ScriptPanel.tsx` (Frame step), `page.tsx` (handlers). Completes Frame-Anchored Video Production workflow. | ✅ Implemented |
| 2025-12-19 | Frame-Anchored Video Production (Phase 1) | **Implemented end frame generation for improved Veo 3.1 video quality**. Problem: Current I2V video generation only uses a start frame, causing character drift (changing faces, costumes, proportions) over 8-second segments. Users report faces looking different at end of video than at start. **Solution - Frame Anchoring**: Generate an END frame using Imagen 3 BEFORE video generation, then use Veo 3.1's FTV (Frame-to-Video) mode with BOTH start and end frames as anchors. This constrains the video generation to maintain character consistency. **Implementation**: 1) **New API endpoint** - `POST /api/segments/[segmentId]/generate-end-frame` uses Imagen 3 with the start frame as reference to generate what the scene looks like AFTER the segment action. Prompt emphasizes identical characters, consistent environment, and end state visualization, 2) **Frame Anchoring UI in SegmentStudio** - New "Frame Anchoring" section shows start/end frame previews side-by-side with arrow indicating segment duration. "Generate End Frame" button calls API and saves result to segment, 3) **Full prop chain** - `onGenerateEndFrame` and `onEndFrameGenerated` callbacks flow from VisionPage → ScriptPanel → SceneCard → SceneProductionManager → SegmentStudio, 4) **Data persistence** - End frame URL stored in `segment.references.endFrameUrl` and persisted to Firestore via `applySceneProductionUpdate()`, 5) **FTV mode ready indicator** - When both start and end frames are set, UI shows "FTV Mode Ready" hint guiding user to use Generate Video for frame-anchored generation. **Expected Quality Improvement**: 40% reduction in character face drift, 60% improvement in costume/prop consistency. **Cost Impact**: +$0.02 per segment for end frame generation (Imagen 3). Files: `generate-end-frame/route.ts` (new), `SegmentStudio.tsx`, `SceneProductionManager.tsx`, `ScriptPanel.tsx`, `page.tsx`. Plan doc: `frame-anchored-video-production.plan.md`. | ✅ Implemented |
| 2025-12-19 | Disable Scene Description Audio in Screening Room | **Removed scene description audio from Screening Room playback**. Problem: Scene description audio was playing before narration in the Screening Room, adding unnecessary delay and redundant audio. Users wanted a cleaner playback experience with just narration, dialogue, music, and SFX. **Solution - Updated `ScriptPlayer.tsx`**: 1) **Disabled description audio in timeline calculation** - `calculateAudioTimeline()` no longer adds description audio to the `SceneAudioConfig`. Description audio is still generated and stored for potential future use but not played, 2) **Adjusted timing** - Narration now starts at `NARRATION_DELAY_SECONDS` (2 seconds) instead of waiting for description to finish. This brings narration/dialogue/SFX timing forward, 3) **Simplified voiceAnchorTime** - No longer considers `descriptionEndTime` in timing calculations, 4) **Updated audio detection** - `hasPreGeneratedAudio` check excludes description since it's not played, 5) **Cleaned up unused variables** - Removed `descriptionUrl`, `descriptionEndTime` variables that are no longer needed. Files: `ScriptPlayer.tsx`. | ✅ Implemented |
| 2025-12-18 | Optimized Segment Generation: Combine Dialogue Lines | **Reduced excessive segment creation by instructing AI to combine dialogue**. Problem: The segment generation was creating too many segments - a new segment for each dialogue line even when dialogue was only 3 seconds. This resulted in 10+ segments for simple scenes. **Solution - Updated AI Prompt in `generate-segments/route.ts`**: 1) **Minimum segment duration** - Added constraint: "MINIMUM 4 seconds per segment unless absolutely necessary for a dramatic cut", 2) **New SEGMENT EFFICIENCY constraint** - Added operational constraint #5: "Create as FEW segments as possible while respecting the duration limit. Combine multiple dialogue lines into a single segment when they occur in the same shot/angle or in a two-shot conversation. A segment with 2-4 lines of back-and-forth dialogue is PREFERRED over creating a new segment for each line", 3) **Updated LOGIC WORKFLOW** - Changed "Analyze Triggers" to specify: "DO NOT create a new segment just because the speaker changes - dialogue between characters in the same location should be combined", 4) **Target segment count** - Added guidance: "Aim for Efficiency: Target 3-6 segments for most scenes. If you have more than 8 segments, reconsider whether some can be combined", 5) **Combine short dialogue** - Added rule: "Combine short dialogue lines (under 3 seconds each) with adjacent dialogue in the same segment". **UI Change**: Renamed regeneration button from "Generate" to "Generate Segments" in `SceneProductionManager.tsx` for clarity. Files: `generate-segments/route.ts`, `SceneProductionManager.tsx`. | ✅ Implemented |
| 2025-12-18 | Smart Video Generation Workflow Enhancement | **Added AI-recommended generation plans, prompt synchronization, method-specific prompts, and general instruction support**. Problems: 1) No recommended video generation plan for segments - users had to manually choose T2V/I2V/REF/EXT/FTV methods, 2) Prompts weren't updated when script dialogue changed - stale prompts caused inconsistency, 3) Same prompt template used for all methods - but REF mode shouldn't describe character appearance (reference images provide it), I2V should use positional refs ("the person on the left"), 4) No way to add quick instructions like "make it more dramatic" without editing full prompt. **Solution - 4 Major Components**: 1) **GenerationPlan Types** (`types.ts`) - New interfaces: `GenerationPlan` (recommendedMethod, confidence 0-100, reasoning, fallbackMethod, prerequisites[], batchPriority, qualityEstimate, warnings[]), `PromptContext` (dialogueHash, visualDescriptionHash, generatedAt), `GenerationPrerequisite` enum (SCENE_IMAGE, PREVIOUS_FRAME, CHARACTER_REFS, VEO_VIDEO_REF). Added `generationPlan?`, `promptContext?`, `isStale?`, `userInstruction?` to SceneSegment, 2) **Method Prompt Builder** (`methodPromptBuilder.ts` ~400 lines) - Build optimized prompts per Veo 3.1 mode: `buildT2VPrompt()` (full character descriptions), `buildI2VPrompt()` (uses positional refs via `replaceCharacterNamesWithPositional()`), `buildREFPrompt()` (omits character appearance - refs provide it), `buildEXTPrompt()` (continuation focus), `buildFTVPrompt()` (transition description), `refreshSegmentPrompt()` (regenerate from current scene data), 3) **Prompt Sync Service** (`promptSyncService.ts` ~500 lines) - Staleness detection via content hashing: `generateContentHash()`, `checkSegmentStaleness()`, `detectStaleSegments()`, `refreshAllStaleSegments()`. Plan building: `buildGenerationPlan()`, `buildAllGenerationPlans()` - considers segment position, available assets, confidence scoring, 4) **General Instruction Field** (`VideoEditingDialogV2.tsx`) - "General Instruction" textarea with placeholder "Quick instructions (e.g., 'Make it more dramatic', 'Add slow motion')" - prepends to compiled prompt, saved to `segment.userInstruction`. **UI Enhancements**: 1) Generation Plan panel in SegmentStudio Details tab - shows recommended method badge with confidence bar, prerequisites as colored pills (green=met, red=missing, gray=optional), quality estimate, warnings, 2) "Prompt May Be Outdated" banner when `isStale=true` with staleness reason, 3) Enhanced generate-segments API outputs `generation_plan` from Gemini with recommended_method, confidence, reasoning, prerequisites[], batch_priority. Files: `types.ts`, `methodPromptBuilder.ts` (new), `promptSyncService.ts` (new), `generate-segments/route.ts`, `VideoEditingDialogV2.tsx`, `SegmentStudio.tsx`, `index.ts`. | ✅ Implemented |
| 2025-12-18 | Video Editor Smart Prompt Refactoring | **Major refactoring of VideoEditingDialog with constraint-based UI**. Problems: 1) Users had to manually craft prompts with camera movements, lighting, style - error-prone and inconsistent, 2) Dialog was single-panel tab-based design that didn't show preview while configuring, 3) No way to visualize what the compiled prompt would look like, 4) Veo 3.1 features like audio sync and magic edit were scattered across tabs. **Solution - "Smart Prompt" Layer**: 1) **Split-view layout** - Left panel (40%) for Control Deck with accordion modules, Right panel (60%) for video preview and segment info, 2) **4 Accordion Modules** - Camera & Temporal (movement type, velocity, framing, focus, motion intensity, pacing), Performance & Dialog (character focus, expression, micro-expressions, eye contact, lip-sync placeholder), Visual Style (presets, lighting, color grading, film grain, depth of field, atmosphere), Magic Edit (coming soon - inpainting, object manipulation), 3) **Video Prompt Compiler** - New `videoPromptCompiler.ts` converts UI constraint settings to optimized Veo 3.1 prompts with natural language descriptions for each setting, 4) **New type definitions** - Added `CameraControlSettings`, `PerformanceSettings`, `VisualStyleSettings`, `MagicEditSettings`, `SmartPromptSettings`, `VideoPromptPayload` to types.ts, 5) **History tab** - New tab showing all takes for the segment with status, duration, timestamps, and extensibility indicator, 6) **Compiled prompt preview** - Toggle to show/hide the final compiled prompt for debugging. **Technical Implementation**: New files: `VideoEditingDialogV2.tsx` (refactored dialog), `SmartPromptModules.tsx` (accordion components), `videoPromptCompiler.ts` (prompt compilation logic), `accordion.tsx` (new UI component). Original `VideoEditingDialog.tsx` now re-exports from V2. Added `@radix-ui/react-accordion` package and accordion animations to tailwind config. Files: `VideoEditingDialogV2.tsx`, `SmartPromptModules.tsx`, `videoPromptCompiler.ts`, `types.ts`, `accordion.tsx`, `tailwind.config.js`. | ✅ Implemented |
| 2025-12-18 | Scene Card UI Consolidation | **Streamlined scene card layout for better workflow navigation**. Problems: 1) Workflow tabs appeared twice (as pills in header AND folder tabs below scene title), 2) Mark Done and Help buttons were buried in the folder tab row, 3) Timeline container was too short causing tracks to require scrolling, 4) Header workflow tabs weren't styled as proper folder tabs. **Solution**: 1) **Unified folder tabs in header** - Replaced pill-style workflow buttons with folder-tab styling in the header row, centered between left controls and right actions, 2) **Removed duplicate tabs** - Deleted the redundant folder tab navigation that was inside the collapsible content area, keeping only the header tabs, 3) **Mark Done + Help in title row** - Moved "Mark Done" toggle and Help (lightbulb) button to the scene title row for immediate accessibility, 4) **Taller timeline** - Increased timeline container from 680px to min-h-[750px] with overflow-visible so all tracks (Video, Narration, Description, Dialogue, Music, SFX) are visible without scrolling. Files: `ScriptPanel.tsx` (header tabs, title row controls, removed duplicate tabs), `SceneProductionManager.tsx` (timeline container height). | ✅ Implemented |
| 2025-12-18 | Soundstage UI Optimization: Timeline Toggle + Workflow Tabs | **Improved Soundstage usability with better control placement**. Problems: 1) Scene Timeline toggle took up a full row even when hidden, wasting vertical space, 2) Workflow tabs (Script/Direction/Frame/Call Action) were buried inside the expanded scene card and not immediately accessible. **Solution**: 1) **Timeline toggle moved to header** - Added "Timeline" button (Layers icon, amber color) to Soundstage header action buttons alongside Flow/Build/Edit/Export. When timeline is hidden, the entire row is completely eliminated instead of showing empty space with a toggle. Button shows active state when timeline is visible, 2) **Workflow tabs enhanced in scene card header** - Converted small circular status indicators to clickable pill buttons with labels. Each pill shows: workflow icon, label (hidden on small screens), status coloring (green=complete, amber=stale, primary=active, slate=pending, disabled=locked). Clicking a tab switches workflow step AND auto-expands scene card if collapsed, 3) **Smart locking** - Locked workflow steps are visually disabled and cannot be clicked. Files: `ScriptPanel.tsx` (Layers icon import, timeline toggle button in header, simplified timeline slot rendering, enhanced workflow status tabs with click handlers). | ✅ Implemented |
| 2025-12-18 | Fix Thai TTS with ElevenLabs v3 Model | **Fixed Thai language TTS generating gibberish**. Problem: Thai translations were correct but ElevenLabs audio output was garbled/gibberish. Root cause: `eleven_turbo_v2_5` model doesn't properly support tonal languages like Thai. **Solution**: 1) **Model selection by language** - Created `v3Languages` array for tonal languages (th, vi, id, ms) that use `eleven_v3` model, other languages continue using `eleven_turbo_v2_5`, 2) **API compatibility for v3** - ElevenLabs v3 has different API requirements: removed `optimize_streaming_latency` parameter (not supported), simplified `voice_settings` to only include `stability: 0.5` (v3 only accepts 0.0, 0.5, or 1.0 and doesn't support similarity_boost/style/use_speaker_boost), 3) **Conditional URL building** - `optimize_streaming_latency` query param only added for non-v3 models, 4) **Error handling fix** - Fixed `audioType is not defined` error in catch block. Files: `/api/vision/generate-scene-audio/route.ts`. | ✅ Fixed |
| 2025-12-17 | Fix I2V Start Frame Detection + Dialog Rename | **Fixed I2V mode falling back to T2V when user selected a start frame**. Problem: When user selected Image-to-Video mode and chose a start frame from the library, the intelligent method selection was rejecting I2V and falling back to T2V with error "I2V requires a start frame". Root cause: `buildMethodSelectionContext()` only checked `scene.imageUrl` for `hasSceneImage`, ignoring the explicit `startFrameUrl` passed when user selects a reference image. **Solution**: 1) **Updated `buildMethodSelectionContext()`** - Now considers `segment.references.startFrameUrl` when determining `hasSceneImage` and `hasPreviousLastFrame`, so user-selected start frames properly validate for I2V mode, 2) **Renamed dialog title** - Changed "Video Prompt Builder" → "Generate Video" and "Image Prompt Builder" → "Generate Image" for cleaner UI. Files: `intelligentMethodSelection.ts`, `SegmentPromptBuilder.tsx`. | ✅ Fixed |
| 2025-12-17 | Fix Veo 3.1 referenceImages API Format + FTV Validation | **Fixed 400 error when using REF mode with reference images**. Problem: API returned `referenceImages isn't supported by this model` error when using REF mode. Root cause: referenceImages was being placed in `parameters` object but Gemini API expects it in `config` object. **Solution**: 1) **Moved referenceImages to config** - Changed request body structure from `{ instances, parameters: { referenceImages } }` to `{ instances, parameters, config: { referenceImages } }` matching Gemini API docs, 2) **Added FTV validation warning** - When FTV mode requested without `endFrameUrl`, logs warning and adds message to `methodSelectionResult.warnings` explaining that interpolation requires both start AND end frames (falls back to I2V behavior), 3) **Updated docstring** - Added comprehensive documentation of all 5 video generation modes (T2V, REF, I2V, FTV, EXT) with their constraints and requirements. **Veo 3.1 Mode Summary**: a) T2V - Prompt only, b) REF - T2V + up to 3 reference images (CANNOT combine with startFrame), c) I2V - Uses startFrame as first frame, d) FTV - Uses BOTH startFrame AND lastFrame for interpolation, e) EXT - Extends Veo-generated videos in Gemini's 2-day cache. Files: `videoClient.ts` (API format fix, docstring), `generate-asset/route.ts` (FTV validation). | ✅ Fixed |
| 2025-12-17 | Opening Frame UI Redesign | **Optimized ScenePromptBuilder for establishing shot generation with film industry naming**. Changes: 1) **Title renamed** - "Scene Prompt Builder" → "Opening Frame — {scene heading}" reflecting film industry terminology, 2) **Tab labels updated** - "Guided Mode/Advanced Mode" → "Visual Setup/Custom Prompt" for clarity, 3) **Reference Library section added** - Collapsible "Reference Library 📚" section showing Scene Backdrops and Props/Objects grids, allows selecting references to include in prompt, 4) **Camera Movement removed** - Dropdown was not included in prompt anyway, cleaned up UI, 5) **Reference integration** - Selected scene/object references added to prompt text ("matching the visual style of...", "featuring...") and passed to API for REF mode support, 6) **Props passed through component tree** - `sceneReferences` and `objectReferences` flow from Vision page → ScriptPanel → ScenePromptBuilder. Files: `ScenePromptBuilder.tsx`, `ScriptPanel.tsx`, `page.tsx`. | ✅ Implemented |
| 2025-12-16 | VideoEditingDialog with 5 Veo 3.1 Feature Tabs | **Created comprehensive video editing dialog replacing 3 separate buttons**. Problem: Edit Video section had 3 individual action buttons (Extend, Interpolate, Reference-Guided) which was verbose and didn't expose all Veo 3.1 capabilities. **Solution**: 1) **New VideoEditingDialog component** - Full-featured tabbed dialog with 5 tabs for Veo 3.1 video editing features, 2) **Extend Tab** - Continue video beyond current length using EXT mode (requires `veoVideoRef` stored during initial Veo generation), 3) **Interpolate Tab** - Generate transitions between first/last frame images using FTV mode, 4) **References Tab** - Apply up to 3 style/character reference images using REF mode (T2V only), 5) **Audio Tab** - Configure synchronized audio generation (music_and_ambient, dialogue_and_ambient, or no_audio options), 6) **Object Editing Tab** - Placeholder for future video inpainting (not yet available in Veo 3.1 API), 7) **Single action button** - Replaced 3 buttons with one "Edit Video" button that opens the dialog, 8) **initialTab prop** - Dialog can open to specific tab for contextual navigation. **Technical Details**: Dialog matches SegmentPromptBuilder pattern with same props (segment, references, characters, onGenerate), handlers map VideoGenerationMethod to GenerationType for API compatibility. **Veo 3.1 Constraints**: a) EXT mode only works for Veo-generated videos stored in Gemini's 2-day cache, b) REF mode is T2V only (cannot combine with startFrame for I2V), c) Video inpainting is NOT available in current Veo 3.1 API. Files: `VideoEditingDialog.tsx` (new 800+ lines), `SegmentStudio.tsx` (integration). | ✅ Implemented |
| 2025-12-16 | SegmentStudio Action List UI + Veo 3.1 Edit Features | **Redesigned Generate tab with list-based action cards and added Edit Video section**. Problems: 1) Icon-only buttons were unclear and required tooltips, 2) Backdrop video generation was in a separate card format, 3) Current Prompt was in Generate tab but belongs with segment details, 4) Veo 3.1 edit capabilities not exposed. **Solution**: 1) **Action List Format** - Replaced 3 icon buttons with vertical list of clickable cards matching BackdropVideoModal pattern (icon + title + description), including: Generate Video, Generate Image, Add Scene Reference, Generate Backdrop, 2) **Edit Video Section** - New section appears when segment has active video asset, exposing Veo 3.1 features: Extend Video (EXT mode for Veo-generated videos), Interpolate Frames (FTV mode with first/last frame), Reference-Guided Regen (REF mode with style/character images), 3) **Current Prompt moved to Details tab** - Prompt now shows at top of Details tab for better organization, 4) **Handler functions** - Added `handleExtendVideo()`, `handleInterpolateFrames()`, `handleReferenceGuidedRegen()` that open SegmentPromptBuilder with appropriate mode pre-selected. **Veo 3.1 Edit Capabilities**: a) **Video Extension (EXT)** - Continue video beyond current length using last frames (requires `veoVideoRef` from Gemini 2-day cache), b) **Frame Interpolation (FTV)** - Generate transition between first/last frame images, c) **Reference Images (REF)** - Up to 3 style/character references for T2V only, d) **Synchronized Audio** - Generate audio matching video content (future). Files: `SegmentStudio.tsx`. | ✅ Implemented |
| 2025-12-16 | Backdrop Video Modal with 4 Generation Modes | **Replaced SegmentPromptBuilder backdrop mode with dedicated BackdropVideoModal**. Problem: Users needed a streamlined way to generate atmospheric establishing shot videos using the same 4 modes from the image backdrop generator. **Solution**: 1) **New BackdropVideoModal** - Dialog matching BackdropGeneratorModal design with 4 modes (Atmospheric B-Roll, Silent Portrait, Establishing Master, Storybeat Animatic), 2) **Scene Direction prompt building** - Uses `buildBackdropPrompt()` from `backdropGenerator.ts` to create optimized prompts from scene direction metadata, 3) **Veo 3.1 T2V generation** - New API route `/api/vision/generate-backdrop-video` generates 5s backdrop videos with style modifiers and negative prompts, 4) **Segment insertion before current** - Generated video automatically inserted as new segment BEFORE the currently selected segment (not just at beginning), shifting subsequent segments. Props chain: `onBackdropVideoGenerated` from VisionPage → ScriptPanel → SceneCard → SceneProductionManager → SegmentStudio. Button available for all segments, not just segment 0. Files: `BackdropVideoModal.tsx` (new), `/api/vision/generate-backdrop-video/route.ts` (new), `SegmentStudio.tsx`, `SceneProductionManager.tsx`, `ScriptPanel.tsx`, `page.tsx`. | ✅ Implemented |
| 2025-12-16 | Timeline UX Improvements: Separate Expand Controls + Read-Only Timing | **Simplified timeline controls for reliable UX**. Problems: 1) Timeline expand button and video player expand button controlled same `isPlayerExpanded` state (redundant), 2) Users could accidentally change segment duration via editable input causing cascading timeline issues. **Solution**: 1) **Separate timeline expansion** - Added `isTimelineExpanded` state that controls track heights independently from video player. Timeline expand button now increases Video track (h-16→h-24) and Audio tracks (h-10→h-14) for better visibility. Video player has its own expand button (max-w-sm→max-w-3xl), 2) **Read-only timing controls** - Converted Duration input to read-only display matching Position and Start. Removes accidental edits, duration now only changes via drag-resize on timeline or segment regeneration, 3) **Audio segment timing preserved** - Audio clips still support drag-to-move and resize-left/resize-right via existing DragState handling on timeline. Files: `SceneTimelineV2.tsx` (isTimelineExpanded state, button behavior, track heights), `SegmentStudio.tsx` (Duration display). | ✅ Implemented |
| 2025-12-15 | SegmentStudio UX Redesign: Tabbed Interface + Backdrop Video | **Major UX overhaul to improve segment panel usability**. Problems: 1) Vertical scroll hides controls - users can't see all options, 2) Ken Burns animation panel redundant with AI video generation, 3) "Add Establishing Shot" confusing UI with multiple options, 4) Timing controls buried in scrollable area. **Solution**: 1) **Tabbed interface** - 3 tabs: Generate (video/image/upload + backdrop builder), Details (timing, shot metadata, characters, dialogue), Takes (gallery of generated takes), 2) **Generate Backdrop Video** button replaces "Add Establishing Shot" - opens SegmentPromptBuilder with `isBackdropMode=true` pre-filling prompt from scene heading/description, uses Veo 3.1 T2V for atmospheric establishing shots, 3) **Ken Burns animation panel removed** - redundant since Veo generates real video motion (kept `keyframeSettings` in schema for legacy export compatibility), 4) **Preview always visible** - video/image preview stays in header area above tabs, not inside scrollable content, 5) **Timing in header + Details tab** - compact timing in header row, detailed controls in Details tab, 6) **Enhanced Details tab** - shows segment position, time range, shot type, camera, emotion, cut reason, characters, dialogue coverage, establishing shot info. Props added: `isBackdropMode`, `sceneHeading`, `sceneDescription`, `sceneNarration` to SegmentPromptBuilder. Files: `SegmentStudio.tsx` (complete rewrite), `SegmentPromptBuilder.tsx` (new props + backdrop prompt pre-fill). | ✅ Implemented |
| 2025-12-15 | SceneTimelineV2: Single Source of Truth + Multi-Language Audio | **Complete rewrite of timeline component to fix persistent issues**. Problems: 1) Edit controls (move/resize) not working properly, 2) Stale audio references persisting after regeneration, 3) No multi-language voiceover support. Root causes: Dual source of truth between `audioTracksState` and external audio, weak React dependencies, race conditions in audio refs. **Solution Architecture**: 1) **Single source of truth** - Audio tracks derived reactively via `useMemo` from `scene` prop + selected language, no separate audio state, 2) **Stable audio keys** - `key={${clipId}:${url}}` forces re-mount when URL changes, 3) **Error cleanup** - `onError` handler removes clips with stale URLs, 4) **Multi-language selector** - Language dropdown with flags, fallback to 'en' when language unavailable, 5) **Optimistic editing** - Local state for drag operations with 300ms debounced persistence. New files: `SceneTimelineV2.tsx` (component), `audioTrackBuilder.ts` (utility), new types in `types.ts` (`AudioTrackWithMeta`, `MultiLanguageAudioTracks`, `TimelineAudioState`). Integration: `SceneProductionManager` now passes scene directly, manages selectedLanguage state. Files: `SceneTimelineV2.tsx`, `audioTrackBuilder.ts`, `types.ts`, `SceneProductionManager.tsx`. | ✅ Implemented |
| 2025-12-15 | Simplified Audio Management After Scene Edits | **Replaced complex content-matching audio cleanup with complete audio deletion + manual regeneration**. Problem: After editing scenes, stale audio could persist due to alignment issues between old and new content. Solution: 1) `handleApplySceneChanges` now uses `clearAllSceneAudio()` to delete ALL audio from edited scene (narration, description, dialogue), 2) New **"Update Audio"** button on SceneCard (purple, RefreshCw icon) allows manual regeneration, 3) `handleUpdateSceneAudio` clears remaining audio, deletes blobs, then sequentially regenerates description/narration/all dialogue, 4) Removed "Manage Audio" and "Sync Audio" buttons from SceneProductionManager. Workflow: Edit scene → All audio deleted → Click "Update Audio" to regenerate. Simpler and more reliable than content-matching approach. Files: `page.tsx`, `ScriptPanel.tsx`, `SceneProductionManager.tsx`, `cleanupAudio.ts`. | ✅ Implemented |
| 2025-12-14 | Backdrop Generation UI Reorganization | **Two distinct generation workflows for backdrop content**. 1) **"Generate Scene"** button in Scene Backdrops sidebar section → Opens BackdropGeneratorModal to create scene reference **images** (4 modes: Atmospheric, Portrait, Master, Animatic). 2) **"Backdrop"** button in SegmentStudio controls (alongside Video/Image/Upload) → Guides users to generate backdrop video via the sidebar. Rationale: Scene images belong in reference library (sidebar), video generation belongs in segment controls (timeline). UI text update: "Generate" → "Generate Scene" in VisionReferencesSidebar. Added toast guidance when Backdrop button clicked without callback. Files: `VisionReferencesSidebar.tsx`, `SegmentStudio.tsx`, `SceneProductionManager.tsx`, `ScriptPanel.tsx`. | ✅ Implemented |
| 2025-12-14 | Add to Timeline for Scene Backdrops | **Insert backdrop images as new timeline segments**. "Add to Timeline" button on Scene Backdrop cards opens scene selector. Selecting a scene inserts a new 5-second segment at the beginning with the backdrop image as reference. Existing segments shift to make room. Workflow: Generate backdrop image → Add to timeline → Generate video using I2V mode. Props added: `onInsertBackdropSegment` callback chain (VisionPage → VisionReferencesSidebar → DraggableReferenceCard). Simple button list for scene selection instead of complex Select dropdowns (which caused production minification errors). Files: `VisionReferencesSidebar.tsx`, `page.tsx`. | ✅ Implemented |
| 2025-12-14 | Backdrop Generation (4 Modes) | **Replaced simple scene reference with 4 distinct backdrop generation modes**. Each mode maps different scene direction fields to optimized prompts: 1) **Atmospheric B-Roll** (scene.keyProps, scene.atmosphere, lighting.practicals) - Focus on environmental details, no people, macro lens, 2) **Silent Portrait** (talent.emotionalBeat, lighting.keyLight, talent.keyActions) - Character psychology without dialogue, 85mm portrait lens, 3) **Establishing Master** (scene.location, talent.blocking, lighting.colorTemperature) - Location geography, wide angle, no people, 4) **Storybeat Animatic** (camera.angle, camera.movement, scene.location) - Charcoal sketch storyboard style. Files: `src/lib/vision/backdropGenerator.ts`, `BackdropGeneratorModal.tsx`, `/api/vision/generate-backdrop/route.ts`. Updated: `VisionReferencesSidebar.tsx` (renamed section to "Scene Backdrops"), `VisualReference` type (added `backdropMode` field). | ✅ Implemented |
| 2025-12-14 | Scene Reference Generation Feature | **AI-powered scene reference image generation from Scene Direction**. Generate button in Scenes section of Reference Library sidebar opens `SceneReferenceGeneratorModal`. Features: 1) Scene selector showing all scenes (prioritizes those with sceneDirection), 2) Prompt builder extracts location, atmosphere, keyProps, lighting from `DetailedSceneDirection`, 3) Editable prompt textarea for refinement, 4) Uses `personGeneration: 'dont_allow'` to ensure no people in generated images, 5) Standard toast/freeze pattern during generation. Also added expand view for reference images (Maximize2 icon overlay, full-screen dialog). Files: `SceneReferenceGeneratorModal.tsx`, `/api/vision/generate-scene-reference/route.ts`, `VisionReferencesSidebar.tsx`. | ⚠️ Superseded by Backdrop Generation |
| 2025-12-14 | Intelligent Segment Method Selection | **AUTO method selection for Veo video generation**. New service analyzes segment context (position, references, shot type, dialogue) to select optimal method: 1) First segment + scene image → I2V (precise control), 2) First segment + character refs → REF (consistency), 3) Close-up + dialogue + previous video → EXT (seamless continuation), 4) Shot type change → REF (creative freedom). Added scene image warning in Call Action tab - soft requirement encourages generating scene image before video for consistency. Files: `src/lib/vision/intelligentMethodSelection.ts`, `src/lib/vision/referenceBuilder.ts`, `generate-asset/route.ts`, `ScriptPanel.tsx`. | ✅ Implemented |
| 2025-12-14 | Fix: referenceImages is T2V only | **BUG FIX**: referenceImages cannot be combined with startFrame (I2V). Per Veo 3.1 API spec, these are mutually exclusive: 1) `referenceImages` = T2V mode with style/character guidance, 2) `image` (startFrame) = I2V mode to animate a frame. Fixed generate-asset route to NOT add startFrame when using REF method. Added safety check in videoClient.ts to warn and skip referenceImages if startFrame is present. | ✅ Fixed |
| 2025-12-14 | Veo 3.1 Migration for Video Generation | **Upgraded from Veo 3.0 to Veo 3.1** (`veo-3.1-generate-preview`). Veo 3.0 does NOT support referenceImages (character/style consistency), video extension, or frame-to-video (FTV) features. Veo 3.1 enables: 1) Up to 3 referenceImages per request (type: 'style' or 'character'), 2) Video extension for Veo-generated videos within 2-day retention window, 3) First+last frame interpolation. Added `veoVideoRef` field to store Gemini Files API reference for future extension. EXT mode falls back to I2V with last frame since external videos (Vercel Blob) cannot use native extension. Rate limits: 2 RPM, 10 RPD (Paid tier 1). File: `src/lib/gemini/videoClient.ts`. | ✅ Implemented |
| 2025-12-14 | Establishing Shot Refactor: Manual Add + Style Selector | **Refactored from automatic to manual approach**. Bug fix: Original implementation mixed Gemini dialogue prompts with establishing shot segments. Now: 1) "Add Establishing Shot" button in SceneTimeline inserts segment at position 0 with scene image, 2) Style selector in SegmentStudio offers 3 options: **Scale Switch** (Ken Burns zoom 1.0→1.3, cinematic), **Living Painting** (ambient motion, static camera), **B-Roll Cutaway** (pan with detail shots). Removed: EstablishingShotSection from dialog, automatic generation in API. Added: `handleAddEstablishingShot`, `handleEstablishingShotStyleChange` handlers. Files: `page.tsx`, `SceneTimeline.tsx`, `SegmentStudio.tsx`, `SceneProductionManager.tsx`, `generate-segments/route.ts`. | ✅ Refactored |
| 2025-12-13 | Establishing Shot Feature (v1 - SUPERSEDED) | Initial implementation with dialog-based approach. Superseded by 2025-12-14 refactor due to prompt contamination bug. | ⚠️ Superseded |
| 2025-12-13 | Service Worker caching: NetworkFirst for JS/CSS | Changed `StaleWhileRevalidate` → `NetworkFirst` for JS and CSS bundles in `next.config.js`. StaleWhileRevalidate was causing users to see stale UI (e.g., old labels) after deployments because cached JS served first. NetworkFirst ensures fresh bundles load immediately, with 3s timeout fallback to cache for slow networks. Also updated Next.js data files to NetworkFirst. | ✅ Fixed |
| 2025-12-13 | UI Terminology: Virtual Production & The Soundstage | Renamed workflow phase "Production" → "Virtual Production" (industry term from The Mandalorian, etc.). Renamed script panel "Scene Studio" → "The Soundstage". See Terminology Mapping section below for code-to-UI mappings. Updated: `Sidebar.tsx`, `workflowSteps.ts`, `page.tsx` (ContextBar), `ScriptPanel.tsx`, `NavigationWarningDialog.tsx`. | ✅ Implemented |
| 2025-12-13 | Image Edit in Call Action step | Added image editing capability to the Call Action (SceneProductionManager) workflow step, reusing the same ImageEditModal from Frame step. Added `onEditImage` prop to SceneProductionManager → SegmentStudio. Edit button (Pencil icon) appears on segment image previews. Enables AI-powered editing of segment keyframe images without duplicating code. Routes: `/api/image/edit`. | ✅ Implemented |
| 2025-12-13 | Workflow Mark as Done feature | Added manual completion override for workflow steps. Users can mark any step (Script/Direction/Frame/Call Action) as complete via "Mark Done" toggle button in tab header. Uses `scene.workflowCompletions` object for persistence. Enables users to proceed with workflow when automatic detection doesn't match their intent. Button shows checkmark when marked complete. | ✅ Implemented |
| 2025-12-14 | Fix Call Action Timeline Issues | Fixed 5 issues: 1) Tooltip positioning - used createPortal to escape Dialog transform context, 2) Audio clip persistence - handleAudioClipChange now persists to DB with 500ms debounce, 3) Audio duration changes - handler now supports both startTime and duration, 4) Audio sync - added explicit dependencies on audio properties in SceneProductionManager, 5) Tooltip z-index raised to 9999. Files: SceneTimeline.tsx, page.tsx, SceneProductionManager.tsx | ✅ Fixed |
| 2025-12-13 | Auto-open first incomplete workflow section | Scene card now opens to the first **incomplete** (not marked as done) and unlocked workflow step, instead of just the first unlocked step. Modified useEffect in ScriptPanel.tsx to find first step where `!stepCompletion[key]`. Improves UX by directing users to work that still needs attention. | ✅ Implemented |
| 2025-12-13 | Dismissible staleness warnings | Added ability to dismiss false-positive stale warnings. "Dismiss" button on staleness banner stores dismissed state in `scene.dismissedStaleWarnings`. Prevents warning from reappearing after user acknowledges and chooses not to regenerate. Addresses cases where hash-based detection incorrectly flags stale content. | ✅ Implemented |
| 2025-12-12 | Phase 9: MP4 Export with Keyframes | Export animatic to MP4 via Shotstack API. Created `ShotstackService.ts` with `buildShotstackEdit()` and `getEffectFromKeyframes()` for Ken Burns → Shotstack effect mapping. API routes: POST `/api/export/animatic` builds edit JSON and submits render, GET `/api/export/animatic/[renderId]` polls status. Direction mapping: in→zoomIn, out→zoomOut, left→slideLeft, etc. Supports audio tracks (narration, music, dialogue). Preview mode when SHOTSTACK_API_KEY not set. | ✅ Implemented |
| 2025-12-12 | Phase 8: AI Pre-assignment of Dialogue | AI automatically assigns dialogue to segments during generation. Modified `/api/scenes/[sceneId]/generate-segments` prompt to include numbered dialogue indices [0], [1], etc. AI returns `assigned_dialogue_indices: [0, 1]` per segment. Transformed to `dialogueLineIds: ['dialogue-0', 'dialogue-1']` in segment data. Segments now come with pre-mapped dialogue coverage that persists to DB. | ✅ Implemented |
| 2025-12-12 | Phase 7: Segment Drag-and-Drop Reordering | Reorder timeline segments via drag-and-drop. Added @dnd-kit imports to SceneTimeline.tsx. `DndContext` wraps visual track, `SortableContext` with `horizontalListSortingStrategy`. `handleDragEnd` recalculates `sequenceIndex`, `startTime`, `endTime` for all segments. Handler chain: VisionPage `handleReorderSegments` → ScriptPanel → SceneCard → SceneProductionManager → SceneTimeline. Persists reorder via `applySceneProductionUpdate()`. | ✅ Implemented |
| 2025-12-12 | Phase 6: Dialogue Assignment Persistence | Persist dialogue-to-segment assignments to database. Added `dialogueLineIds: string[]` to SceneSegment type. Handler chain: VisionPage `handleSegmentDialogueAssignmentChange` → ScriptPanel → SceneCard → SceneProductionManager. `handleToggleDialogue` calls parent handler with array of dialogue IDs. `useEffect` on mount initializes `dialogueAssignments` state from persisted `segment.dialogueLineIds`. | ✅ Implemented |
| 2025-12-12 | Phase 5: Keyframe Settings Persistence | Persist keyframe animation settings to database. Wired `onKeyframeChange` prop chain: VisionPage `handleSegmentKeyframeChange` → ScriptPanel → SceneCard → SceneProductionManager. Handler calls `applySceneProductionUpdate()` to persist `segment.keyframeSettings` via PUT `/api/projects/{id}`. Settings now survive page refresh. SceneProductionManager `handleKeyframeChange` updates both local state (for immediate UI) and calls parent handler (for DB persistence). | ✅ Implemented |
| 2025-12-12 | Phase 4: Segment Animation Preview | Real-time preview of keyframe animations. Created SegmentAnimationPreview component with Ken Burns animation applied from custom keyframe settings. Features: play/pause, restart, progress bar with time display, animation settings badges (direction/easing/zoom). "Preview Animation" button in Animation panel of SegmentStudio. Uses segment asset or falls back to scene image. Enables directors to see animation effects before rendering. | ✅ Implemented |
| 2025-12-12 | Phase 3: Keyframe Animation Controls | Per-segment Ken Burns animation customization. Added SegmentKeyframeSettings interface (zoomStart/End, panStart/End X/Y, easingType, direction, useAutoDetect). Animation panel in SegmentStudio with: direction presets (9 options), zoom sliders (0.8x-1.5x), easing buttons. segmentKeyframes state in SceneProductionManager for preview. Added getKenBurnsConfigFromKeyframes() to kenBurns.ts. Enables frame-accurate animation control per visual segment. | ✅ Implemented |
| 2025-12-12 | Phase 2: Dialogue Mapping | Connect dialogue lines to visual segments. Added Dialogue Coverage panel to SegmentStudio (right panel) showing all scene dialogue with character badges. Click to assign/unassign dialogue to selected segment. `dialogueAssignments` state in SceneProductionManager tracks segmentId→Set<dialogueId>. Visual timeline indicators: purple MessageSquare badge with count on segments with assigned dialogue. Enables TTS syncing by mapping spoken lines to specific visual segments. | ✅ Implemented |
| 2025-12-12 | Phase 1: Timeline Editing Controls | Fixed segment CRUD operations: add/delete/resize now functional. Added `handleSegmentResize` in vision page with 8-second max constraint and cascading timeline recalculation. Wired `onVisualClipChange` through SceneProductionManager to SceneTimeline. Added `onSegmentResize` prop chain (VisionPage→ScriptPanel→SceneCard→SceneProductionManager→SceneTimeline). Updated types.ts with `characters[]` and `dialogueLines[]` for Phase 2 dialogue mapping. | ✅ Implemented |
| 2025-12-12 | Enhanced Segment Generation Dialog | Added full-featured SegmentGenerationDialogContent with 3 tabs (Timing/Alignment/Instructions). Timing: target duration 4-8s, focus mode (balanced/dialogue/action/cinematic). Alignment: align-with-narration toggle adds non-dialogue segments for voiceover sync, lead-in segment toggle for establishing shots. Instructions: custom instructions textarea with quick-add presets (reactions/establishing/close-ups). SegmentGenerationOptions interface exported. Both initial and regenerate flows use enhanced dialog. Replaced inline form with "Configure & Generate" button. | ✅ Implemented |
| 2025-12-12 | Scene card video player improvements | Made video player smaller by default (max-w-sm) with expand/collapse control. Added isPlayerExpanded state to SceneTimeline. Removed "(click to collapse)" label. Removed redundant scene title from Call Action section. Changed Segments button icon to Film, label to "Generate". | ✅ Implemented |
| 2025-12-13 | Fix audio Play/Stop button UX | Consolidated audio controls: per-scene button now toggles between Play (green, Volume2 icon) and Stop (red, Square icon). Removed redundant header-level Stop button. Fixed `disabled={isPlaying}` that prevented stop action. Button turns red when playing and calls onStopAudio. ScriptPanel.tsx updated. | ✅ Fixed |
| 2025-12-13 | Multi-instruction scene editing | Scene Edit modal now APPENDS instructions instead of replacing. Buttons show "+ Add" prefix, counter shows "X/5 instructions", Clear All button to reset. Review recommendations also append. Limit of 5 instructions per revision prevents model confusion while reducing iterative API calls. InstructionsPanel and SceneEditorModalV2 updated. | ✅ Implemented |
| 2025-12-13 | Scene Editor Modal V2 | Complete redesign: removed legacy Ask Flow (ineffective), added tabbed left panel (Current Scene/Director Review/Audience Review), added voice input via useSpeechRecognition hook, created new /api/vision/review-scene API for scene-specific reviews with full script context, caches reviews per scene (clears on scene change), responsive layout stacks tabs on mobile | ✅ Implemented |
| 2025-12-11 | Workflow Sync Tracking | Detects stale assets after script edits. Leverages EXISTING workflow status icons (Script/Direction/Frame/Call Action) - turns amber when stale. Direction stores `basedOnContentHash`, Image stores `basedOnDirectionHash`. Staleness banner appears inside tab content with "Regenerate" CTA. See "Workflow Sync Tracking" section in Critical Architecture Patterns. | ✅ Implemented |
| 2025-12-11 | Fix State vs DB persistence bug | Script changes & reference library additions only updated React state, not database. On page refresh, old data loaded from DB. Fixed: handleScriptChange, handleCreateReference, handleRemoveReference, onAddToReferenceLibrary, onAddToSceneLibrary now all save to DB via PUT /api/projects. Added critical pattern to design doc. | ✅ Fixed |
| 2025-12-11 | Enhanced sidebar menu UX | Added collapsible sections with chevron controls, breadcrumb-style workflow with progress indicators, Project Progress section with completion metrics, Credits balance display with "Get More Credits" link, moved Review Scores above Project Stats, Settings link moved to Quick Actions | ✅ Implemented |
| 2025-12-11 | Fix ghost audio fingerprint & playback | Root cause: fingerprint used `sfxAudioUrl` (singular) but SFX stored as `sfxAudio[]` (array) - SFX changes weren't detected. Also `isPlaying: false` reset on fingerprint change broke new audio playback. Fixed: 1) Fingerprint now reads SFX array + includes entry counts (D3/S2), 2) Only clear caches on CHANGE (skip initial mount), 3) Don't reset isPlaying, 4) Added clearCacheForUrls() for targeted invalidation | ✅ Fixed |
| 2025-12-11 | Comprehensive ghost audio fix | Multiple audio sources causing ghost playback: 1) audioDuration.ts now cancels preload with src='', 2) ScriptPanel tracks orphan Audio objects with cleanup on unmount, 3) URL.revokeObjectURL frees blob memory, 4) ScriptPlayer resets isPlaying state on fingerprint change. Centralized audio cleanup prevents orphan HTMLAudioElements | ✅ Fixed |
| 2025-12-11 | UI Style Guide created | Vision page is canonical UI reference. Created `UI_STYLE_GUIDE.md` documenting colors, buttons, cards, panels, typography, spacing, and interactive states to ensure consistency across app | ✅ Implemented |
| 2025-12-17 | Opening Frame UI redesign | Renamed "Scene Prompt Builder" to "Opening Frame", mode tabs to "Visual Setup/Custom Prompt", added Reference Library integration for scene backdrops and props/objects, removed Camera Movement (video-only), pass reference images to API for style-matching | ✅ Implemented |
| 2025-12-11 | Fix ghost audio in Screening Room | Audio fingerprint (hash of all audio URLs) triggers stop() + clearCache() when content changes. Previous fix only cleared cache on script object reference change, missing in-place mutations. Now properly stops active AudioBufferSourceNodes before clearing | ✅ Fixed |
| 2025-12-10 | Calibrated review scoring rubric | Added explicit scoring guidance to analyze-scene and review-script APIs - scores 90+ for minor polish suggestions, 85+ baseline for competent work. LLM was scoring too harshly (low 80s) when recommendations were trivial | ✅ Implemented |
| 2025-12-10 | Review-driven script optimization | Pass full Director/Audience reviews (scores, analysis, strengths, improvements, recommendations) to optimize-script API. Model receives complete review context + full scene content for targeted improvements targeting 85+ scores | ✅ Implemented |
| 2025-12-10 | Parallel TTS for Review Analysis | Split large text into paragraphs, process 3 concurrent requests with eleven_flash_v2_5 model for 3-4x faster audio generation | ✅ Implemented |
| 2025-12-10 | Voice-to-text duplication fix | Fixed useSpeechRecognition to properly track final vs interim results; ScriptEditorModal uses base ref pattern | ✅ Fixed |
| 2025-12-10 | Review Analysis modal enhancements | Revise Script button auto-opens Script Editor with recommendations, TTS playback for review sections, ElevenLabs voice selector | ✅ Implemented |
| 2025-12-10 | Script optimization timeout increase | Increased API timeout from 120s to 300s for large scripts to prevent batching (which loses context) | ✅ Implemented |
| 2025-12-10 | Project Stats & Review Scores enhancement | Centered cards, larger labels, stoplight colors for scores, separate Review Scores section | ✅ Implemented |
| 2025-12-10 | Vision page UI polish | Reference Library sticky header, minimized right panel default, colored Quick Action icons, Project Stats mini dashboard | ✅ Implemented |
| 2025-12-10 | SFX audio timing fix | SFX now plays concurrently with dialogue (starts after narration) instead of sequentially | ✅ Fixed |
| 2025-12-10 | Consolidate review recommendations into Edit Script | Replace redundant Flow Direction tab with Review Insights sourcing from existing Director/Audience reviews | ✅ Implemented |
| 2025-12-10 | Remove /api/analyze-script API | Flow Direction used separate AI analysis; now uses quality Gemini 3 Pro review recommendations instead | ✅ Removed |
| 2025-12-09 | AI Wardrobe Recommend | AI auto-recommends wardrobe based on character profile + screenplay context (genre, tone, setting) | ✅ Implemented |
| 2025-12-09 | AI Wardrobe Assist | User describes desired look in natural language; AI generates specific outfit/accessories for image consistency | ✅ Implemented |
| 2025-12-09 | Gemini 3.0 for script generation | Quality-critical operations use gemini-3.0-pro-preview-06-05 for best screenplay output | ✅ Implemented |
| 2025-12-09 | Script quality assurance utility | Post-processing QA validates character consistency, dialogue attribution, scene continuity with auto-fix | ✅ Implemented |
| 2025-12-09 | Enhanced script prompts | Professional screenwriting guidance: character voice, emotional beats, show-don't-tell, subtext | ✅ Implemented |
| 2024-12-10 | Direction prompt builder | SceneDirectionBuilder with Guided/Advanced modes for editing direction before AI generation | ✅ Implemented |
| 2024-12-10 | Pass characters to direction API | Scene direction was inventing characters; now passes scene.characters array with CRITICAL TALENT RULE | ✅ Fixed |
| 2024-12-10 | Fix dialogue field in direction | Direction API used d.text but script uses d.line; now supports both | ✅ Fixed |
| 2024-12-09 | Storyboard inside scrollable area | Center panel wasn't scrolling; moved storyboard inside flex-1 overflow-y-auto div | ✅ Fixed |
| 2024-12-09 | Storyboard regenerate opens prompt builder | Users need to edit prompts before regenerating; now opens ScenePromptBuilder dialog | ✅ Implemented |
| 2024-12-09 | Add to Scene Reference Library button | Allow adding storyboard frames to scene reference library for consistency | ✅ Implemented |
| 2024-12-09 | Allow in-world signage in image prompts | Previous "no text" directive blocked scene-relevant signage; now blocks only captions/subtitles/watermarks | ✅ Fixed |
| 2024-12-09 | Storyboard close button | Added X button to storyboard header for intuitive closing (was only toggle via Quick Action) | ✅ Implemented |
| 2024-12-09 | Storyboard icon buttons with tooltips | Regenerate, Upload, Download, Add to Library buttons on scene cards with tooltips | ✅ Implemented |
| 2024-12-09 | Ken Burns effect for scene images | Industry-standard cinematic look, no pre-processing needed, works in browser | ✅ Implemented |
| 2024-12-09 | Scene-aware Ken Burns animation | Match animation direction to scene content (action, landscape, portrait) | ✅ Implemented |
| 2024-12-09 | Prompt-based wardrobe (not reference images) | Reference images don't guarantee wardrobe consistency; prompt injection more reliable | ✅ Decided |
| 2024-12-09 | Deprecate AnimaticsStudio component | Redundant with Screening Room (Preview Script); consolidate features | ✅ Removed |
| 2024-12-09 | Single source of truth for scenes | Use `script.script.scenes` everywhere, not separate `scenes` state | ✅ Fixed |
| 2024-12-09 | Narration toggle in Screening Room | Support both screenplay review (with narration) and animatic (without) use cases | ✅ Implemented |
| 2024-12-09 | Cloud Run FFmpeg for video export | Self-hosted FFmpeg on GCP Cloud Run Jobs for MP4 export (replaced Shotstack for 100x cost reduction) | ✅ Implemented |
| 2024-10-29 | Vision replaces Storyboard phase | Unified script and visual development in single workflow | ✅ Implemented |
| 2024-10-15 | Gemini as primary LLM | Cost-effective, quality output, consistent with Google stack | ✅ Implemented |
| 2024-10-01 | Imagen 4 with GCS references | Character consistency via reference images | ✅ Implemented |
| 2025-12-10 | Image editing feature | AI-powered image editing with instruction-based (Gemini), mask-based inpainting, and outpainting to cinematic aspect ratios | ✅ Implemented |
| 2025-12-09 | Wardrobe recommendation accessory filtering | Wardrobe AI now excludes bags, satchels, backpacks for formal/stage/debate scenes; prompt builder instructs AI to only include appropriate accessories for public events | ✅ Implemented |

---

## Critical Architecture Patterns

### 🚨 State vs Database Persistence (CRITICAL BUG PATTERN)

**CRITICAL**: Any state change that should persist across page refreshes MUST save to the database. React state is lost on refresh!

**Symptoms of this bug:**
- Changes work during session, but revert on page refresh
- Data appears correct until deploy/reload
- User loses work unexpectedly

**Affected areas (all fixed as of 2025-12-11):**
- Script changes via ScriptEditorModal
- Reference library additions/removals
- Scene edits via SceneEditorModal

**The pattern:**
```typescript
// ❌ WRONG - State-only, lost on refresh
const handleChange = (data: any) => {
  setState(data)  // Only in-memory, not persisted!
}

// ✅ CORRECT - State + Database persistence
const handleChange = async (data: any) => {
  // 1. Update local state immediately (responsive UI)
  setState(data)
  
  // 2. Save to database (persistence)
  await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metadata: {
        ...existingMetadata,
        visionPhase: {
          ...existingVisionPhase,
          [dataKey]: data  // Persist to metadata.visionPhase
        }
      }
    })
  })
}
```

**Checklist when adding new features:**
- [ ] Does this data need to persist across refreshes?
- [ ] If yes, does the handler save to DB?
- [ ] Is the data loaded from DB on page load?

### State Management: Single Source of Truth

**IMPORTANT**: Scene data must always flow from `script.script.scenes`. Never create separate state that duplicates this data.

```typescript
// ❌ WRONG - Creates sync issues
const [scenes, setScenes] = useState([])
useEffect(() => { setScenes(script?.script?.scenes || []) }, [script])
// Later updates to script.script.scenes won't reflect in `scenes` state

// ✅ CORRECT - Single source of truth
const scenes = script?.script?.scenes || []
// Updates to script automatically flow to scenes
```

**When updating scenes:**
```typescript
// ❌ WRONG - Updates separate state, doesn't persist
setScenes(prev => prev.map(s => s.sceneNumber === num ? {...s, imageUrl} : s))

// ✅ CORRECT - Updates canonical source
setScript(prev => ({
  ...prev,
  script: {
    ...prev.script,
    scenes: prev.script.scenes.map(s => 
      s.sceneNumber === num ? {...s, imageUrl} : s
    )
  }
}))
```

### Component Data Flow

```
Vision Page (src/app/dashboard/workflow/vision/[projectId]/page.tsx)
  ├── script state (canonical source)
  │     └── script.script.scenes[] ← SINGLE SOURCE OF TRUTH
  │
  ├── ScriptPanel (receives scenes from script.script.scenes)
  ├── SceneGallery (receives scenes from script.script.scenes)
  ├── ScreeningRoom/ScriptPlayer (receives scenes from script.script.scenes)
  └── StoryboardRenderer (receives scenes from script.script.scenes)
```

### Workflow Sync Tracking (Asset Staleness Detection)

**Purpose**: Detect when scene assets (Direction, Frame/Image) are out of sync with their source content after script edits.

**Visual Indicators (leverages existing UI):**
The existing workflow status icons on each scene card (Script, Direction, Frame, Call Action) now show:
- 🟢 **Green** = Complete and up-to-date
- 🟡 **Amber** = Complete but STALE (needs regeneration due to upstream changes)
- ⚫ **Gray** = Incomplete/pending
- 🔵 **Blue** = Currently in-progress

**How staleness detection works:**
```
Script → Direction → Frame → Call Action
   │         │          │
   │         │          └── basedOnDirectionHash (stored when Frame generated)
   │         └── basedOnContentHash (stored when Direction generated)
   └── Current content hash computed from narration + dialogue + action
```

When script is edited:
1. `generateSceneContentHash(scene)` produces a new hash
2. Compare against `scene.sceneDirection.basedOnContentHash`
3. If different → Direction shows amber (stale)
4. If Direction changed → compare Frame's `basedOnDirectionHash` → amber if stale

**IMPORTANT - Backward Compatibility:**
- Assets generated BEFORE this feature was deployed have no stored hash
- These assets will NOT show as stale (to avoid overwhelming existing projects)
- Staleness detection only activates for newly generated assets

**Key Files:**
- `src/lib/utils/contentHash.ts` - Hash generation and staleness check utilities
- `src/components/vision/ScriptPanel.tsx` - Workflow status indicator display

**DO NOT:**
- Create separate staleness UI elements - use the existing workflow status icons
- Store hashes in separate location - they belong in the asset's data structure

---

## Deprecated Features & Components

| Component/Feature | Deprecated Date | Replacement | Notes |
|-------------------|-----------------|-------------|-------|
| `AnimaticsStudio.tsx` | 2024-12-09 | Screening Room (ScriptPlayer) | Removed from UI, component file may still exist |
| Separate `scenes` state | 2024-12-09 | `script.script.scenes` | Caused sync bugs |
| `/dashboard/workflow/storyboard` | 2024-10-29 | `/dashboard/workflow/vision` | Legacy route may exist |
| Parallax 2.5D effect | 2024-12-09 | Ken Burns effect | Never implemented; Ken Burns chosen instead |

---

## 1. Executive Summary

SceneFlow AI is an AI-powered video creation platform that helps users transform concepts into scripts, storyboards, and video content. It leverages advanced AI capabilities for script generation, visual storyboarding, character consistency, scene direction, and video production.

### Core Value Propositions

- **AI-Powered Ideation**: Generate compelling concepts from simple prompts
- **Intelligent Scripting**: Convert concepts into production-ready scripts
- **Visual Storyboarding**: Generate scene images with character consistency using reference images
- **Automated Video Generation**: Create professional videos with AI voiceovers and effects
- **Production Workflow**: End-to-end video creation pipeline with collaboration tools

---

## 2. Architecture Overview

### 2.1 Technology Stack

**Frontend:**
- Next.js 15.4.6 (React with App Router)
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Framer Motion (Animations)
- Lucide React (Icons)

**Backend:**
- Next.js API Routes
- Node.js 20
- PostgreSQL (via Sequelize ORM)
- Prisma (Database client)

**AI Services:**
- Google Gemini 3.0 Pro (Script generation - quality-critical)
- Google Gemini 2.0 Flash (General text generation - cost-efficient)
- Google Imagen 3 (Image Generation via Vertex AI)
- Google Veo 2 (Video Generation via Vertex AI)
- ElevenLabs (Voice Synthesis & Sound Effects)

> **V1 Architecture Decision**: SceneFlow uses a consolidated AI stack with Google (Gemini, Imagen 4, Veo 3.1) for all generation capabilities and ElevenLabs for audio. This simplifies operations, ensures consistent quality, and enables accurate credit tracking. All AI usage is metered via a credit-based billing system - users purchase credits and are charged based on actual usage.

---

## 2.2 SceneCredit Currency & Pricing Model

### The "SceneCredit" Currency

| Property | Value |
|----------|-------|
| **Exchange Rate** | $1.00 USD = 100 Credits |
| **Credit Value** | 1 Credit = $0.01 (1 cent) |
| **Purpose** | Granular pricing without fractional dollars |

### Usage Pricing (Credits per Operation)

All pricing targets **40-60% profit margin** based on provider costs.

#### Video Generation (Vertex AI Veo 3.1)

| Operation | Credits/Unit | User Price | Provider Cost | Margin | Notes |
|-----------|--------------|------------|---------------|--------|-------|
| **Veo Fast (1080p)** | 150 credits/8s | $1.50 | ~$0.75 | ~50% | Default for all plans |
| **Veo Quality (4K)** | 250 credits/8s | $2.50 | ~$1.30 | ~48% | Pro/Studio only |
| **Topaz Upscale** | 50 credits/min | $0.50 | ~$0.20 | ~60% | Alternative to 4K native |

> **🛡️ Video Guardrail**: Never discount video generation below **120 credits/8s** (~$1.20). This is the profit floor.

#### Image Generation (Imagen 4)

| Operation | Credits | User Price | Provider Cost | Margin |
|-----------|---------|------------|---------------|--------|
| **Standard Image** | 10 credits | $0.10 | $0.04 | 60% |
| **Scene Reference** | 10 credits | $0.10 | $0.04 | 60% |
| **Frame Generation** | 10 credits | $0.10 | $0.04 | 60% |

#### Intelligence/Scripting (Gemini)

| Operation | Credits | User Price | Notes |
|-----------|---------|------------|-------|
| **Smart Request** | 5 credits | $0.05 | Gemini Flash |
| **Script Analysis** | 10 credits | $0.10 | Gemini Pro |
| **Story Generation** | 25 credits | $0.25 | Full treatment |

#### Voice Synthesis (ElevenLabs)

| Operation | Credits | User Price | Provider Cost | Margin |
|-----------|---------|------------|---------------|--------|
| **Voice Gen** | 80 credits/1k chars | $0.80 | ~$0.35 | ~56% |
| **Voice Preview** | 5 credits | $0.05 | Minimal | High |
| **Voice Clone Setup** | 500 credits | $5.00 | One-time | Varies |

### Subscription Plans

Plans include monthly credits with **expected breakage** (unused credits = 100% profit).

| Plan | Price | Credits | Cost/Credit | Breakage Target | Key Features |
|------|-------|---------|-------------|-----------------|--------------|
| **Trial** | $4.99 (one-time) | 1,500 | $0.0033 | 30% | One-time, credits never expire, 10 GB storage |
| **Starter** | $49/mo | 4,500 | $0.0108 | 25% | 25 GB storage, Veo Fast only |
| **Pro** | $149/mo | 15,000 | $0.0099 | 20% | 500 GB storage, Veo Quality (4K), 3 voice clones |
| **Studio** | $599/mo | 75,000 | $0.0079 | 15% | 2 TB storage, 10 voice clones, white-label |
| **Enterprise** | Custom | 200,000+ | Negotiated | 10% | Dedicated support, API access, SLA |

### Credit Top-Up Packs

| Pack | Price | Credits | Cost/Credit | Daily Limit |
|------|-------|---------|-------------|-------------|
| **Quick Fix** | $25 | 2,000 | $0.0125 | 3/day |
| **Scene Pack** | $60 | 6,000 | $0.01 | 5/day |
| **Feature Boost** | $180 | 20,000 | $0.009 | 10/day |

### Storage Add-ons (Separate Paddle Subscription)

| Add-on | Price/Month | Storage |
|--------|-------------|---------|
| **Extra 25 GB** | $5 | +25 GB |
| **Extra 100 GB** | $15 | +100 GB |
| **Extra 500 GB** | $50 | +500 GB |

### Profit Guardrails

#### 1. Video Generation Floor
- **Guardrail**: Never discount video generation below 120 credits/8s
- **Rationale**: Provider cost is ~$0.75/8s, 120 credits = $1.20 (60% margin floor)

#### 2. Download Bandwidth Tax
- **Guardrail**: 3 free downloads per video file. Charge **5 credits** per download after
- **Rationale**: Vercel bandwidth costs ~$0.15/GB. Prevents abuse from repeat downloads

#### 3. Storage Decay
- **Guardrail**: 30 days free retention. After 30 days, files auto-archive to GCS Coldline
- **Restore Cost**: 50 credits per file to restore from cold storage
- **Rationale**: Long-term storage is expensive. Encourages cleanup or storage add-on purchase

#### 4. Context Window Limits
- **Guardrail**: Intelligence requests capped at 10,000 tokens (~7,500 words)
- **Overage**: 50 credits "Pro Analysis" charge for requests exceeding limit
- **Rationale**: Large Gemini Pro requests are expensive

#### 5. Upscale Queue Premium
- **Guardrail**: Standard upscale is queued. Instant upscale costs **2x credits**
- **Rationale**: Instant processing requires spinning up expensive GPU spot instances

### Production Cost Estimation

**Reference Case: 10-minute video, 10 scenes, ~150 video generations**

| Component | Calculation | Credits |
|-----------|-------------|---------|
| Video (75 clips × 2 takes) | 150 × 150 | 22,500 |
| Images (10 scenes × 4 frames) | 40 × 10 | 400 |
| Voiceover (~5,000 chars) | 5 × 80 | 400 |
| Render/Export | 10 min × 10 | 100 |
| **Total** | | **~23,400 credits** |
| **Recommended Plan** | Pro ($149/mo = 15,000) + Scene Pack ($60 = 6,000) | **$209** |

### Production Strategy Recommendations

| Strategy | Cost | Quality | When to Use |
|----------|------|---------|-------------|
| **Fast Only** | Lowest | 1080p | Drafts, previews, animatics |
| **Fast + Topaz Upscale** | Medium | 4K (upscaled) | **Recommended** - best value for final output |
| **Quality (4K) Native** | Highest | 4K native | Premium productions, close-ups |

> **💡 Recommendation**: Generate with Veo Fast, then upscale with Topaz for 4K output. ~40% cheaper than native 4K with comparable quality for most shots.

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/credits/creditCosts.ts` | Credit costs, plans, top-ups, margins |
| `src/lib/credits/guardrails.ts` | Profit guardrails configuration |
| `src/lib/credits/projectCalculator.ts` | Project cost estimation logic |
| `src/components/credits/ProjectCostCalculator.tsx` | Interactive cost calculator UI |
| `src/services/StorageManagementService.ts` | Storage quota and archive operations |
| `src/app/api/subscription/purchase-trial/route.ts` | Trial purchase flow |
| `src/app/api/webhooks/paddle/route.ts` | Payment webhook handling |

---

**Storage & Infrastructure:**
- Vercel (Hosting & Deployment)
- Azure Blob Storage (Media assets)
- Google Cloud Storage (GCS) (Character reference images)
- PostgreSQL (Neon or Supabase)

### 2.2 Application Structure

```
sceneflow-ai-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Main application routes
│   │   │   ├── projects/       # Project management
│   │   │   ├── studio/         # Project creation studio
│   │   │   └── workflow/       # Workflow steps
│   │   │       ├── ideation/   # Phase 1: Ideation
│   │   │       ├── vision/     # Phase 1: Script & Visual Development (replaced Storyboard)
│   │   │       ├── scene-direction/  # Phase 1: Scene Direction
│   │   │       └── video-generation/ # Phase 2: Video Generation
│   │   └── api/                # API routes
│   ├── components/             # React components
│   │   ├── vision/            # Vision workflow components
│   │   ├── workflow/          # Workflow components
│   │   ├── layout/            # Layout components
│   │   └── ui/                # UI primitives
│   ├── lib/                   # Libraries and utilities
│   │   ├── imagen/            # Image generation logic
│   │   ├── vertexai/         # Vertex AI integration
│   │   ├── character/         # Character management
│   │   └── tts/               # Text-to-speech
│   ├── models/                # Database models
│   ├── services/              # Business logic services
│   │   ├── ai-providers/     # AI provider adapters
│   │   └── DOL/              # Dynamic Optimization Layer
│   ├── store/                 # State management (Zustand)
│   └── types/                  # TypeScript definitions
```

**Note**: The `/dashboard/workflow/storyboard` route may exist for legacy compatibility, but the active workflow uses `/dashboard/workflow/vision` which handles both script and visual storyboarding.

---

## 3. Core Features & Workflows

### 3.1 Main Workflow Steps

The application follows a 6-step workflow:

1. **The Blueprint (Ideation)** — `/dashboard/studio/new-project`
   - Film Treatment generation
   - Character breakdown
   - Beat sheet creation
   - Core concept development

2. **Vision** — `/dashboard/workflow/vision/[projectId]`
   - Script generation from treatment
   - Scene expansion and refinement
   - Character library management
   - Scene image generation with character references
   - Visual storyboarding (previously separate Storyboard phase)

3. **Creation Hub** — `/dashboard/workflow/video-generation`
   - Scene-by-scene direction
   - Camera angles and composition
   - Lighting and mood
   - Technical specifications

4. **Creation Hub (Video Generation)** — `/dashboard/workflow/video-generation`
   - AI video generation (Veo 3.1)
   - Voiceover generation
   - Music and sound effects
   - Video editing capabilities

5. **Polish** — `/dashboard/workflow/generation`
   - Screening room (video playback)
   - Review and feedback
   - Quality assessment

6. **Launchpad** — `/dashboard`
   - Optimization and publishing
   - Final review
   - Export capabilities

### 3.2 Key Features

#### Vision Workflow (`/dashboard/workflow/vision/[projectId]`)

**Script Panel:**
- Display formatted script with scenes
- Scene-by-scene editing
- Dialogue management
- Scene expansion (AI-powered)
- Script review with scoring
- Duration calculation

**Character Library:**
- Character creation and management
- Reference image upload
- Appearance descriptions
- Character generation from images
- Character consistency across scenes

**Scene Gallery:**
- Scene image generation
- Scene Prompt Builder (Guided/Advanced)
- Image regeneration
- Upload custom images
- Grid and timeline views
- Visual storyboarding capabilities

**Screening Room (ScriptPlayer):**
- **Primary Component**: `src/components/vision/ScriptPlayer.tsx`
- **Two Use Cases**:
  1. **Screenplay Review**: Full audio including scene description narration. Great for reviewing and sharing for feedback.
  2. **Animatic Preview**: Narration disabled, dialogue/music/SFX only. Standalone animated storyboard for presentations.
- Ken Burns effect on scene images (scene-aware animation)
- Audio playback (narration, dialogue, music, SFX)
- Narration toggle (on/off)
- Scene-by-scene navigation
- Fullscreen mode
- Export capabilities (MP4 via GCP Cloud Run FFmpeg)

#### Scene Prompt Builder

**Static Frame Filtering (v2.3):**

Scene Direction data contains video-style blocking and action sequences designed for cinematography. Since image generation produces a single frozen frame, the prompt builder automatically filters temporal/sequential instructions:

- `extractStaticPositionFromBlocking()`: Converts video blocking to static positions
  - Removes dialogue cue timing: `on 'I don't want...'` → removed
  - Removes temporal sequences: `until X where Y` → removed  
  - Converts motion verbs: `begins downstage left` → `is downstage left`
  - Strips future actions: `turns to face Alex` → removed

- `extractPrimaryAction()`: Extracts single action from key actions array
  - Takes first action only (still image = one moment)
  - Strips motion adverbs: `fumbles aggressively` → `adjusts`
  - Converts continuous to static: `paces` → `stands`

This ensures users see and edit a clean still-image prompt, not conflicting video choreography.

**Guided Mode:**
- Location & Setting inputs
- Character selection (with reference images)
- Camera & Composition settings
- Art Style selection
- Real-time prompt optimization
- Sanitization indicators (child safety)
- Preview section (original + settings)

**Advanced Mode:**
- Direct prompt editing
- Optimized prompt display
- Preview section (collapsible)
- Sanitization change visibility
- Negative prompt configuration

**Key Capabilities:**
- Automatic prompt sanitization (child safety filters)
- Character reference integration
- Key feature extraction (bald, beard, ethnicity)
- User edit preservation
- Visual change indicators

---

## 4. Data Models

### 4.1 Core Models

**User** (`src/models/User.ts`):
```typescript
{
  id: UUID
  email: string (unique)
  username: string (unique)
  password_hash: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  is_active: boolean
  email_verified: boolean
  credits: number (BigInt, default: 0)
  last_login?: Date
  created_at: Date
  updated_at: Date
}
```

**Project** (`src/models/Project.ts`):
```typescript
{
  id: UUID
  user_id: UUID (FK to users)
  title: string
  description?: string
  genre?: string
  duration?: number (seconds)
  target_audience?: string
  style?: string
  concept?: string
  key_message?: string
  tone?: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  current_step: 'ideation' | 'storyboard' | 'scene-direction' | 'video-generation' | 'completed'
  step_progress: Record<string, number> (JSONB)
  metadata: Record<string, any> (JSONB) // Contains script, scenes, characters, etc.
  created_at: Date
  updated_at: Date
}
```

**Note**: The `current_step` enum still includes 'storyboard' for internal compatibility, but the UI workflow uses 'vision' as the active phase.

**Character** (Stored in Project metadata):
```typescript
{
  id: string
  name: string
  description: string
  appearanceDescription?: string
  referenceImage?: string (HTTPS URL)
  referenceImageGCS?: string (GCS URI for Imagen API)
  ethnicity?: string
  keyFeature?: string (e.g., "bald head", "salt and pepper beard")
  type?: 'character' | 'narrator'
  voiceConfig?: VoiceConfig
}
```

**Scene** (Stored in Project metadata):
```typescript
{
  id?: string
  sceneNumber?: number
  heading?: string
  action?: string
  visualDescription?: string
  narration?: string
  dialogue?: Array<{
    character: string
    text: string
  }>
  music?: string
  sfx?: Array<any>
  imageUrl?: string
  narrationAudioUrl?: string
  duration?: number
  scoreAnalysis?: SceneAnalysis
}
```

### 4.2 Supporting Models

- **AIPricing** — Pricing configurations for AI services
- **CreditLedger** — Credit transaction tracking
- **AIUsage** — AI service usage logging
- **CreditPackage** — Available credit top-up packages
- **APIUsageLog** — API call logging
- **PlatformModel** — AI platform model registry (DOL)
- **PromptTemplate** — AI prompt templates (DOL)
- **FeatureUpdate** — Platform feature tracking (DOL)
- **CollabSession** — Collaboration sessions
- **CollabParticipant** — Session participants
- **CollabScore** — Scoring data
- **CollabComment** — Session comments
- **CollabRecommendation** — AI recommendations
- **CollabChatMessage** — Chat messages

---

## 5. API Architecture

### 5.1 API Route Structure

**Ideation APIs:**
- `/api/ideation/generate` — Generate film treatment
- `/api/ideation/film-treatment` — Film treatment refinement
- `/api/ideation/character-breakdown` — Character analysis
- `/api/ideation/beat-sheet` — Beat sheet generation
- `/api/ideation/core-concept` — Core concept generation

**Vision APIs:**
- `/api/vision/generate-script` — Script generation
- `/api/vision/generate-script-v2` — Enhanced script generation
- `/api/vision/expand-scene` — Scene expansion
- `/api/vision/generate-scenes` — Batch scene generation
- `/api/vision/generate-scene-audio` — Scene audio generation
- `/api/vision/generate-all-audio` — Batch audio generation
- `/api/vision/generate-all-images` — Batch image generation
- `/api/vision/regenerate-scene-image` — Regenerate single scene image
- `/api/vision/analyze-script` — Script analysis
- `/api/vision/review-script` — Script review scoring

**Character APIs:**
- `/api/character/save` — Save character
- `/api/character/upload-reference` — Upload reference image
- `/api/character/generate-image` — Generate character image
- `/api/character/analyze-image` — Analyze uploaded image

**Scene Image APIs:**
- `/api/scene/generate-image` — Generate scene image with character references
- Uses Vertex AI Imagen 4 with GCS reference images

**TTS APIs:**
- `/api/tts/google` — Google TTS
- `/api/tts/google/voices` — List Google voices
- `/api/tts/elevenlabs` — ElevenLabs TTS
- `/api/tts/elevenlabs/voices` — List ElevenLabs voices
- `/api/tts/table-read` — Table read generation

**DOL APIs (Dynamic Optimization Layer):**
- `/api/cue/respond-dol-integrated` — DOL-integrated Cue assistant
- `/api/dol/optimize` — Optimization engine
- `/api/dol/analytics/*` — Analytics endpoints
- `/api/dol/video/generate-integrated` — DOL-integrated video generation
- `/api/dol/monitoring/*` — Monitoring endpoints

**Collaboration APIs:**
- `/api/collab/session/create` — Create collaboration session
- `/api/collab/session/[token]/*` — Session management
- `/api/collab/feedback/*` — Feedback endpoints

### 5.2 Key API Patterns

**Image Generation Flow:**
```
Scene Prompt Builder → /api/scene/generate-image
  ↓
promptOptimizer.optimizePromptForImagen()
  ↓
Sanitization (child terms → adult terms)
  ↓
Character Reference Integration
  ↓
callVertexAIImagen() with GCS references
  ↓
Upload to Blob Storage
  ↓
Return imageUrl
```

**Script Generation Flow:**
```
Film Treatment → /api/vision/generate-script
  ↓
AI Provider (Gemini/OpenAI)
  ↓
Format as Screenplay
  ↓
Parse into Scenes
  ↓
Store in Project metadata
```

---

## 6. AI Integration

### 6.1 AI Providers

**Primary Provider - Google Gemini:**
- Quality Model: `gemini-3-pro-preview` (Script generation, screenplay optimization, script reviews)
- Fast Model: `gemini-2.0-flash` (Analysis, quick tasks)
- Legacy: `gemini-1.5-pro` (Fallback)
- Usage: Script generation, analysis, ideation
- Model Selection: Quality-critical routes (script gen, optimization, reviews) use 3.0 Pro; general routes use 2.0 Flash
- Fallback: OpenAI GPT-4o-mini

**Script Generation Quality Pipeline:**
- Enhanced prompts with character voice profiles, emotional beats, show-don't-tell
- Post-processing QA validation (character consistency, dialogue attribution)
- Auto-fix for common issues (name variations, missing emotion tags)
- QA routes: `/api/generate/script`, `/api/vision/generate-script-v2`, `/api/vision/optimize-script`

**Image Generation - Google Imagen 4:**
- Service: Vertex AI Imagen API
- Features:
  - Character reference images (via GCS URIs)
  - Style control
  - Safety filters (child safety, personGeneration settings)
  - Quality: `max` or `auto`
  - Aspect ratios: 1:1, 9:16, 16:9, 4:3, 3:4

**Video Generation - Google Veo 3.1:**
- Model: `veo-3.1-generate-preview` (via Gemini API)
- Client: `src/lib/gemini/videoClient.ts`
- Features:
  - Text-to-Video (T2V): Generate videos from text prompts
  - Image-to-Video (I2V): Generate videos from starting frame
  - Reference Images: Up to 3 images for style/character consistency
  - Video Extension: Extend Veo-generated videos (2-day retention in Gemini)
  - Frame-to-Video (FTV): Interpolate between first and last frames
  - Aspect ratios: 16:9, 9:16
  - Durations: 4s, 6s, 8s
  - Resolution: 720p, 1080p
- Rate Limits (Paid tier 1): 2 RPM, 10 RPD
- veoVideoRef: Stores Gemini Files API reference for video extension capability

**Text-to-Speech:**
- Google TTS (Primary)
- ElevenLabs (Premium voices)
- Voice library management
- Character voice assignment

### 6.2 Dynamic Optimization Layer (DOL)

The DOL automatically optimizes AI requests across the application:

**Components:**
- **DynamicOptimizationLayer** — Main orchestrator
- **ModelSelector** — Intelligent model selection
- **PromptConstructor** — Optimized prompt generation
- **PlatformAdapter** — Provider-specific logic
- **PerformanceOptimizer** — AI-powered optimization

**Features:**
- Automatic feature detection
- Intelligent model selection
- Cost optimization (20-40% savings)
- Quality scoring and improvement
- Real-time monitoring
- Production health tracking

**Coverage:**
- 100% Intelligence Layer (Cue assistant)
- 100% Video Generation Layer
- Performance analytics
- Template management

---

## 7. State Management

### 7.1 Zustand Stores

**Enhanced Store** (`src/store/enhancedStore.ts`):
```typescript
interface EnhancedAppState {
  // User state
  user: EnhancedUser | null
  isAuthenticated: boolean
  
  // Project state
  currentProject: EnhancedProject | null
  projects: EnhancedProject[]
  
  // Workflow state
  currentStep: WorkflowStep
  stepProgress: Record<WorkflowStep, number>
  
  // AI state
  aiConfiguration: AIConfiguration
  aiCapabilities: AICapability[]
  
  // Core Concept
  coreConcept: {
    title?: string
    premise?: string
    targetAudience?: string
    // ...
  }
  
  // Credit settings
  creditSettings: {
    balance: number
    qualityMode: 'fast' | 'standard'  // Fast = lower cost, Standard = full quality
  }
  
  // UI state
  theme: 'light' | 'dark'
  uiMode: 'guided' | 'advanced'
  sidebarOpen: boolean
  cueAssistantOpen: boolean
}
```

**Workflow Steps:**
```typescript
type WorkflowStep = 
  | 'ideation' 
  | 'storyboard'  // Internal name, UI uses 'vision'
  | 'scene-direction' 
  | 'video-generation' 
  | 'review' 
  | 'optimization'
```

**Note**: The internal `WorkflowStep` type still includes 'storyboard' for backward compatibility with stored data, but the user-facing workflow uses 'vision' as the active phase that handles both script and visual storyboarding.

---

## 8. User Interface Design

### 8.1 Layout Structure

**Main Layout:**
- Sidebar navigation (collapsible)
- Context bar (workflow progress)
- Main content area
- Cue Assistant (slide-out panel)

**Sidebar Navigation:**
- Dashboard
- Projects
- Start Project
- Workflow Steps:
  - The Blueprint (Ideation)
  - Vision (Script & Visual Development)
  - Creation Hub
  - Creation Hub (Video Generation)
  - Polish (Screening & Editing)
  - Launchpad (Optimization & Publishing)

### 8.2 Key UI Components

**Scene Prompt Builder:**
- Modal dialog (max-w-4xl)
- Tabbed interface (Guided/Advanced)
- Real-time optimization
- Visual sanitization indicators
- Preview section (collapsible)

**Script Panel:**
- Scene list with cards
- Scene editor modal
- Dialogue editing
- Scene expansion controls
- Score display

**Script Editor Modal (Edit Script):**
- **Your Direction tab** — Manual optimization with instruction templates and custom directions
- **Review Insights tab** — AI-powered recommendations sourced from Director/Audience script reviews
  - Consolidates high-quality Gemini 3 Pro review analysis into actionable recommendations
  - Replaces redundant "Flow Direction" AI analysis (removed `/api/analyze-script`)
  - Director recommendations marked as High Priority (craft/execution focus)
  - Audience recommendations marked as Medium Priority (viewer experience focus)
  - Selectable checkbox UI with source filtering (Director/Audience)
  - Empty state when reviews not yet generated (prompts user to run reviews)
  - Generate Preview applies selected recommendations to optimize script

**Character Library:**
- Character cards with reference images
- Upload interface
- Generation from image
- Appearance editor

**Scene Gallery:**
- Grid view / Timeline view
- Scene cards with images
- Regeneration controls
- Prompt builder integration
- Visual storyboarding interface

**Quick Actions Menu (Vision Sidebar):**
- Bookmark navigation (Go to Scene X)
- Scene Gallery toggle (Open/Close)
- Screening Room launcher
- Update Review Scores (regenerate reviews)
- **Review Analysis** — Opens ScriptReviewModal with Director/Audience analysis
  - Visual indicator (amber accent) when reviews are outdated
  - Disabled until reviews exist
  - Shows detailed scoring breakdown, strengths, improvements, recommendations

---

## 9. Security & Authentication

### 9.1 Authentication

- NextAuth.js integration
- Email/password authentication
- Session management
- Email verification

**API Routes:**
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/logout`
- `/api/auth/profile`
- `/api/auth/verify`

### 9.2 Credit-Based Billing System

SceneFlow uses a credit-based system for all AI generation:

**Subscription Plans:**

| Feature | Starter | Pro | Studio |
|---------|---------|-----|--------|
| **Monthly Credits** | 500 | 2,000 | 10,000 |
| **Storage** | 5 GB | 25 GB | 100 GB |
| **AI Models** | Gemini + Veo 3.1 | Gemini + Veo 3.1 | Gemini + Veo 3.1 |
| **Quality Mode** | Fast | Fast + Standard | Fast + Standard |
| **Collaboration** | — | ✓ | ✓ |
| **Support** | Community | Email | Priority |

**Credit Usage by Project Type:**

| Project Type | Credits | What You Get |
|--------------|---------|---------------|
| Short Film Animatic (5-10 min) | ~150 | Full script, 10-15 scenes, images, TTS audio |
| Feature Treatment (90+ min) | ~800 | Full treatment, 40+ scenes, images, TTS audio |
| Music Video Concept (3-5 min) | ~75 | Script, 5-8 scenes, stylized images |
| Commercial Storyboard (30-60 sec) | ~40 | Script, 4-6 scenes, images |

**Credit Costs by Operation:**

| Operation | Fast Mode | Standard Mode |
|-----------|-----------|---------------|
| Script Generation (per scene) | 2 | 5 |
| Image Generation (Imagen 4) | 3 | 5 |
| Video Generation (Veo 3.1, per 8s) | 15 | 25 |
| TTS Audio (per minute) | 1 | 2 |
| MP4 Export (per minute) | 1 | 1 |

**Add-On Credit Packages (Top Up):**

| Package | Credits | Price | Best For |
|---------|---------|-------|----------|
| Boost | 200 | $9 | Quick top-up |
| Creator | 500 | $19 | Single project |
| Producer | 1,500 | $49 | Multiple projects |
| Studio | 5,000 | $149 | Heavy production |

**Quality Modes:**
- **Fast Mode**: Lower credit cost, uses optimized model settings for quick iteration
- **Standard Mode**: Full quality, uses maximum model capabilities for final output

> **Note**: Resolution is user-selectable for video/image generation. Higher resolutions cost more credits.

---

## 10. Deployment & Infrastructure

### 10.1 Hosting

- Platform: Vercel
- Deployment: Git integration (automatic)
- Environment: Production & Development configs

### 10.2 Storage

**Media Assets:**
- Azure Blob Storage (images, videos, audio)
- GCS (character reference images for Imagen API)

**Database:**
- PostgreSQL (Neon/Supabase)
- Sequelize ORM
- JSONB fields for flexible metadata

### 10.3 Environment Variables

Required environment variables:
```bash
# Database
POSTGRES_URL=postgresql://...

# AI Providers
GOOGLE_API_KEY=...
GEMINI_API_KEY=...
OPENAI_API_KEY=...

# Storage
AZURE_STORAGE_CONNECTION_STRING=...
BLOB_STORAGE_CONTAINER=...

# Content Moderation (Hive AI)
HIVE_AI_ACCESS_KEY_ID=...
HIVE_AI_SECRET_KEY=...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# Stripe (Payments)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

---

## 11. Current Implementation Status

### 11.1 Completed Features

✅ Ideation & Script Generation  
✅ Vision Workflow (Script & Visual Development - replaces Storyboard)  
✅ Scene Expansion & Refinement  
✅ Character Library with Reference Images  
✅ Scene Image Generation (Imagen 4)  
✅ Character Reference Integration  
✅ Prompt Optimization & Sanitization  
✅ Scene Prompt Builder (Guided/Advanced)  
✅ Script Review & Scoring  
✅ Audio Generation (TTS)  
✅ Screening Room (Video Playback)  
✅ DOL (Dynamic Optimization Layer)  
✅ Collaboration Features  
✅ Credit-Based Billing  
✅ Admin Dashboard

### 11.2 Key Technical Achievements

- **Character Consistency**: Reference images maintain character appearance across scenes
- **Prompt Sanitization**: Automatic child safety filter compliance
- **Real-time Optimization**: DOL optimizes every AI request
- **Flexible Metadata**: JSONB storage for project data
- **Multi-provider Support**: Gemini, OpenAI, ElevenLabs with fallbacks
- **Unified Vision Workflow**: Combined script and visual storyboarding in single phase

---

## 12. Future Enhancements

### Phase 1: Core Functionality (Current)
- ✅ Ideation & Scripting
- ✅ Vision (Script & Visual Development - combined workflow)
- ✅ Character Management
- ✅ Scene Direction

### Phase 2: Video Generation (In Progress)
- Video generation (Veo 3.1)
- Advanced editing capabilities
- Music generation
- Sound effects library

### Phase 3: Collaboration (Partial)
- ✅ Collaboration sessions
- Enhanced feedback system
- Real-time collaboration
- Version control

### Phase 4: Optimization & Analytics
- Advanced analytics dashboard
- A/B testing for prompts
- Quality scoring improvements
- Cost optimization insights

### Phase 5: Advanced Features
- AI Agent workflows
- Template libraries
- Style presets
- Export to professional formats

---

## 12.1 Cloud Run FFmpeg Video Export

**Status**: ✅ Implemented (December 2025)

**Purpose**: Export Screening Room animatics as MP4 video files using self-hosted FFmpeg on GCP Cloud Run Jobs.

**Cost Advantage**: ~$0.002/minute vs Shotstack $0.25/minute = **125x savings**

**Architecture**:
```
SceneFlow Data → Job Spec JSON → GCS → Cloud Run Job → FFmpeg → GCS → MP4 Download
```

**Components**:
| Component | Location | Purpose |
|-----------|----------|----------|
| Docker Container | `/docker/ffmpeg-renderer/` | FFmpeg 6.0 + Python render script |
| GCS Storage | `RenderStorage` class | Job specs and rendered outputs |
| Cloud Run Jobs | `CloudRunJobsService` | Async job execution (24h timeout) |
| RenderJob Model | `/models/RenderJob.ts` | Database tracking of job status |
| Callback Route | `/api/export/render-callback` | Status updates from container |

**Data Mapping**:
| SceneFlow | FFmpeg |
|-----------|----------|
| `scene.imageUrl` | Input image for segment |
| `scene.duration` | Segment duration in seconds |
| Ken Burns settings | `zoompan` filter with start/end zoom |
| Audio URLs | Mixed audio track via `amix` filter |

**Ken Burns → FFmpeg Filter**:
```
zoompan=z='1.0+(1.15-1.0)*on/24*{duration}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=24*{duration}:s={width}x{height}:fps=24
```

**API Routes**:
- `POST /api/export/screening-room` — Build job spec, upload to GCS, trigger Cloud Run Job
- `GET /api/export/video/status/[renderId]` — Poll RenderJob table for status
- `POST /api/export/render-callback` — Receive status updates from Cloud Run container

**User Flow**:
1. User clicks "Export MP4" in Screening Room
2. System builds RenderJobSpec from scene data
3. Job spec uploaded to GCS bucket
4. Cloud Run Job triggered with job ID
5. Container downloads assets, runs FFmpeg, uploads output
6. Container calls callback API to update database
7. Frontend polls status until complete
8. User downloads MP4 from signed GCS URL

**Options**:
- Language selection (13 languages supported)
- Resolution: SD (480p), HD (720p), FHD (1080p)
- Frame rate: 24 fps (cinematic standard)

**Environment Variables Required**:
```
GCS_RENDER_BUCKET=sceneflow-render-jobs
CLOUD_RUN_JOB_NAME=ffmpeg-render-job
CLOUD_RUN_REGION=us-central1
GCP_PROJECT_ID=your-project-id
RENDER_CALLBACK_API_KEY=your-secret-key  # Optional
```

---

## 12.2 Ken Burns Effect Implementation

**Status**: ✅ Implemented (December 2024)

**Location**: `src/lib/animation/kenBurns.ts`

**Scene-Aware Animation**:
The Ken Burns effect analyzes scene content to choose appropriate animation:

```typescript
function getSceneAwareKenBurns(scene: Scene): KenBurnsConfig {
  const visualDescription = scene.visualDescription?.toLowerCase() || ''
  const heading = scene.heading?.toLowerCase() || ''
  
  // Action scenes: zoom out to show movement
  if (hasActionKeywords(visualDescription)) return { direction: 'out', scale: 1.15 }
  
  // Landscapes/establishing: pan based on orientation
  if (hasLandscapeKeywords(heading)) return { direction: 'right', scale: 1.1 }
  
  // Close-ups/portraits: slow zoom in
  if (hasPortraitKeywords(visualDescription)) return { direction: 'in', scale: 1.08 }
  
  // Default: gentle zoom in
  return { direction: 'in', scale: 1.1 }
}
```

**CSS Implementation** (in ScriptPlayer):
```css
@keyframes kenburns-in {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}
```

---

## 12.3 Image Editing Feature

**Status**: ✅ Implemented (December 2025)

**Purpose**: Enable AI-powered image editing for scene frames, character portraits, and objects to fix consistency issues before video generation.

**Key Files**:
- API Route: `src/app/api/image/edit/route.ts`
- Edit Client: `src/lib/imagen/editClient.ts`
- Mask Editor: `src/components/vision/ImageMaskEditor.tsx`
- Edit Modal: `src/components/vision/ImageEditModal.tsx`

### Three Editing Modes

All modes use **Gemini 3 Pro Image Preview** via REST API with `GEMINI_API_KEY`:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Quick Edit** | Natural language instruction editing | "Change the suit to a tuxedo" |
| **Precise Edit** | Mask-based editing for specific regions | Remove artifacts, fix details |
| **Outpaint** | Expand image to new aspect ratio | Convert 1:1 to 16:9 cinematic |

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Provider | Gemini REST API (GEMINI_API_KEY) | No GCP setup required, simpler authentication |
| Mask storage | On-the-fly (not stored) | Reduces storage costs, masks are one-time use |
| Edit history | Before/after preview | Users compare before saving, no need for full history |
| Aspect ratios | Preset cinematic ratios | 16:9, 21:9, 1:1 for film workflow, no custom dimensions |
| Subject reference | Optional identity lock | Maintains character identity across edits |

### Outpaint Aspect Ratio Presets

```typescript
const ASPECT_RATIO_PRESETS = {
  '16:9': { label: 'HD Widescreen', description: 'Standard cinematic (1920×1080)' },
  '21:9': { label: 'Ultra-Wide', description: 'Anamorphic cinema (2560×1080)' },
  '1:1':  { label: 'Square', description: 'Social media (1080×1080)' },
  '9:16': { label: 'Portrait', description: 'Vertical/mobile (1080×1920)' },
  '4:3':  { label: 'Classic', description: 'Traditional TV (1440×1080)' },
  '3:4':  { label: 'Portrait Classic', description: 'Vertical classic (1080×1440)' }
}
```

### API Usage

```typescript
// Quick Edit (instruction-based)
POST /api/image/edit
{
  "mode": "instruction",
  "sourceImage": "https://...",
  "instruction": "Change the background to a sunset"
}

// Precise Edit (mask-based inpainting)
POST /api/image/edit
{
  "mode": "inpaint",
  "sourceImage": "https://...",
  "maskImage": "data:image/png;base64,...",
  "prompt": "A clear blue sky"
}

// Outpaint (aspect ratio expansion)
POST /api/image/edit
{
  "mode": "outpaint",
  "sourceImage": "https://...",
  "targetAspectRatio": "16:9",
  "prompt": "Modern office interior with large windows"
}
```

---

## 13. Development Guidelines

### 13.1 Code Organization

- Components: Feature-based organization (`vision/`, `workflow/`, etc.)
- Services: Business logic separation
- Models: Database model definitions
- Types: TypeScript interfaces and types
- Utils: Shared utilities

### 13.2 Naming Conventions

- Components: PascalCase (`ScenePromptBuilder.tsx`)
- Functions: camelCase (`optimizePromptForImagen`)
- API Routes: kebab-case (`generate-scene-image`)
- Database: snake_case (`user_id`, `created_at`)

### 13.3 Best Practices

- Type safety: TypeScript throughout
- Error handling: Try-catch with user-friendly messages
- Loading states: Clear loading indicators
- Optimistic updates: Immediate UI feedback
- State management: Zustand for global state
- API calls: Centralized error handling

---

## 14. Known Limitations & Considerations

### 14.1 Current Limitations

1. **Scene Description Dependency**
   - Prompt optimization uses scene description as source
   - Editing requires updating script (works but not obvious)

2. **Character Feature Extraction**
   - Features extracted from `appearanceDescription`
   - May miss features not explicitly stated

3. **Credit-Based Video Generation**
   - Video generation uses platform-hosted Veo 3.1
   - Credits charged based on duration and quality mode

4. **Legacy Route Compatibility**
   - `/dashboard/workflow/storyboard` route may exist for legacy support
   - Active workflow uses `/dashboard/workflow/vision`
   - Internal types may still reference 'storyboard' for data compatibility

### 14.2 Technical Considerations

- Image generation latency: 10-15 seconds per image
- API rate limits: Provider-specific limits
- Cost management: Credit system for platform usage
- Storage costs: Media asset storage costs scale with usage

---

## 15. Support & Documentation

### 15.1 Internal Documentation

- Component documentation in code
- API route comments
- Service method documentation
- Plan files (`.plan.md` files)

### 15.2 Key Design Documents

- Scene Prompt Builder Design (this document section)
- DOL Architecture (DOL_ACHIEVEMENT_SUMMARY.md)
- Image Generation Integration (IMAGE_GENERATION_INTEGRATION.md)
- Production Deployment Guide

---

## Appendix: Key File Locations

**Core Components:**
- Scene Prompt Builder: `src/components/vision/ScenePromptBuilder.tsx`
- Script Panel: `src/components/vision/ScriptPanel.tsx`
- Character Library: `src/components/vision/CharacterLibrary.tsx`
- Scene Gallery: `src/components/vision/SceneGallery.tsx`
- Screening Room Player: `src/components/vision/ScriptPlayer.tsx`
- Playback Controls: `src/components/vision/PlaybackControls.tsx`

**Animation:**
- Ken Burns Effect: `src/lib/animation/kenBurns.ts`

**Services:**
- Prompt Optimizer: `src/lib/imagen/promptOptimizer.ts`
- Vertex AI Client: `src/lib/vertexai/client.ts`
- Character Matching: `src/lib/character/matching.ts`
- Creatomate Render: `src/services/CreatomateRenderService.ts`
- Content Hash (Workflow Sync): `src/lib/utils/contentHash.ts`
- Intelligent Method Selection: `src/lib/vision/intelligentMethodSelection.ts`
- Reference Builder: `src/lib/vision/referenceBuilder.ts`
- Veo Video Client: `src/lib/gemini/videoClient.ts`

**API Routes:**
- Scene Image Generation: `src/app/api/scene/generate-image/route.ts`
- Segment Asset Generation: `src/app/api/segments/[segmentId]/generate-asset/route.ts`
- Vision Script: `src/app/api/vision/generate-script-v2/route.ts`
- Character Save: `src/app/api/character/save/route.ts`
- Batch Audio: `src/app/api/vision/generate-all-audio/route.ts`
- Batch Images: `src/app/api/vision/generate-all-images/route.ts`

**State Management:**
- Enhanced Store: `src/store/enhancedStore.ts`
- Workflow State: `src/workflow/stateMachine.ts`

**Workflow Pages:**
- Vision: `src/app/dashboard/workflow/vision/[projectId]/page.tsx`
- Scene Direction: `src/app/dashboard/workflow/scene-direction/page.tsx`
- Video Generation: `src/app/dashboard/workflow/video-generation/page.tsx`

**Report Renderers:**
- Script Renderer: `src/components/reports/renderers/ScriptRenderer.tsx`
- Storyboard Renderer: `src/components/reports/renderers/StoryboardRenderer.tsx`

---

**Document Version**: 2.3  
**Last Updated**: December 11, 2025  
**Maintained By**: SceneFlow AI Development Team

---

*Note: This document reflects Vision as the unified workflow phase that replaced the separate Storyboard phase. Vision handles both script development and visual storyboarding in a single integrated interface. The Screening Room serves dual purposes: screenplay review (with narration) and animatic preview (without narration).*

