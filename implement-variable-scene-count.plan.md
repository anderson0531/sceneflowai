# Implement Variable Scene Count with Accurate Durations

## Confirmed Requirements
- ✅ Variable scene count: 18-30 scenes (AI decides)
- ✅ Duration accuracy: ±10% acceptable
- ✅ Full implementation: Variable count + accurate durations

## Implementation Plan

### 1. Update Scene Count Logic
**File**: `/src/app/api/vision/generate-script-v2/route.ts`

**Replace lines 34-37**:

```typescript
// OLD: Fixed scene count
const duration = project.duration || 300
const sceneCount = Math.max(10, Math.min(40, Math.floor(duration / 60)))

// NEW: Variable scene count range
const duration = project.duration || 300
const minScenes = Math.floor(duration / 90)   // Conservative (scenes avg 90s)
const maxScenes = Math.floor(duration / 20)   // Aggressive (scenes avg 20s)  
const suggestedScenes = Math.floor(duration / 50)  // Recommended (scenes avg 50s)

console.log(`[Script Gen V2] Target: ${duration}s - Scene range: ${minScenes}-${maxScenes} (suggested: ${suggestedScenes})`)
```

**For 1200s (20 min)**:
- minScenes: 13 (if scenes average 90s)
- maxScenes: 60 (if scenes average 20s)
- suggestedScenes: 24 (if scenes average 50s)

### 2. Two-Phase Batch Generation

**Phase 1**: Generate first batch, let AI determine total count

```typescript
// Generate in 2-3 batches, but let AI determine final count
const INITIAL_BATCH_SIZE = 12  // Generate first 12 scenes
let actualTotalScenes = suggestedScenes  // Will be updated by AI
let allScenes: any[] = []

// BATCH 1: Let AI determine total scene count
console.log(`[Script Gen V2] Batch 1: Generating first ${INITIAL_BATCH_SIZE} scenes...`)

const batch1Prompt = buildBatch1Prompt(
  treatment,
  1,
  INITIAL_BATCH_SIZE,
  minScenes,
  maxScenes,
  suggestedScenes,
  duration,
  []
)

const batch1Response = await callGemini(apiKey, batch1Prompt)
const batch1Data = parseScenes(batch1Response, 1, INITIAL_BATCH_SIZE)

// Extract AI's determined total
if (batch1Data.totalScenes) {
  actualTotalScenes = batch1Data.totalScenes
  console.log(`[Script Gen V2] AI determined ${actualTotalScenes} total scenes`)
} else {
  console.log(`[Script Gen V2] Using suggested ${actualTotalScenes} scenes`)
}

allScenes.push(...batch1Data.scenes)

// BATCH 2+: Generate remaining scenes based on AI's total
const remainingScenes = actualTotalScenes - allScenes.length
if (remainingScenes > 0) {
  const batch2Prompt = buildBatch2Prompt(
    treatment,
    allScenes.length + 1,
    actualTotalScenes,
    duration,
    allScenes
  )
  
  const batch2Response = await callGemini(apiKey, batch2Prompt)
  const batch2Data = parseScenes(batch2Response, allScenes.length + 1, actualTotalScenes)
  
  allScenes.push(...batch2Data.scenes)
  console.log(`[Script Gen V2] Batch 2: ${batch2Data.scenes.length} scenes`)
}
```

### 3. Enhanced Prompts

**Batch 1 Prompt** (determines total):

```typescript
function buildBatch1Prompt(treatment, start, end, min, max, suggested, targetDuration, prev) {
  return `Generate the FIRST ${end} scenes of a script targeting ${targetDuration} seconds total.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis}

SCENE PLANNING:
- Total target: ${targetDuration}s (±10% is fine)
- Suggested total scenes: ${suggested} (you can choose ${min}-${max})
- YOU DECIDE: How many total scenes best tells this story?
- Generate first ${end} scenes now, determine total count

DURATION ESTIMATION (CRITICAL):
For each scene, estimate REALISTIC duration:
- Count dialogue lines × 10s each
- Add action/setup time (5-30s depending on complexity)
- Examples:
  * 1 dialogue + setup = 15-30s
  * 3 dialogues + action = 40-60s
  * 6 dialogues + complex action = 70-90s

Return JSON:
{
  "totalScenes": 24,  // YOUR DECISION (${min}-${max})
  "estimatedTotalDuration": 300,  // Sum of first ${end} scenes
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "INT. LOCATION - TIME",
      "action": "What happens",
      "dialogue": [{"character": "NAME", "line": "..."}],
      "visualDescription": "Camera, lighting",
      "duration": 25  // REALISTIC based on content
    }
  ]
}

