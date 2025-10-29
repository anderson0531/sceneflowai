# Fix Scene Description to Use Pronouns

## Problem

**Current (generating wrong ethnicity):**
```
BRIAN ANDERSON SR. in the style of the reference image GCS URL: gs://...
Scene: BRIAN ANDERSON SR., sits hunched over...
```

**Working format (from Gemini Chat):**
```
BRIAN ANDERSON SR. in the style of the reference image GCS URL: gs://...
Scene: He sits hunched over...
```

**Key difference:** Scene description repeats the character name "BRIAN ANDERSON SR.," but should use pronoun "He" instead.

## Solution

1. Keep the GCS URL in the prompt text (this works in Gemini Chat)
2. Replace character name in scene description with pronoun ("He" for single character)
3. Keep referenceImages array in parameters for API structure

**Updated prompt structure:**

```
BRIAN ANDERSON SR. in the style of the reference image GCS URL: gs://sceneflow-character-refs/characters/brian-anderson-sr-1761633490809.jpg.
Scene: He sits hunched over...
Qualifiers: photorealistic, professional photography, 8K resolution, studio lighting, sharp focus
```

## Implementation

Update `src/lib/imagen/promptOptimizer.ts` to:
1. Replace character name at start of scene description with pronoun
2. If multiple characters, handle appropriately
