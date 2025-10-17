# Fix Scene Duration Calculation & Scene Count

## Problem
AI assigns arbitrary durations instead of estimating actual content:

**Example Scene**:
```
Labeled: 60s
Actual content:
  - 1 dialogue line (~10s)
  - Action description (~20s)
  - Real duration: ~30s
Accuracy: 50% error ❌
```

**Root cause**: 
- Scene count is FIXED (20 scenes)
- Duration is CALCULATED (1200s ÷ 20 = 60s per scene)
- AI doesn't adjust to actual content length

## Solution
Let AI determine BOTH scene count AND individual durations based on actual content needs.

### New Approach

**Instead of**:
```
Fixed: 20 scenes
Calculated: 60s each
Result: Arbitrary durations ❌
```

**Do this**:
```
Target: ~1200s total
AI decides: Scene count + individual durations
Result: Accurate based on content ✅
```

## Implementation

### Update `/src/app/api/vision/generate-script-v2/route.ts`

**Change scene count from fixed to variable**:

```typescript
// OLD: Fixed scene count
const sceneCount = Math.max(10, Math.min(40, Math.floor(duration / 60)))
// 1200s → 20 scenes (fixed)

// NEW: Let AI decide scene count within range
const minScenes = Math.floor(duration / 90)  // If scenes average 90s
const maxScenes = Math.floor(duration / 20)  // If scenes average 20s
const suggestedScenes = Math.floor(duration / 50)  // Suggested average 50s

console.log(`[Script Gen V2] Duration: ${duration}s - Suggested: ${suggestedScenes} scenes (range: ${minScenes}-${maxScenes})`)
```

**Update prompt to let AI decide**:

```typescript
function buildPrompt(treatment: any, start: number, end: number, suggestedTotal: number, minTotal: number, maxTotal: number, targetDuration: number, previousScenes: any[]) {
  const prev = previousScenes.length > 0
    ? `PREVIOUS SCENES:\n${previousScenes.slice(-3).map((s: any) => `${s.sceneNumber}. ${s.heading}: ${s.action.substring(0, 100)}...`).join('\n')}\n\n`
    : ''

  return `Generate scenes for a ${Math.floor(targetDuration / 60)}-minute (${targetDuration} seconds) script.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis || treatment.content}
Genre: ${treatment.genre}
Tone: ${treatment.tone}

SCENE COUNT & DURATION RULES:
- Total target duration: ${targetDuration} seconds
- Suggested scene count: ${suggestedTotal} scenes (you can adjust: ${minTotal}-${maxTotal} scenes)
- ESTIMATE ACTUAL DURATION for each scene based on content:
  * Count dialogue lines × 10s each
  * Add action time (setup, transitions, visual beats)
  * Be realistic: 1 dialogue + setup = 15-30s, not 60s
  * Complex dialogue exchanges = 60-90s
  * Simple exchanges = 20-40s

DURATION ESTIMATION GUIDE:
- 1-2 dialogue lines + setup = 15-30s
- 3-4 dialogue lines + action = 40-60s  
- 5-8 dialogue lines + complex action = 60-90s
- 9+ dialogue lines + extensive action = 90-120s

${prev}Return JSON with ACCURATE scene durations:
{
  "totalScenes": 22,  // Adjust based on your content (${minTotal}-${maxTotal})
  "estimatedTotalDuration": 1180,  // Sum of all scene durations
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "INT. LOCATION - TIME",
      "action": "What happens visually",
      "dialogue": [
        {"character": "NAME", "line": "Line 1"},
        {"character": "NAME", "line": "Line 2"}
      ],
      "visualDescription": "Camera, lighting",
      "duration": 25  // REALISTIC: 2 dialogues (20s) + action (5s) = 25s
    },
    {
      "sceneNumber": 2,
      "heading": "EXT. LOCATION - TIME",
      "action": "Complex action sequence",
      "dialogue": [
        {"character": "NAME", "line": "Line 1"},
        {"character": "NAME", "line": "Line 2"},
        {"character": "NAME", "line": "Line 3"},
        {"character": "NAME", "line": "Line 4"}
      ],
      "visualDescription": "Camera, lighting",
      "duration": 55  // REALISTIC: 4 dialogues (40s) + action (15s) = 55s
    }
    // Continue until total ≈ ${targetDuration}s
  ]
}

CRITICAL:
1. Estimate REALISTIC durations based on actual content
2. Adjust scene count to reach target duration (±10% is fine)
3. Quality first - don't pad scenes to hit exact numbers
4. Total estimated duration should be close to ${targetDuration}s

Generate complete scenes with accurate duration estimates.`
}
```

**Generate with flexible scene count**:

```typescript
// Generate first batch to see how many scenes AI creates
const batch1Prompt = buildPrompt(treatment, 1, suggestedScenes, suggestedScenes, minScenes, maxScenes, duration, [])
const batch1Response = await callGemini(apiKey, batch1Prompt)
const batch1Data = JSON.parse(batch1Response)

const actualTotal = batch1Data.totalScenes || suggestedScenes
console.log(`[Script Gen V2] AI determined ${actualTotal} scenes for ${duration}s`)

// Use actual total for any remaining batches
// ...
```

## Expected Results

**Before (Fixed 20 scenes)**:
```
Scene 1: 60s (arbitrary) - Actually 30s ❌
Scene 2: 60s (arbitrary) - Actually 25s ❌
...
Scene 20: 60s (arbitrary) - Actually 40s ❌
Total: 1200s (calculated) - Actually 650s ❌
```

**After (Variable, Realistic)**:
```
Scene 1: 25s (realistic) ✅
Scene 2: 30s (realistic) ✅
Scene 3: 45s (realistic) ✅
...
Scene 24: 40s (realistic) ✅
Total: 1185s (close to 1200s target) ✅
```

## Benefits
✅ Accurate scene durations based on actual content
✅ Scene count adjusts to meet duration target
✅ Better quality - no forced padding
✅ Realistic production planning
✅ Total duration matches target (±10%)

