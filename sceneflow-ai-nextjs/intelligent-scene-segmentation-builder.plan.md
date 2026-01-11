# Intelligent Scene Segmentation Builder

## Design & Implementation Plan

**Version**: 1.0  
**Status**: Implementation Complete  
**Date**: January 12, 2026

---

## Executive Summary

The Intelligent Scene Segmentation Builder is a new workflow tab that enables AI-assisted video segment creation with user revision control. It treats the **scene script as an immutable "Scene Bible"** during segmentation—users can only adjust segment boundaries and cinematography prompts, never the underlying scene content.

### Key Design Principles

1. **Scene Bible as Source of Truth**: Scene content (setting, narration, dialogue) is READ-ONLY during segmentation
2. **Intelligent Defaults, User Control**: AI generates optimal segments; users fine-tune
3. **Duration Guardrails**: Segments are optimized for 4-8 seconds (Veo 3.1 optimal range)
4. **Soft Guardrails with Warnings**: System warns on potential issues but allows override
5. **Clear Workflow Phases**: Analyze → Review → Finalize

---

## Architecture Overview

### New Components Created

| Component | Location | Purpose |
|-----------|----------|---------|
| `SegmentBuilder.tsx` | `/src/components/vision/scene-production/` | Main orchestration component with 3-phase workflow |
| `SegmentPreviewTimeline.tsx` | `/src/components/vision/scene-production/` | Visual timeline with drag-to-adjust segment boundaries |
| `SegmentPromptEditor.tsx` | `/src/components/vision/scene-production/` | Per-segment prompt editor with guardrails |
| `SegmentValidation.ts` | `/src/lib/intelligence/` | Validation rules for scene bible integrity |

### Modified Files

| File | Changes |
|------|---------|
| `ScriptPanel.tsx` | Added Segments tab, integrated SegmentBuilder component |
| `SceneWorkflowCoPilot.tsx` | Added `segmentBuilder` workflow step with guidance |
| `generate-segments/route.ts` | Added `previewMode` parameter for non-committing proposals |
| `intelligence/index.ts` | Exported SegmentValidation module |
| `scene-production/index.ts` | Exported SegmentBuilder components |

---

## Workflow Design

### Phase 1: AI Analysis
- User configures target duration (4-8 seconds slider)
- Optional: Enable narration-driven segmentation
- AI analyzes scene content and proposes optimal segment boundaries
- Segments are returned in preview mode (not committed)

### Phase 2: Review & Revise
**Left Panel: Scene Bible (Read-Only)**
- Displays locked scene content: heading, description, narration, dialogue
- Shows character list with badges
- Clear "Read-Only During Segmentation" indicator

**Center Panel: Timeline & Editor**
- Visual timeline showing proposed segments
- Drag handles on segment edges to adjust boundaries
- Snap to audio beat boundaries (narration/dialogue timing)
- Color-coded by generation method (I2V, T2V, FTV, EXT)

**Segment Prompt Editor**
- Guided Mode: Dropdowns for cinematography (shot type, camera angle, movement, lighting, mood, pacing)
- Advanced Mode: Free-form editing with soft guardrails
- Locked content from Scene Bible displayed as read-only context
- Validation warnings for potential issues

### Phase 3: Finalize
- Summary of all segments (count, total duration, dialogue coverage)
- Validation status for all segments
- "Finalize & Proceed" action locks segments and enables Key Frames tab

---

## Scene Bible Guardrails

### What's Locked (Read-Only)
- Scene heading (location, time of day)
- Visual description / action
- Narration text
- Dialogue lines (character, text, emotion)
- Characters present in scene

### What's Editable
- Segment boundaries (start/end times)
- Shot type (wide, medium, close-up, etc.)
- Camera angle (eye-level, low, high, dutch, etc.)
- Camera movement (static, push, pull, pan, track, etc.)
- Lighting style (natural, dramatic, soft, etc.)
- Mood/atmosphere
- Pacing
- Additional visual direction

### Validation Rules

| Rule | Severity | Action |
|------|----------|--------|
| Duration < 2s | Error | Block finalization |
| Duration > 8s | Error | Block finalization |
| Unknown character in prompt | Warning | Allow with warning |
| Location change detected | Warning | Allow with warning |
| Dialogue not in script | Warning | Allow with warning |
| Prompt too short (<50 chars) | Warning | Suggest enhancement |
| Prompt too long (>1000 chars) | Warning | Suggest trimming |
| Over-description for frame-to-frame | Info | Suggest simplification |

---

## API Enhancements

### `/api/scenes/[sceneId]/generate-segments`

**New Parameters:**
```typescript
interface GenerateSegmentsRequest {
  // ... existing params
  previewMode?: boolean  // NEW: Return proposals without committing
}
```

**Enhanced Response:**
```typescript
{
  success: true,
  segments: TransformedSegment[],
  targetSegmentDuration: number,
  previewMode: boolean,           // NEW: Indicates preview mode
  sceneBibleHash: string          // NEW: For staleness detection
}
```

---

## UI/UX Patterns

