# Remove Ethnicity Injection for Children Only

## Problem

Imagen 4's safety filter is triggered by **overly explicit/redundant** children mentions:
- Current: "four young African American boys, his African American sons" → **BLOCKED**
- Issue: Ethnicity injected twice in one sentence makes it overly explicit

Previously, children mentions worked fine because they were natural (e.g., "his sons", "the boys") without redundant ethnicity injection.

## Solution

**Remove ethnicity injection for children references only** - keep children mentions natural and preserve main character ethnicity injection.

**File:** `src/lib/imagen/promptOptimizer.ts`

### Targeted Fix

Remove the ethnicity injection code for children (lines 67-81) while keeping main character ethnicity injection:

```typescript
// KEEP: Main character ethnicity injection (lines 55-65)
params.characterReferences!.forEach(ref => {
  // ... ethnicity injection for main character ...
})

// REMOVE: Children ethnicity injection (lines 67-81)
// This entire block should be deleted:
// if (mainReference?.ethnicity) {
//   sceneDescription = sceneDescription.replace(...)
//   sceneDescription = sceneDescription.replace(...)
//   sceneDescription = sceneDescription.replace(...)
// }
```

### Result

- **Before:** "The African American man... He glances at a framed photo of four young African American boys, his African American sons"
- **After:** "The African American man... He glances at a framed photo of four young boys, his sons"

Benefits:
- ✅ Main character ethnicity preserved (important for character matching)
- ✅ Children references remain natural (worked before, will work now)
- ✅ No redundant/explicit ethnicity that might trigger safety filter
- ✅ Scene strength preserved (no over-sanitization)

## Implementation Steps

1. Remove ethnicity injection block for children (lines 67-81)
2. Keep main character ethnicity injection (lines 55-65)
3. Test that prompt uses natural children references
4. Verify image generation succeeds without safety filter trigger

## Expected Result

- Prompt: Natural children references without redundant ethnicity
- Main character: ✅ "The African American man" (ethnicity preserved)
- Children: ✅ "his sons" (natural, no redundant ethnicity)
- Safety filter: ✅ Not triggered
- Image generation: ✅ Succeeds

