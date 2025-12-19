# Frame-Anchored Video Production Design

## Status: Planning → Phase 1 Implementation
## Created: December 19, 2025

---

## Executive Summary

This document outlines the architecture for improving Veo 3.1 video generation quality by using **both start AND end frames** as anchors. The current implementation only uses a start frame, leading to character drift (changing faces, costumes, proportions) over the 8-second video segment.

### Core Insight
By generating the end frame FIRST (using Imagen 3), we can provide Veo 3.1 with both boundary conditions, dramatically reducing character drift and improving visual consistency.

---

## Problem Statement

### Current Issues
1. **Character Drift**: Faces, costumes, and proportions change during 8-second segments
2. **Scene Inconsistency**: Characters look different between segments
3. **Immersion Breaking**: Viewers notice the visual instability

### Root Cause
Veo 3.1 only receives a start frame and must "imagine" the end state. Without an end anchor, the model drifts toward its training data rather than maintaining character consistency.

---

## Proposed Solution

### Frame-Anchored Generation Flow

```
1. Start Frame (existing) → Imagen 3 generation
2. End Frame (NEW) → Imagen 3 generation with continuity prompt
3. Video Generation → Veo 3.1 with BOTH frames as anchors
```

### Technical Approach

**End Frame Generation Prompt Template:**
```
Generate the final frame of a video segment.

STARTING FRAME REFERENCE: [attached image]
SEGMENT DESCRIPTION: [action/dialogue that occurs]
DURATION: 8 seconds

REQUIREMENTS:
- Same characters as starting frame
- Same costumes, hair, facial features
- Same environment/location
- Show the END STATE after the described action
- Maintain exact character proportions
- Consistent lighting and color grading
```

---

## Architecture

### Data Model Changes

```typescript
// Segment type extension
interface Segment {
  // Existing fields...
  startFrameUrl?: string;
  
  // New fields
  endFrameUrl?: string;
  endFramePrompt?: string;
  frameAnchoringEnabled?: boolean;
}
```

### API Endpoints

#### New: Generate End Frame
```
POST /api/scenes/[sceneId]/segments/[segmentId]/generate-end-frame
```

Request:
```json
{
  "startFrameUrl": "https://...",
  "segmentDescription": "Character walks toward camera",
  "segmentDuration": 8
}
```

Response:
```json
{
  "endFrameUrl": "https://...",
  "endFramePrompt": "Generated prompt used"
}
```

#### Modified: Generate Video
```
POST /api/scenes/[sceneId]/segments/[segmentId]/generate-video
```

Request (updated):
```json
{
  "startFrameUrl": "https://...",
  "endFrameUrl": "https://...",  // NEW
  "prompt": "Video generation prompt",
  "duration": 8
}
```

---

## Implementation Phases

### Phase 1: Foundation (Current Sprint)
**Goal**: Add end frame generation capability

1. **Data Model Updates**
   - Add `endFrameUrl` to Segment type
   - Add `endFramePrompt` to Segment type
   - Update Firestore schema

2. **End Frame Generation API**
   - Create new API endpoint
   - Implement Imagen 3 prompt for end frame
   - Include start frame as reference

3. **UI Updates**
   - Add "Generate End Frame" button to segment cards
   - Display end frame preview alongside start frame
   - Add frame comparison view

4. **Video Generation Update**
   - Modify Veo 3.1 call to include end frame
   - Update prompt structure for frame anchoring

### Phase 2: Automation
**Goal**: Streamline the workflow

1. **Auto-Generate End Frames**
   - Batch generation for all segments
   - Queue management for API rate limits

2. **Frame Chain Validation**
   - Verify end frame of segment N matches start of segment N+1
   - Visual similarity scoring

3. **Regeneration Flow**
   - If end frame doesn't match next start frame, offer regeneration
   - Cascade updates through segment chain

### Phase 3: Quality Enhancement
**Goal**: Improve frame accuracy

1. **Character Reference Integration**
   - Include character reference images in prompts
   - Style consistency enforcement

2. **Frame Interpolation Preview**
   - Show predicted motion path between frames
   - Highlight potential drift areas

3. **A/B Testing Framework**
   - Compare videos with/without end frame anchoring
   - Collect quality metrics

### Phase 4: Advanced Features
**Goal**: Production polish

1. **Keyframe Editor**
   - Manual end frame adjustment
   - Pose/expression fine-tuning

2. **Motion Intensity Control**
   - Slider for action intensity between frames
   - Camera movement suggestions

3. **Multi-Character Tracking**
   - Ensure each character maintains consistency
   - Character-specific anchoring

### Phase 5: Optimization
**Goal**: Cost and performance

1. **Smart Frame Caching**
   - Reuse similar end frames
   - Reduce redundant generation

2. **Batch Processing**
   - Generate all end frames in parallel
   - Bulk video generation queue

3. **Cost Monitoring**
   - Track frame generation costs
   - Optimize prompt length for cost

---

## Cost Analysis

### Per Segment Costs

| Component | Current | With End Frame |
|-----------|---------|----------------|
| Start Frame (Imagen 3) | $0.02 | $0.02 |
| End Frame (Imagen 3) | - | $0.02 |
| Video (Veo 3.1) | $0.40 | $0.40 |
| **Total per segment** | **$0.42** | **$0.44** |

### Cost Impact
- **+5% increase** per segment ($0.02 additional)
- **Potentially -50% reduction** in regeneration costs due to better quality
- **Net expected savings** from fewer failed generations

