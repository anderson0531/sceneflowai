# Scene Render Workflow Implementation Plan

> **Status:** Ready for implementation after Director's Console is stable  
> **Priority:** High - Core production workflow  
> **Estimated Effort:** 3-4 days

---

## Overview

Pre-composite each scene as a single MP4 with baked-in audio before entering Final Cut. This simplifies the NLE workflow and prevents accidental sync drift.

### Current Flow (Complex)
```
Final Cut receives:
- Individual video segments (4-8 per scene)
- Separate narration track
- Separate dialogue tracks (per character)
- Separate music track
- Separate SFX tracks
→ User must align everything manually
```

### New Flow (Simplified)
```
Final Cut receives:
- Pre-rendered Scene MP4 (video + mixed audio)
- Per-language variants if dubbed
→ User focuses on scene ordering, transitions, titles
```

---

## Production Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION PHASE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  Director's  │───▶│   Audio      │───▶│   Scene      │              │
│  │  Console     │    │   Alignment  │    │   Render     │              │
│  │              │    │              │    │              │              │
│  │ • Print/Retake    │ • Timeline   │    │ • Stitch MP4 │              │
│  │ • Segment QC │    │ • Mix levels │    │ • Mix audio  │              │
│  │ • Batch render    │ • Preview    │    │ • Per-language│             │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                 │                        │
│                                                 ▼                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      FINAL CUT PHASE                              │  │
│  │                                                                    │  │
│  │  Scene-Level Timeline (Pre-composited MP4s)                       │  │
│  │  ┌─────────┬─────────┬─────────┬─────────┬─────────┐             │  │
│  │  │Scene 1  │Scene 2  │Scene 3  │Scene 4  │Scene 5  │             │  │
│  │  │ 🇺🇸 EN  │ 🇺🇸 EN  │ 🇺🇸 EN  │ 🇺🇸 EN  │ 🇺🇸 EN  │             │  │
│  │  └─────────┴─────────┴─────────┴─────────┴─────────┘             │  │
│  │                                                                    │  │
│  │  User Controls:                                                    │  │
│  │  ✓ Reorder scenes          ✓ Add title cards                     │  │
│  │  ✓ Trim head/tail          ✓ Add watermarks                      │  │
│  │  ✓ Cross-scene transitions ✓ Adjust scene audio levels           │  │
│  │  ✓ Switch language track   ✓ Export final film                   │  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## User Experience

### Production Phase (Scene Timeline)

1. **All segments marked "Print"** in Director's Console
2. **Audio aligned** on Scene Timeline (narration, dialogue, music, SFX)
3. **Click "Render Scene"** button in timeline header
4. **Configure render options:**
   - Languages to render (EN, ES, FR, etc.)
   - Resolution (720p / 1080p / 4K)
   - Audio mix levels (narration, dialogue, music, SFX volumes)
5. **Scene renders** via Cloud Run FFmpeg
6. **Scene card shows status:** 🔴 Not rendered → 🟡 Stale → 🟢 Ready

### Final Cut Phase (Simplified)

- Drag/drop scene cards to reorder
- Trim head/tail (0-2s) for pacing
- Adjust scene-level volume (post-render)
- Switch language track per scene
- Add cross-scene transitions (cut, dissolve, fade)
- Insert title cards, watermarks, end credits
- Export final film

---

## Data Model

### SceneRender (New)

```typescript
interface SceneRender {
  sceneId: string
  status: 'pending' | 'rendering' | 'complete' | 'failed' | 'stale'
  primaryLanguage: string
  languages: LanguageRender[]
  resolution: '720p' | '1080p' | '4k'
  sourceHash: string           // MD5 of segments + audio config
  createdAt: string
  errorMessage?: string
}

interface LanguageRender {
  languageCode: string         // 'en', 'es', 'fr'
  languageLabel: string        // 'English', 'Spanish'
  mp4Url: string               // Blob storage URL
  duration: number             // Total scene duration
  renderedAt: string
}
```

### AudioMixConfig

```typescript
interface AudioMixConfig {
  narrationVolume: number      // 0-1, default 1.0
  dialogueVolume: number       // 0-1, default 1.0
  musicVolume: number          // 0-1, default 0.3
  sfxVolume: number            // 0-1, default 0.7
  includeNarration: boolean
  includeDialogue: boolean
  includeMusic: boolean
  includeSFX: boolean
}
```

### FinalCutScene

