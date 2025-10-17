# Preserve Film Treatment Characters in Script Generation

## Problem
Script generation V2 is overwriting Film Treatment characters:

**Current flow**:
1. Film Treatment creates detailed characters (appearance, demeanor, clothing)
2. Project created with characters saved to `visionPhase.characters`
3. Script generation V2 **extracts new characters from dialogue** ❌
4. **Overwrites existing characters** ❌
5. Loses all detailed descriptions from Film Treatment

**Result**: Film Treatment character work is lost!

## Solution
Script generation should **use existing project characters**, not extract new ones.

## Implementation

### 1. Use Existing Characters from Project
**File**: `/src/app/api/vision/generate-script-v2/route.ts`

**Replace lines 89-101**:

```typescript
// OLD: Extract new characters (overwrites existing)
const extractedCharacters = extractCharacters(allScenes)
const charactersWithPrompts = extractedCharacters.map(...)

// NEW: Use existing characters from project
const existingCharacters = project.metadata?.visionPhase?.characters || []
const existingCharNames = existingCharacters.map((c: any) => c.name.toUpperCase())

// Extract any NEW characters that appeared in dialogue but aren't in Film Treatment
const dialogueChars = extractCharacters(allScenes)
const newChars = dialogueChars.filter((c: any) => 
  !existingCharNames.includes(c.name.toUpperCase())
)

// Combine: existing (with all Film Treatment details) + any new ones
const allCharacters = [
  ...existingCharacters,  // Keep Film Treatment characters with all details
  ...newChars.map((c: any) => ({
    ...c,
    imagePrompt: `Professional character portrait: ${c.name}, ${c.description}`,
    referenceImage: null
  }))
]

console.log(`[Script Gen V2] Characters: ${existingCharacters.length} from Film Treatment + ${newChars.length} new from dialogue`)
```

### 2. Preserve Character Details in Script
**Use existing characters with**:
- ✅ name (from Film Treatment)
- ✅ role (protagonist/supporting/antagonist)
- ✅ appearance (detailed from Film Treatment)
- ✅ demeanor (detailed from Film Treatment)
- ✅ clothing (detailed from Film Treatment)
- ✅ description (from Film Treatment)
- ✅ referenceImage (if already generated)
- ✅ imagePrompt (for generating if needed)

### 3. Update Script Data
**Line 108**:

```typescript
const script = {
  title: treatment.title,
  logline: treatment.logline,
  script: { scenes: allScenes },
  characters: allCharacters,  // Preserved + new
  totalDuration: totalEstimatedDuration  // Use accurate total
}
```

### 4. Update Vision Page to Show Existing Characters
Vision page already loads characters correctly (line 102).
Just ensure they're displayed in CharacterLibrary sidebar.

## Expected Behavior

### When Project Created from Film Treatment:
```
Film Treatment → character_descriptions:
[
  {
    name: "BRIAN",
    role: "protagonist",
    appearance: "Mid-30s, 6'0\", lean...",
    demeanor: "Thoughtful and introspective...",
    clothing: "Linen shirts, chino shorts...",
    description: "Former tech executive"
  }
]

↓ Saved to project.metadata.visionPhase.characters
```

### When Script Generated:
```
Script V2:
1. Load existing characters from project ✅
2. Generate script with those character names
3. Extract any NEW characters from dialogue
4. Combine: existing (detailed) + new (basic)
5. Save combined list

Result: Film Treatment characters preserved with all details ✅
```

### Vision Page Display:
```
Character Sidebar:
┌─────────────────────────┐
│ BRIAN (protagonist)     │
│ Mid-30s, 6'0", lean     │
│ Thoughtful demeanor     │
│ Linen shirts            │
│ [Generate Image] button │
└─────────────────────────┘
```

## Expected Results
✅ Film Treatment characters preserved with all details
✅ Appearance, demeanor, clothing maintained
✅ Vision page displays existing characters
✅ Script generation adds new characters if needed
✅ Character descriptions used for image generation
✅ No loss of Film Treatment work

