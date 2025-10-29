# Use HTTPS URL and Inject Ethnicity in Scene Description

## Problems Identified

1. **GCS URLs don't work in prompts:**
   - ❌ GCS URL (`gs://...`): Doesn't work
   - ✅ Public HTTPS URL: Works perfectly

2. **Missing ethnicity causes model to default to Caucasian:**
   - When scene says "BRIAN ANDERSON SR., mid-sixties" and we replace with "He"
   - Model loses connection to reference image ethnicity
   - Defaults to Caucasian when ethnicity isn't explicit

## Solution

### 1. Use HTTPS URL in Prompt Text

**File:** `src/lib/imagen/promptOptimizer.ts`

```typescript
// Use HTTPS URL for prompt text (GCS doesn't work)
const imageUrl = ref.imageUrl || ref.description
const urlType = ref.imageUrl ? 'URL' : ''
return `${ref.name.toUpperCase()} in the style of the reference image ${urlType}: ${imageUrl}.`
```

### 2. Inject Ethnicity When Replacing Character Name

**File:** `src/lib/imagen/promptOptimizer.ts`

When replacing character name with "He", inject ethnicity:
```typescript
// Replace "BRIAN ANDERSON SR., mid-sixties" with "He, an African American man, mid-sixties"
// OR: "The African American man sits..."
```

### 3. Inject Ethnicity for Children/Family

Detect phrases like "four young boys, his sons" → "four young African American boys, his sons"

### 4. Pass Character Data to Prompt Optimizer

**File:** `src/app/api/scene/generate-image/route.ts`

Pass ethnicity and other character data:
```typescript
return {
  referenceId: idx + 1,
  name: char.name,
  description: `${description}${ageClause}`,
  imageUrl: char.referenceImage,      // HTTPS URL for prompt
  gcsUri: char.referenceImageGCS,     // Keep for structured array
  ethnicity: char.ethnicity           // NEW: For ethnicity injection
}
```

## Implementation Steps

1. Update `OptimizePromptParams` to include `imageUrl` and `ethnicity`
2. Update prompt optimizer to use `imageUrl` instead of `gcsUri`
3. Inject ethnicity when replacing character name with pronoun
4. Inject ethnicity for children/family members in scene
5. Update scene generation to pass `referenceImage` and `ethnicity`
6. Test and verify improved character matching

## Expected Result

**Before:**
```
BRIAN ANDERSON SR. in the style of reference image GCS URL: gs://...
Scene: He sits hunched over... He glances at a framed photo of four young boys...
```

**After:**
```
BRIAN ANDERSON SR. in the style of reference image URL: https://...
Scene: The African American man, mid-sixties, sits hunched over... He glances at a framed photo of four young African American boys, his sons...
```

- Public HTTPS URL (works)
- Explicit ethnicity for main character
- Explicit ethnicity for children
- Proper character matching (≥90% confidence)