```typescript
interface FinalCutScene {
  sceneId: string
  sceneNumber: number
  sequenceIndex: number        // Order in final film
  
  activeLanguage: string       // Currently selected language
  availableLanguages: string[]
  mp4Url: string               // URL for active language
  
  duration: number             // After trims applied
  originalDuration: number
  thumbnailUrl: string
  
  // Trim handles (seconds)
  headTrim: number             // 0-2s typical
  tailTrim: number             // 0-2s typical
  
  // Post-render adjustments
  volumeAdjustment: number     // -1 to +1
  
  // Transition to next scene
  transitionOut?: {
    type: 'cut' | 'dissolve' | 'fade-black' | 'fade-white'
    duration: number
  }
}
```

---

## Implementation Steps

### Phase 1: Scene Render Dialog

**File:** `src/components/vision/scene-production/SceneRenderDialog.tsx`

Features:
- Language selection (multi-select buttons)
- Resolution dropdown
- Audio mix sliders (volume per track type)
- Toggle switches for include/exclude tracks
- Warning if not all segments are "Print" approved
- Render button with progress feedback

### Phase 2: Scene Render API

**File:** `src/app/api/scenes/[sceneId]/render/route.ts`

Logic:
1. Validate all segment URLs are accessible
2. Generate sourceHash from segments + audio config
3. Call Cloud Run FFmpeg for each language
4. Wait for all renders to complete
5. Upload MP4s to Vercel Blob
6. Return URLs and metadata

### Phase 3: Cloud Run FFmpeg Endpoint

**File:** `ffmpeg-renderer/src/handlers/renderScene.ts`

FFmpeg Pipeline:
1. Concatenate video segments
2. Mix audio tracks with timing and volume
3. Output final MP4 per language

### Phase 4: Stale Detection Hook

**File:** `src/hooks/useSceneRender.ts`

- Generate hash from current scene state
- Compare with stored render hash
- Return isStale, renderStatus, canRender

### Phase 5: Scene Status Indicators

Location: Scene card in Script Panel, Scene Timeline header

- 🔴 Not Rendered - No render exists
- 🟡 Stale - Content changed since last render  
- 🟢 Ready - Render is up-to-date
- 🔵 Rendering - Currently processing
- 🔴 Failed - Render error (show message)

### Phase 6: Final Cut Scene Timeline

**File:** `src/components/final-cut/SceneTimeline.tsx`

Features:
- Drag-and-drop scene reordering (dnd-kit)
- Scene cards showing thumbnail, duration, language
- Inline controls: language, trim, volume, transition
- Title card insertion points
- Total duration counter

---

## Integration Points

### Scene Timeline Header
Add "Render Scene" button next to existing controls

### Scene Card Status Badge
Show render status on scene cards in Script Panel

### Production → Final Cut Gate
Only allow entering Final Cut when all scenes are rendered

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Audio re-mix after render? | Yes - Final Cut has scene-level volume adjustment |
| Scene trim handles? | Yes - 0-2s head/tail trim in Final Cut |
| Render location? | Existing Cloud Run FFmpeg renderer |
| Language variants? | Yes - Separate MP4 per language |

---

## Files to Create/Modify

### New Files
- `src/components/vision/scene-production/SceneRenderDialog.tsx`
- `src/app/api/scenes/[sceneId]/render/route.ts`
- `src/hooks/useSceneRender.ts`
- `src/components/final-cut/SceneTimeline.tsx`
- `src/components/final-cut/FinalCutPage.tsx`
- `src/types/finalcut.ts`

### Modified Files
- `src/components/vision/scene-production/SceneTimelineV2.tsx` - Add render button
- `src/components/vision/scene-production/types.ts` - Add SceneRender types
- `ffmpeg-renderer/src/index.ts` - Add /render-scene endpoint

---

## Success Criteria

1. ✅ User can render scene with selected languages
2. ✅ Render uses Cloud Run FFmpeg with audio mixing
3. ✅ Scene cards show accurate render status
4. ✅ Stale detection triggers when content changes
5. ✅ Final Cut shows scene-level timeline (not segments)
6. ✅ Users can reorder, trim, adjust volume per scene
7. ✅ Language switching works per scene
8. ✅ Export produces final film MP4

---

## Dependencies

- Director's Console Print/Retake workflow ✅ (completed)
- Audio alignment in Scene Timeline (existing)
- Cloud Run FFmpeg renderer (existing - needs new endpoint)
- Vercel Blob storage (existing)
