# Enforce Film Treatment Character Consistency

## Problem
Script generation creates NEW characters instead of using Film Treatment characters:
- Film Treatment: 3 characters defined
- Script generation: 10 characters created
- **Root cause**: Prompts don't include Film Treatment characters, so AI invents new ones

## Solution
Pass Film Treatment characters to script generation and **enforce their use**.

## Implementation

### 1. Pass Characters to Prompts
**File**: `/src/app/api/vision/generate-script-v2/route.ts`

**Update buildBatch1Prompt call** (line 48):
```typescript
const batch1Prompt = buildBatch1Prompt(
  treatment, 
  1, 
  INITIAL_BATCH_SIZE, 
  minScenes, 
  maxScenes, 
  suggestedScenes, 
  duration, 
  [],
  existingCharacters  // ADD: Pass Film Treatment characters
)
```

**Update buildBatch2Prompt call** (line 68):
```typescript
const batch2Prompt = buildBatch2Prompt(
  treatment, 
  allScenes.length + 1, 
  actualTotalScenes, 
  duration, 
  allScenes,
  existingCharacters  // ADD: Pass Film Treatment characters
)
```

### 2. Update buildBatch1Prompt Function
**Add characters parameter and include in prompt**:

```typescript
function buildBatch1Prompt(
  treatment: any, 
  start: number, 
  end: number, 
  min: number, 
  max: number, 
  suggested: number, 
  targetDuration: number, 
  prev: any[],
  characters: any[]  // NEW parameter
) {
  // Build character list from Film Treatment
  const characterList = characters.length > 0
    ? `\n\nDEFINED CHARACTERS (USE ONLY THESE):\n${characters.map((c: any) => 
        `${c.name} (${c.role}): ${c.description}
        Appearance: ${c.appearance || 'N/A'}
        Demeanor: ${c.demeanor || 'N/A'}
        Clothing: ${c.clothing || 'N/A'}`
      ).join('\n\n')}`
    : ''

  return `Generate the FIRST ${end} scenes of a script targeting ${targetDuration} seconds total.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis || treatment.content}
Genre: ${treatment.genre}
Tone: ${treatment.tone}
${characterList}

CRITICAL CHARACTER RULE:
- Use ONLY the characters listed above
- DO NOT invent new characters
- Match character names exactly
- If you need minor characters (waiter, passerby), use minimal dialogue

[... rest of prompt ...]
```

### 3. Update buildBatch2Prompt Function
**Same character parameter**:

```typescript
function buildBatch2Prompt(
  treatment: any, 
  start: number, 
  total: number, 
  targetDuration: number, 
  prevScenes: any[],
  characters: any[]  // NEW parameter
) {
  const characterList = characters.length > 0
    ? `\n\nDEFINED CHARACTERS (USE ONLY THESE):\n${characters.map((c: any) => `${c.name} (${c.role}): ${c.description}`).join('\n')}`
    : ''

  return `Generate scenes ${start}-${total}...

TREATMENT:
[... treatment info ...]
${characterList}

CRITICAL: Use ONLY the defined characters above.

[... rest of prompt ...]
```

### 4. Load Characters BEFORE Batch Generation
**Move character loading earlier** (line 89 → before batch 1):

```typescript
// Load existing characters BEFORE generating script
const existingCharacters = project.metadata?.visionPhase?.characters || 
                          treatment.character_descriptions || []

console.log(`[Script Gen V2] Using ${existingCharacters.length} characters from Film Treatment`)

// BATCH 1: Pass characters to prompt
const batch1Prompt = buildBatch1Prompt(
  treatment, 1, INITIAL_BATCH_SIZE, minScenes, maxScenes, 
  suggestedScenes, duration, [], existingCharacters  // Pass here
)
```

### 5. Enhance Scene Image Prompts with Character Appearance
**File**: `/src/app/api/scene/generate-image/route.ts` (and similar)

**Update prompt enhancement**:

```typescript
// Build character references with appearance details
let characterRefs = ''
if (sceneContext?.characters && Array.isArray(sceneContext.characters)) {
  const charDetails = sceneContext.characters.map((c: any) => {
    const parts = [`${c.name}`]
    if (c.appearance) parts.push(`Appearance: ${c.appearance}`)
    if (c.demeanor) parts.push(`Demeanor: ${c.demeanor}`)
    if (c.clothing) parts.push(`Clothing: ${c.clothing}`)
    return parts.join(', ')
  }).join('; ')
  
  characterRefs = `\n\nCHARACTERS IN SCENE: ${charDetails}`
}

// Add scene description if available
let sceneDesc = ''
if (sceneContext?.sceneDescription) {
  const s = sceneContext.sceneDescription
  sceneDesc = `\n\nLOCATION: ${s.location || ''}\nATMOSPHERE: ${s.atmosphere || ''}\nFURNITURE/PROPS: ${s.furniture_props || ''}`
}

const enhancedPrompt = prompt + characterRefs + sceneDesc + `\n\nStyle: Cinematic...`
```

## Expected Results

### Film Treatment Characters (3):
```
1. BRIAN (protagonist) - Full details
2. RESEARCH SCIENTIST (supporting) - Full details  
3. THAI LOCAL (supporting) - Full details
```

### Script Generation:
```
Uses only BRIAN, RESEARCH SCIENTIST, THAI LOCAL ✅
Adds WAITER (minimal) if needed ✅
Total: 3-4 characters (not 10) ✅
```

### Scene Image Prompts:
```
"Scene in Corporate Office showing BRIAN (Mid-30s, 6'0", lean athletic, 
sharp jawline, linen shirt and chinos) discussing with RESEARCH SCIENTIST...
Location: Modern open-plan office, glass walls, fluorescent lighting..."
```

## Benefits
✅ Film Treatment characters enforced in script
✅ Character consistency across all phases
✅ Scene images use character appearance details
✅ Visual consistency in generated images
✅ No character proliferation (3 defined = 3-4 used, not 10)

