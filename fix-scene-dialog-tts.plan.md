# Fix Imagen 4 Reference Image Linking in Prompt

## Problem

The API request succeeds, but Imagen 4 **ignores the reference images** because the prompt doesn't explicitly tell the model to USE the reference for the character.

**Current prompt:**
```
Scene: BRIAN ANDERSON SR., sits hunched over...
Featuring: Brian Anderson Sr.
```

**Problem:** The model doesn't know to link "Brian Anderson Sr." to the reference image. It treats references as metadata and generates based on text only.

**Result:** 30% confidence, ethnicity mismatch.

## Solution

Update the prompt to explicitly mention the character matches the provided reference image.

**File:** `src/lib/imagen/promptOptimizer.ts`

Update REFERENCE MODE to explicitly state the character should match the reference:

```typescript
const prompt = `Scene: ${cleanedAction}
    
Character Brian Anderson Sr. matches the provided reference image.

${visualStyle}`
```

Or more explicitly:
```typescript
const prompt = `Scene: ${cleanedAction}
    
The character ${characterNames} should exactly match the provided reference image in facial features, ethnicity, and physical appearance.

${visualStyle}`
```

## Implementation

Update the REFERENCE MODE prompt in `optimizePromptForImagen` function to add explicit instruction to match the reference.
