# Latest API Prompt for Gemini Chat Testing

## Exact Prompt from Latest API Request

Use this exact prompt in Gemini Chat for parallel testing:

```
BRIAN ANDERSON SR. in the style of the reference image GCS URL: gs://sceneflow-character-refs/characters/brian-anderson-sr-1761633490809.jpg.
Scene: He sits hunched over a large desk, multiple monitors displaying complex spreadsheets and graphs. His face is etched with exhaustion. He rubs his temples, a half-eaten, cold sandwich beside him. He glances at a framed photo of four young boys, his sons, then back to the glowing screens, a deep sigh escaping him.
Qualifiers: photorealistic, professional photography, 8K resolution, studio lighting, sharp focus
```

## Reference Image

**GCS URL:**
```
gs://sceneflow-character-refs/characters/brian-anderson-sr-1761633490809.jpg
```

**Public URL (for Gemini Chat upload):**
```
https://xxavfkdhdebrqida.public.blob.vercel-storage.com/character-refs/12bb4444-1bef-437e-ae1b-c43df87721b3/Brian%20Anderson%20Sr.-1761633490435.png
```

## Current API Results

- **Confidence:** 55% (increased from 30%, but still below 90% target)
- **Ethnicity:** ✅ Correct (African American)
- **Issues:**
  - Hair style and amount different (reference is bald)
  - Age appears slightly younger than reference
  - Facial expression doesn't match reference

## Full API Request (for reference)

Note: The API is now sending ONLY the prompt text (no structured `referenceImages` array) to match Gemini Chat behavior.

```json
{
  "instances": [
    {
      "prompt": "BRIAN ANDERSON SR. in the style of the reference image GCS URL: gs://sceneflow-character-refs/characters/brian-anderson-sr-1761633490809.jpg.\nScene: He sits hunched over a large desk, multiple monitors displaying complex spreadsheets and graphs. His face is etched with exhaustion. He rubs his temples, a half-eaten, cold sandwich beside him. He glances at a framed photo of four young boys, his sons, then back to the glowing screens, a deep sigh escaping him.\nQualifiers: photorealistic, professional photography, 8K resolution, studio lighting, sharp focus"
    }
  ],
  "parameters": {
    "model": "imagen-4.0-ultra-generate-001",
    "sampleCount": 1,
    "aspectRatio": "16:9",
    "negativePrompt": "elderly appearance, deeply wrinkled, aged beyond reference, geriatric, wrong age, different facial features, incorrect ethnicity, mismatched appearance, different person, celebrity likeness, child, teenager, youthful appearance",
    "safetySetting": "block_only_high",
    "personGeneration": "allow_adult"
  }
}
```

## Test Instructions

1. **In Gemini Chat:**
   - Upload the reference image using the public URL above
   - Paste the exact prompt text above
   - Generate image
   - Compare results with API (55% confidence, hair/age mismatches)

2. **Key Questions:**
   - Does Gemini Chat produce better hair matching (bald head)?
   - Does Gemini Chat produce correct age (late 50s)?
   - Does Gemini Chat produce matching facial expression?
   - If Gemini Chat works better, what's different about how it processes the GCS URL?

## Character Reference Details

- **Name:** Brian Anderson Sr.
- **Ethnicity:** African American ✅ (correct in API output)
- **Age:** Late 50s ⚠️ (appears younger in API output)
- **Hair:** Bald ⚠️ (hair mismatch in API output)
- **Beard:** Salt and pepper beard
- **Expression:** Wide smile (though scene shows exhaustion)
- **Skin Tone:** Medium brown
