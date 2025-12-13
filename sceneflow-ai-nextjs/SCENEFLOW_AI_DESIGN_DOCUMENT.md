# SceneFlow AI - Application Design Document

**Version**: 2.9  
**Last Updated**: December 14, 2025  
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
2. **Update `script` state, not `scenes`** - When modifying scene data
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
| 2025-12-14 | Intelligent Segment Method Selection | **AUTO method selection for Veo video generation**. New service analyzes segment context (position, references, shot type, dialogue) to select optimal method: 1) First segment + scene image → I2V (precise control), 2) First segment + character refs → REF (consistency), 3) Close-up + dialogue + previous video → EXT (seamless continuation), 4) Shot type change → REF (creative freedom). Added scene image warning in Call Action tab - soft requirement encourages generating scene image before video for consistency. Files: `src/lib/vision/intelligentMethodSelection.ts`, `src/lib/vision/referenceBuilder.ts`, `generate-asset/route.ts`, `ScriptPanel.tsx`. | ✅ Implemented |
| 2025-12-14 | Fix: referenceImages is T2V only | **BUG FIX**: referenceImages cannot be combined with startFrame (I2V). Per Veo 3.1 API spec, these are mutually exclusive: 1) `referenceImages` = T2V mode with style/character guidance, 2) `image` (startFrame) = I2V mode to animate a frame. Fixed generate-asset route to NOT add startFrame when using REF method. Added safety check in videoClient.ts to warn and skip referenceImages if startFrame is present. | ✅ Fixed |
| 2025-12-14 | Veo 3.1 Migration for Video Generation | **Upgraded from Veo 3.0 to Veo 3.1** (`veo-3.1-generate-preview`). Veo 3.0 does NOT support referenceImages (character/style consistency), video extension, or frame-to-video (FTV) features. Veo 3.1 enables: 1) Up to 3 referenceImages per request (type: 'style' or 'character'), 2) Video extension for Veo-generated videos within 2-day retention window, 3) First+last frame interpolation. Added `veoVideoRef` field to store Gemini Files API reference for future extension. EXT mode falls back to I2V with last frame since external videos (Vercel Blob) cannot use native extension. Rate limits: 2 RPM, 10 RPD (Paid tier 1). File: `src/lib/gemini/videoClient.ts`. | ✅ Implemented |
| 2025-12-14 | Establishing Shot Refactor: Manual Add + Style Selector | **Refactored from automatic to manual approach**. Bug fix: Original implementation mixed Gemini dialogue prompts with establishing shot segments. Now: 1) "Add Establishing Shot" button in SceneTimeline inserts segment at position 0 with scene image, 2) Style selector in SegmentStudio offers 3 options: **Scale Switch** (Ken Burns zoom 1.0→1.3, cinematic), **Living Painting** (ambient motion, static camera), **B-Roll Cutaway** (pan with detail shots). Removed: EstablishingShotSection from dialog, automatic generation in API. Added: `handleAddEstablishingShot`, `handleEstablishingShotStyleChange` handlers. Files: `page.tsx`, `SceneTimeline.tsx`, `SegmentStudio.tsx`, `SceneProductionManager.tsx`, `generate-segments/route.ts`. | ✅ Refactored |
| 2025-12-13 | Establishing Shot Feature (v1 - SUPERSEDED) | Initial implementation with dialog-based approach. Superseded by 2025-12-14 refactor due to prompt contamination bug. | ⚠️ Superseded |
| 2025-12-13 | Service Worker caching: NetworkFirst for JS/CSS | Changed `StaleWhileRevalidate` → `NetworkFirst` for JS and CSS bundles in `next.config.js`. StaleWhileRevalidate was causing users to see stale UI (e.g., old labels) after deployments because cached JS served first. NetworkFirst ensures fresh bundles load immediately, with 3s timeout fallback to cache for slow networks. Also updated Next.js data files to NetworkFirst. | ✅ Fixed |
| 2025-12-13 | UI Terminology: Virtual Production & The Soundstage | Renamed workflow phase "Production" → "Virtual Production" (industry term from The Mandalorian, etc.). Renamed script panel "Scene Studio" → "The Soundstage". See Terminology Mapping section below for code-to-UI mappings. Updated: `Sidebar.tsx`, `workflowSteps.ts`, `page.tsx` (ContextBar), `ScriptPanel.tsx`, `NavigationWarningDialog.tsx`. | ✅ Implemented |
| 2025-12-13 | Image Edit in Call Action step | Added image editing capability to the Call Action (SceneProductionManager) workflow step, reusing the same ImageEditModal from Frame step. Added `onEditImage` prop to SceneProductionManager → SegmentStudio. Edit button (Pencil icon) appears on segment image previews. Enables AI-powered editing of segment keyframe images without duplicating code. Routes: `/api/image/edit`. | ✅ Implemented |
| 2025-12-13 | Workflow Mark as Done feature | Added manual completion override for workflow steps. Users can mark any step (Script/Direction/Frame/Call Action) as complete via "Mark Done" toggle button in tab header. Uses `scene.workflowCompletions` object for persistence. Enables users to proceed with workflow when automatic detection doesn't match their intent. Button shows checkmark when marked complete. | ✅ Implemented |
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
| 2025-12-11 | Enhanced sidebar menu UX | Added collapsible sections with chevron controls, breadcrumb-style workflow with progress indicators, Project Progress section with completion metrics, Credits balance display with "Get More Credits" link, moved Review Scores above Project Stats, Settings link moved to Quick Actions, deprecated BYOK settings link removed | ✅ Implemented |
| 2025-12-11 | Fix ghost audio fingerprint & playback | Root cause: fingerprint used `sfxAudioUrl` (singular) but SFX stored as `sfxAudio[]` (array) - SFX changes weren't detected. Also `isPlaying: false` reset on fingerprint change broke new audio playback. Fixed: 1) Fingerprint now reads SFX array + includes entry counts (D3/S2), 2) Only clear caches on CHANGE (skip initial mount), 3) Don't reset isPlaying, 4) Added clearCacheForUrls() for targeted invalidation | ✅ Fixed |
| 2025-12-11 | Comprehensive ghost audio fix | Multiple audio sources causing ghost playback: 1) audioDuration.ts now cancels preload with src='', 2) ScriptPanel tracks orphan Audio objects with cleanup on unmount, 3) URL.revokeObjectURL frees blob memory, 4) ScriptPlayer resets isPlaying state on fingerprint change. Centralized audio cleanup prevents orphan HTMLAudioElements | ✅ Fixed |
| 2025-12-11 | UI Style Guide created | Vision page is canonical UI reference. Created `UI_STYLE_GUIDE.md` documenting colors, buttons, cards, panels, typography, spacing, and interactive states to ensure consistency across app | ✅ Implemented |
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
| 2024-12-09 | Shotstack for video export | Planned integration for MP4 export from animatics | 🔜 Planned |
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