---

## Success Metrics

### Phase 1 Metrics
- [ ] End frame generation success rate > 95%
- [ ] End frame visual similarity to segment action > 80%
- [ ] Video generation with both frames successful

### Quality Metrics
- [ ] Character face consistency score improved by 40%
- [ ] Costume/prop consistency improved by 60%
- [ ] User satisfaction rating increase
- [ ] Reduction in "regenerate" button clicks

### Performance Metrics
- [ ] End frame generation time < 15 seconds
- [ ] Total segment generation time < 3 minutes
- [ ] API error rate < 2%

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Veo 3.1 doesn't support end frame | High | Verify API capability first |
| End frame quality inconsistent | Medium | Multiple generation attempts |
| Increased API costs | Low | Monitor and optimize |
| Longer generation times | Medium | Parallel processing |

### Mitigation Strategy
1. **Prototype First**: Build minimal end frame generation to verify approach
2. **Fallback Mode**: Keep single-frame generation as fallback
3. **Progressive Rollout**: Enable per-project, not globally

---

## UI/UX Design

### Segment Card Updates

```
┌─────────────────────────────────────────────┐
│ Segment 1: "John enters the room"           │
├─────────────────────────────────────────────┤
│  ┌─────────┐         ┌─────────┐           │
│  │ START   │   →→→   │  END    │           │
│  │ FRAME   │         │ FRAME   │           │
│  └─────────┘         └─────────┘           │
│  [Generate]          [Generate]             │
│                                             │
│  [Generate Video with Frame Anchoring]      │
└─────────────────────────────────────────────┘
```

### Frame Comparison Modal

```
┌──────────────────────────────────────────────┐
│ Frame Anchoring Preview                    X │
├──────────────────────────────────────────────┤
│                                              │
│  Start Frame          End Frame              │
│  ┌──────────┐        ┌──────────┐           │
│  │          │   →    │          │           │
│  │          │        │          │           │
│  └──────────┘        └──────────┘           │
│                                              │
│  Segment Action:                             │
│  "John walks toward the window and looks    │
│   out at the city skyline"                  │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │ Character Consistency Check         │    │
│  │ ✓ Face matches: 94%                 │    │
│  │ ✓ Costume matches: 98%              │    │
│  │ ✓ Environment consistent: 96%       │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  [Regenerate End Frame] [Accept & Generate] │
└──────────────────────────────────────────────┘
```

---

## API Integration Notes

### Veo 3.1 Frame Anchoring

Based on Google's Veo API documentation, frame anchoring is supported through:

```typescript
// Pseudo-code for Veo 3.1 call with end frame
const videoRequest = {
  model: "veo-3.1",
  prompt: segmentPrompt,
  image: {
    startFrame: startFrameBase64,
    endFrame: endFrameBase64,  // NEW
  },
  config: {
    duration: 8,
    aspectRatio: "16:9",
    frameAnchoring: true,  // Enable both-frame mode
  }
};
```

### Imagen 3 End Frame Generation

```typescript
// End frame generation prompt structure
const endFramePrompt = `
Generate the FINAL FRAME of an 8-second video segment.

REFERENCE IMAGE: [Starting frame attached]

SEGMENT ACTION: ${segmentDescription}

CRITICAL REQUIREMENTS:
1. SAME CHARACTERS - identical faces, hair, body proportions
2. SAME COSTUMES - exact clothing, accessories, colors
3. SAME ENVIRONMENT - consistent background, lighting, time of day
4. END STATE - show the result after ${segmentDuration} seconds of action
5. CAMERA ANGLE - maintain similar perspective unless action requires change

The generated image must look like it's from the SAME SCENE as the reference.
`;
```

---

## File Changes Required

### Phase 1 Files

1. **Types**: `src/types/segment.ts`
   - Add `endFrameUrl`, `endFramePrompt` fields

2. **API Route**: `src/app/api/scenes/[sceneId]/segments/[segmentId]/generate-end-frame/route.ts`
   - New endpoint for end frame generation

3. **API Route**: `src/app/api/scenes/[sceneId]/segments/[segmentId]/generate-video/route.ts`
   - Modify to accept and use end frame

4. **Component**: `src/components/vision/scene-production/SegmentCard.tsx`
   - Add end frame display and generation button

5. **Service**: `src/services/imagen.ts`
   - Add end frame generation function

---

## Testing Strategy

### Unit Tests
- End frame prompt generation
- API request/response handling
- Data model validation

### Integration Tests
- Full flow: start frame → end frame → video
- Error handling for failed generations
- Retry logic verification

### Visual QA
- Character consistency before/after
- Side-by-side comparison tool
- User acceptance testing

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 2-3 days | None |
| Phase 2 | 2-3 days | Phase 1 |
| Phase 3 | 3-4 days | Phase 2 |
| Phase 4 | 4-5 days | Phase 3 |
| Phase 5 | 2-3 days | Phase 4 |

**Total Estimated**: 13-18 days for full implementation

---

## Next Steps

1. ✅ Create this planning document
2. 🔄 Start Phase 1 implementation
   - Update Segment type definition
   - Create generate-end-frame API endpoint
   - Update SegmentCard component
   - Modify video generation to use both frames
3. Update design document with implementation decision
4. Test with single segment
5. Gather feedback and iterate

---

## References

- [Veo API Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- [Imagen 3 API Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [SceneFlow AI Design Document](./sceneflow-ai-nextjs/SCENEFLOW_AI_DESIGN_DOCUMENT.md)