### Phase Indicator
- Three-step horizontal progress indicator
- Phases: AI Analysis → Review & Revise → Finalize
- Visual states: complete (green), current (primary), pending (muted), locked (disabled)
- Click to navigate between phases (when unlocked)

### Scene Bible Panel
- Amber/gold accent color to indicate "locked/important"
- Lock icon with "Read-Only During Segmentation" badge
- Collapsible sections for description, narration, dialogue, characters
- Link to "Edit the scene in the Script tab if changes are needed"

### Timeline Interactions
- Drag segment edges to resize
- Snap to audio beat boundaries (150ms threshold)
- Color-coded segments by generation method
- Tooltip on hover showing: trigger reason, confidence, dialogue coverage
- "Edited" badge on user-adjusted segments

### Prompt Editor Tabs
- **Guided Mode**: Form-based with dropdowns, beginner-friendly
- **Advanced Mode**: Free-form textarea with guardrail warnings

---

## Integration Points

### Workflow Sequence
```
Script → Frame → Segments → Call Action
  │        │        │           │
  │        │        │           └── Generate/upload video clips
  │        │        │
  │        │        └── Build intelligent segments, edit prompts
  │        │
  │        └── Generate scene keyframe image
  │
  └── Edit scene content, generate audio
```

### Unlock Conditions
- **Segments tab**: Unlocks when Frame step is complete (scene has keyframe image)
- **Call Action tab**: Unlocks when Segments are finalized (all segments have READY status)

### Stale Segment Detection
- Content hash stored in `promptContext.visualDescriptionHash`
- If scene content changes after segments are finalized, `isStale` flag is set
- Warning shown in Call Action tab prompting re-segmentation

---

## Further Recommendations (Implemented)

### 1. Placement in Workflow ✅
**Decision**: New "Segments" tab between "Frame" and "Call Action"
- Clear separation of concerns
- Users generate scene image first, then segment

### 2. Stale Segment Handling ✅
**Decision**: Warning badge + manual action to preserve intentional tweaks
- If script changes after segments finalized, show warning
- Require explicit "Regenerate Segments" action

### 3. Prompt Guardrail Strictness ✅
**Decision**: Soft guardrail with warnings, allow override
- Warnings for new entities: "This prompt references 'John' who is not in the scene. Continue anyway?"
- Errors only for duration violations (hard requirement)

---

## Files Created/Modified

### New Files
1. `/src/components/vision/scene-production/SegmentBuilder.tsx` (750+ lines)
2. `/src/components/vision/scene-production/SegmentPreviewTimeline.tsx` (450+ lines)
3. `/src/components/vision/scene-production/SegmentPromptEditor.tsx` (600+ lines)
4. `/src/lib/intelligence/SegmentValidation.ts` (400+ lines)

### Modified Files
1. `/src/components/vision/ScriptPanel.tsx` - Added Segments tab integration
2. `/src/components/vision/SceneWorkflowCoPilot.tsx` - Added `segmentBuilder` step
3. `/src/app/api/scenes/[sceneId]/generate-segments/route.ts` - Added preview mode
4. `/src/lib/intelligence/index.ts` - Exported SegmentValidation
5. `/src/components/vision/scene-production/index.ts` - Exported new components

---

## Usage Guide

### For Users
1. Complete Script tab (narration, dialogue, audio)
2. Complete Frame tab (generate scene keyframe image)
3. Open Segments tab
4. Click "Generate Segments" to run AI analysis
5. Review proposed segments on timeline
6. Drag segment edges to adjust boundaries
7. Edit prompts (cinematography only) in the right panel
8. Click "Finalize & Proceed" when ready
9. Continue to Call Action to generate videos

### For Developers
```typescript
import { SegmentBuilder } from '@/components/vision/scene-production'
import { SegmentValidation } from '@/lib/intelligence'

// Validate a segment against the scene bible
const result = SegmentValidation.validateSegment(segment, sceneBible)
if (!result.isValid) {
  result.issues.forEach(issue => console.warn(issue.message))
}

// Detect new entities not in scene bible
const entities = SegmentValidation.detectNewEntities(prompt, sceneBible)
if (entities.characters.length > 0) {
  console.warn('New characters detected:', entities.characters)
}
```

---

## Future Enhancements

1. **Audio Waveform Visualization**: Use wavesurfer.js for more precise timing
2. **Batch Analysis**: "Analyze All Scenes" for multi-scene projects
3. **Segment Templates**: Pre-built patterns (Establishing → Action → Close-up)
4. **AI Prompt Suggestions**: Real-time suggestions based on scene context
5. **Version History**: Track segment iterations with undo/redo

---

## Approval Checklist

- [x] Scene Bible as read-only source of truth
- [x] Users cannot change script content during segmentation
- [x] Duration guardrails (4-8s optimal, 2-8s allowed)
- [x] Soft guardrails with warnings for prompt validation
- [x] Three-phase workflow (Analyze → Review → Finalize)
- [x] Visual timeline with drag-to-adjust
- [x] Guided and Advanced prompt editing modes
- [x] Integration with existing workflow tabs
- [x] Preview mode API for non-committing proposals