> **V1 Architecture Decision**: SceneFlow uses a consolidated AI stack with Google (Gemini, Imagen, Veo) for all generation capabilities and ElevenLabs for audio. This simplifies operations, ensures consistent quality, and enables accurate credit tracking. No BYOK (Bring Your Own Key) - all users share the platform's API allocation.

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
   - AI video generation (BYOK required)
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
- Export capabilities (MP4 via Shotstack - planned)

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
- **UserProviderConfig** — BYOK provider configurations
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
  
  // BYOK settings
  byokSettings: {
    llmProvider: { name, apiKey, isConfigured }
    imageGenerationProvider: { name, apiKey, isConfigured }
    videoGenerationProvider: { name, apiKey, isConfigured }
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

### 9.2 BYOK (Bring Your Own Key)

Users can configure their own API keys for:
- LLM Provider (Gemini, OpenAI, Anthropic)
- Image Generation (Gemini, OpenAI, Anthropic)
- Video Generation (Google Veo, Runway, Stability AI)

Encrypted storage in `UserProviderConfig` model.

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

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# BYOK Encryption
ENCRYPTION_KEY=...
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
✅ BYOK Support  
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
- Video generation with BYOK
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

## 12.1 Planned Feature: Shotstack MP4 Export

**Status**: Planned for Final Cut workflow

**Purpose**: Export Screening Room animatics as MP4 video files.

**Integration Approach**:
```
SceneFlow Data → Shotstack Edit JSON → Shotstack Render API → MP4 Download
```

**Data Mapping**:
| SceneFlow | Shotstack |
|-----------|-----------|
| `scene.imageUrl` | `clip.asset.src` |
| `scene.duration` | `clip.length` |
| `scene.startTime` | `clip.start` |
| Ken Burns direction | `clip.effect` (zoomIn, panLeft, etc.) |
| Audio URLs | Audio track clips |

**Ken Burns → Shotstack Effect Mapping**:
| SceneFlow Direction | Shotstack Effect |
|---------------------|------------------|
| `in` | `zoomIn` |
| `out` | `zoomOut` |
| `left` | `panLeft` |
| `right` | `panRight` |
| `up-left` | `panLeft` + `zoomIn` |
| `up-right` | `panRight` + `zoomIn` |

**API Routes (Planned)**:
- `/api/export/animatic` — Generate Shotstack edit and submit render
- `/api/export/animatic/[renderId]` — Poll render status, return download URL

**User Flow**:
1. User clicks "Export MP4" in Screening Room
2. System builds Shotstack Edit JSON from scene data
3. Submit to Shotstack API
4. Poll for completion
5. Return download URL

**Options**:
- Include/exclude narration audio
- Resolution (HD, 4K)
- Frame rate (24, 30 fps)

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

3. **BYOK Required for Video**
   - Video generation requires user API keys
   - No platform-hosted video generation option

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

