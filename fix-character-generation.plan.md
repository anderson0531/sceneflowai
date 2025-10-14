# Fix Character Library Generation

## Problem

Character Library shows "No characters generated yet" and the "Add Character" button doesn't work.

## Root Cause Investigation

### Why No Characters?

**From logs:**
```
[Vision] Using fresh data: {characterCount: 0}
[Vision] Step 2: Generating characters...
[Vision] No characters to generate images for, marking complete
```

**Two possible sources for characters:**

1. **Film Treatment** → `character_descriptions` array
2. **Script Generation** → `extractCharactersFromScenes()` function

### Check 1: Film Treatment Character Descriptions

**File**: `src/app/api/vision/generate-script/route.ts` (line 51)
```typescript
const characters = filmTreatmentVariant.character_descriptions || []
```

**Question**: Does the Film Treatment variant include `character_descriptions`?

**Action**: Add logging to see if characters exist:
```typescript
console.log('[Script Gen] Characters from variant:', {
  hasCharacterDescriptions: !!filmTreatmentVariant.character_descriptions,
  characterCount: Array.isArray(filmTreatmentVariant.character_descriptions) 
    ? filmTreatmentVariant.character_descriptions.length 
    : 0
})
```

### Check 2: extractCharactersFromScenes

**File**: `src/app/api/vision/generate-script/route.ts` (line 389-410)

This function should extract characters from scene dialogue/action, but it might not be working.

**Current logic** (line 136):
```typescript
characters: characters.length > 0 ? characters : extractCharactersFromScenes(fullScenes),
```

If `characters` from variant is empty, it falls back to extraction.

**Action**: Add logging to see what's extracted:
```typescript
const extractedChars = extractCharactersFromScenes(fullScenes)
console.log('[Script Gen] Extracted characters from scenes:', {
  extractedCount: extractedChars.length,
  characters: extractedChars
})
```

### Check 3: Add Character Button

**File**: `src/components/vision/CharacterLibrary.tsx` (line 26-29)

The button has NO `onClick` handler!

```typescript
<Button variant="outline" size="sm" className="flex items-center gap-1">
  <Plus className="w-4 h-4" />
  <span className="hidden sm:inline">Add Character</span>
</Button>
```

**Action**: Add functionality to manually add characters.

## Implementation Plan

### Step 1: Add Logging for Character Sources

**File**: `src/app/api/vision/generate-script/route.ts`

Add logging after line 51 and before line 136 to see:
- If variant has character_descriptions
- If extractCharactersFromScenes finds any characters

### Step 2: Fix extractCharactersFromScenes

Check if the function is working correctly. It might not be finding characters in the generated scenes.

### Step 3: Implement Add Character Button

Add a modal/form to manually add characters with:
- Name
- Role
- Description
- Optional image upload/generation

### Step 4: Ensure Characters Are Saved

Verify that characters are being saved to `project.metadata.visionPhase.characters`.

## Testing

1. Generate script → Check logs for character extraction
2. Click "Add Character" → Should open form
3. Add manual character → Should appear in library
4. Regenerate character image → Should work

## Priority

Start with **Step 1** (logging) to understand why no characters are being found/generated.

