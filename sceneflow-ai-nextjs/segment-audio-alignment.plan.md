# Segment & Audio Alignment Workflow Plan

## Overview

This plan enhances the Scene Timeline to support audio-aligned segmentation, enabling users to synchronize video segments with voiceover, dialogue, and SFX cues. The unified "Scene Timeline" replaces the previous "Audio Timeline" naming and adds a dedicated Segment Track above audio tracks.

## Implementation Status

### ✅ Phase 1: Segment Track & UI Renaming - COMPLETE
- Renamed "Video" track to "Segments" with Layers icon
- Updated both SceneTimelineV2.tsx and SceneTimeline.tsx for consistency
- Added section separation for Segments vs Audio tracks

### ✅ Phase 2: Audio Snap Feature - COMPLETE  
- Added `enableAudioSnap` state with localStorage persistence
- Created `findNearestAudioBoundary` helper with 150ms snap threshold
- Integrated snap logic into drag handlers (move, resize-left, resize-right)
- Added Snap toggle button in timeline header (cyan when active)

### ✅ Phase 3: Fit-to-Dialogue Action - COMPLETE
- Added "Fit Audio" button in timeline header (purple, shows when segment selected)
- Button triggers `onFitSegmentToDialogue` callback
- Dialog includes "Fit to Dialogue Duration" button

### ✅ Phase 4: Segment Audio Alignment Dialog - COMPLETE
- Created `SegmentAudioAlignmentDialog.tsx` component
- Features:
  - Timing adjustment (start/end time inputs)
  - Dialogue line assignment with checkboxes
  - Audio preview playback
  - Alignment status indicator (aligned/close/misaligned)
  - Narration clip reference
  - Alignment tips

### 🔄 Phase 5: Waveform Visualization - DEFERRED
- Optional enhancement for future iteration
- Would display audio waveform as background on clips

## Files Modified

| File | Changes |
|------|---------|
| `SceneTimelineV2.tsx` | Segment track label, Snap toggle, Fit Audio button, snap logic |
| `SceneTimeline.tsx` | Segment track label for v1 consistency |
| `types.ts` | Added new props: `onSegmentTimeChange`, `onFitSegmentToDialogue`, `onOpenSegmentPromptDialog` |
| `SegmentAudioAlignmentDialog.tsx` | NEW - Dialog for audio alignment |

## Integration Guide

To use the new audio alignment features, parent components should:

```tsx
<SceneTimelineV2
  // ... existing props
  onFitSegmentToDialogue={(segmentId) => {
    // Calculate total dialogue duration for segment's assigned lines
    // Update segment endTime = startTime + dialogueDuration
  }}
  onOpenSegmentPromptDialog={(segmentId) => {
    // Open SegmentAudioAlignmentDialog with segment data
  }}
  onSegmentTimeChange={(segmentId, newStart, newEnd) => {
    // Persist timing changes to segment state
  }}
/>
```

## UI Summary

### Timeline Header Controls (left to right):
1. Playback controls (skip, play/pause)
2. Time display
3. **Snap** toggle (cyan when active)
4. **Fit Audio** button (purple, segment-selected only)
5. **Edit** button (opens alignment dialog)
6. Add/Delete segment controls
7. Language selector
8. Expand/collapse toggle

### Track Order:
1. **Segments** - Video segments with drag/resize
2. Narration - Voice-over track
3. Dialogue - Character dialogue clips
4. Music - Background music
5. SFX - Sound effects