CRITICAL:
1. Determine total scene count that fits ${targetDuration}s
2. Estimate accurate durations (don't use arbitrary 60s)
3. Quality writing over exact duration matching

Generate first ${end} scenes with realistic durations.`
}
```

**Batch 2 Prompt** (uses determined total):

```typescript
function buildBatch2Prompt(treatment, start, total, targetDuration, prevScenes) {
  const remaining = total - prevScenes.length
  const remainingDuration = targetDuration - prevScenes.reduce((sum, s) => sum + s.duration, 0)
  
  return `Generate scenes ${start}-${total} (final ${remaining} scenes) of a ${total}-scene script.

PREVIOUS SCENES (${prevScenes.length} so far):
${prevScenes.slice(-3).map(s => `${s.sceneNumber}. ${s.heading} (${s.duration}s): ${s.action.substring(0, 80)}...`).join('\n')}

DURATION TARGET:
- Remaining: ~${remainingDuration}s for ${remaining} scenes
- Average: ~${Math.floor(remainingDuration / remaining)}s per scene
- Estimate realistically based on content

[Same treatment context and duration estimation guide]

Return JSON:
{
  "scenes": [
    // Scenes ${start} through ${total}
  ]
}

Complete the script with accurate duration estimates.`
}
```

### 4. Update parseScenes Function

```typescript
function parseScenes(response: string, start: number, end: number): any {
  try {
    const cleaned = response.replace(/```json\n?|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    
    // Batch 1 returns object with totalScenes
    if (parsed.totalScenes && parsed.scenes) {
      return {
        totalScenes: parsed.totalScenes,
        estimatedTotalDuration: parsed.estimatedTotalDuration,
        scenes: parsed.scenes.map((s: any, idx: number) => ({
          sceneNumber: start + idx,
          heading: s.heading || `SCENE ${start + idx}`,
          action: s.action || 'Scene content',
          dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
          visualDescription: s.visualDescription || s.action || 'Cinematic shot',
          duration: s.duration || 30,  // Use AI's estimate or default 30s
          isExpanded: true
        }))
      }
    }
    
    // Batch 2+ returns just scenes array
    const scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || [])
    return {
      scenes: scenes.map((s: any, idx: number) => ({
        sceneNumber: start + idx,
        heading: s.heading || `SCENE ${start + idx}`,
        action: s.action || 'Scene content',
        dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
        visualDescription: s.visualDescription || s.action || 'Cinematic shot',
        duration: s.duration || 30,
        isExpanded: true
      }))
    }
  } catch {
    // Fallback
    return { scenes: [] }
  }
}
```

### 5. Logging & Validation

```typescript
// After all batches
const totalEstimatedDuration = allScenes.reduce((sum, s) => sum + s.duration, 0)
const durationAccuracy = ((totalEstimatedDuration / duration) * 100).toFixed(1)

console.log(`[Script Gen V2] Generation complete:`)
console.log(`  - Scenes: ${allScenes.length} (suggested ${suggestedScenes})`)
console.log(`  - Estimated: ${totalEstimatedDuration}s vs Target: ${duration}s`)
console.log(`  - Accuracy: ${durationAccuracy}%`)

if (Math.abs(totalEstimatedDuration - duration) / duration > 0.15) {
  console.warn(`[Script Gen V2] Duration accuracy >15% off, may need adjustment`)
}
```

## Expected Outcomes

### Example for 1200s (20 min) Project:

**Current (Broken)**:
```
20 scenes × 60s = 1200s (calculated)
Actual content: ~650s (50% error)
```

**After Fix**:
```
AI chooses: 26 scenes
Scene 1: 30s (realistic)
Scene 2: 25s (realistic)
Scene 3: 55s (realistic)
...
Scene 26: 45s (realistic)
Total: 1165s (97% accuracy) ✅
```

## Testing Plan

After implementation:
1. Generate script for 20-min project
2. Check: Scene count in range 18-30? ✅
3. Check: Individual durations match content? ✅
4. Check: Total duration 1080-1320s (±10%)? ✅
5. Verify: No padded scenes? ✅

## Risks & Mitigations

**Risk 1**: AI chooses too many/few scenes
- **Mitigation**: Strict min/max bounds (13-60 for 1200s)

**Risk 2**: AI estimates poorly
- **Mitigation**: Detailed estimation guide in prompt

**Risk 3**: Total duration way off
- **Mitigation**: Warning logs if >15% off, can regenerate

---

**Does this approach look good to you?** The key changes are:
1. Scene count becomes variable (AI decides within range)
2. Durations estimated from actual content
3. Two-phase generation (first batch determines total)
4. Focus on quality + accuracy over arbitrary targets

