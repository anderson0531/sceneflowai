# Fix Script Generation - Quality Over Exact Duration

## Problem
Current 10-second dialogue rule is too rigid:
- Forces exactly 6 dialogues per 60s scene
- AI prioritizes hitting duration over quality
- Results in padded, unnatural dialogue
- Duration should be a GUIDE, not a REQUIREMENT

## Solution
Change duration from strict requirement to flexible guideline that informs depth/scope.

## Philosophy Change

### Before (Rigid) ❌:
```
"REQUIRED: ~6 dialogue exchanges per scene"
"CRITICAL: Each 60s scene needs ~6 dialogue lines"
→ AI forces exactly 6 dialogues regardless of story needs
```

### After (Flexible) ✅:
```
"Duration ~60s suggests moderate depth (not rushed, not exhaustive)"
"Let the story dictate dialogue length naturally"
→ AI writes quality dialogue, uses duration to gauge depth
```

## Implementation

### Update `/src/app/api/vision/generate-script-v2/route.ts`

**Modify buildPrompt function** to use duration as guidance, not requirement:

```typescript
function buildPrompt(treatment: any, start: number, end: number, total: number, previousScenes: any[]) {
  const prev = previousScenes.length > 0
    ? `PREVIOUS SCENES:\n${previousScenes.slice(-3).map((s: any) => `${s.sceneNumber}. ${s.heading}: ${s.action.substring(0, 100)}...`).join('\n')}\n\n`
    : ''

  const sceneDuration = Math.floor((treatment.total_duration_seconds || 300) / total)

  return `Generate scenes ${start}-${end} of a ${total}-scene script.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis || treatment.content}
Genre: ${treatment.genre}
Tone: ${treatment.tone}

DURATION GUIDANCE (NOT STRICT):
- Target ~${sceneDuration}s per scene (guideline for depth/scope)
- Short scenes (~30s): Quick exchanges, focused action
- Medium scenes (~60s): Natural conversations, room to breathe  
- Long scenes (~90s+): Deeper exploration, multiple beats
- LET THE STORY DICTATE LENGTH - quality over exact timing

${prev}Return JSON array ONLY:
[
  {
    "sceneNumber": ${start},
    "heading": "INT. LOCATION - TIME",
    "action": "Detailed action and what happens",
    "dialogue": [
      {"character": "NAME", "line": "Natural dialogue..."}
      // As many or as few as the scene needs
    ],
    "visualDescription": "Camera, lighting, composition",
    "duration": ${sceneDuration}
  }
]

FOCUS ON:
1. Captivating, high-quality writing
2. Natural dialogue that serves the story
3. Proper pacing and emotional beats
4. Character voice consistency
5. Smooth scene transitions

Duration is approximate - prioritize QUALITY and NATURAL FLOW over exact timing.

Generate ${end - start + 1} complete scenes with excellent dialogue and pacing.`
}
```

## Key Changes

### Removed:
- ❌ "REQUIRED: ~6 dialogue exchanges"
- ❌ "CRITICAL: Each 60s scene needs ~6 dialogue lines"
- ❌ Dialogue count calculation
- ❌ Rigid timing requirements

### Added:
- ✅ "Duration GUIDANCE (NOT STRICT)"
- ✅ "LET THE STORY DICTATE LENGTH"
- ✅ "quality over exact timing"
- ✅ Focus on captivating writing
- ✅ Natural dialogue that serves the story

## Expected Results
✅ AI writes naturally, not to hit duration targets
✅ Some scenes may be 40s, some 80s - that's fine
✅ Dialogue serves story, not duration requirements
✅ Higher quality, more engaging scripts
✅ Duration still informs depth/scope as intended

## Example

**Scene that needs 2 impactful lines** (naturally ~20s):
```
BRIAN (V.O.): "That morning, I made a decision."
BRIAN: "I quit."
```
Don't force it to 60s with padding ✅

**Scene that needs 8 lines** (naturally ~80s):
```
[Complex conversation with multiple exchanges]
```
Allow it to breathe naturally ✅

