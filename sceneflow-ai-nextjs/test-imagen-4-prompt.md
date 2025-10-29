# Imagen 4 Test Prompt for Gemini Chat

## Exact Prompt from API Request

Use this exact prompt text in Gemini Chat to test if Imagen 4 matches the reference image:

```
BRIAN ANDERSON SR. in the style of the reference image GCS URL: gs://sceneflow-character-refs/characters/brian-anderson-sr-1761633490809.jpg.
Scene: He sits hunched over a large desk, multiple monitors displaying complex spreadsheets and graphs. His face is etched with exhaustion. He rubs his temples, a half-eaten, cold sandwich beside him. He glances at a framed photo of four young boys, his sons, then back to the glowing screens, a deep sigh escaping him.
Qualifiers: photorealistic, professional photography, 8K resolution, studio lighting, sharp focus
```

## Reference Image

**GCS URL (if supported in Gemini Chat):**
```
gs://sceneflow-character-refs/characters/brian-anderson-sr-1761633490809.jpg
```

**Alternative Public URL:**
```
https://xxavfkdhdebrqida.public.blob.vercel-storage.com/character-refs/12bb4444-1bef-437e-ae1b-c43df87721b3/Brian%20Anderson%20Sr.-1761633490435.png
```

## Full API Request Structure

If testing via API directly, here's the full request body structure:

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
    "personGeneration": "allow_adult",
    "referenceImages": [
      {
        "referenceId": 1,
        "referenceImage": {
          "gcsUri": "gs://sceneflow-character-refs/characters/brian-anderson-sr-1761633490809.jpg"
        },
        "referenceType": "REFERENCE_TYPE_SUBJECT",
        "subjectConfig": {
          "subjectType": "SUBJECT_TYPE_PERSON",
          "subjectDescription": "An African American man in his late 50s, with a bald head, a salt and pepper beard, medium brown skin tone, and a wide smile."
        }
      }
    ]
  }
}
```

## Expected Character

- **Ethnicity:** African American
- **Age:** Late 50s
- **Hair:** Bald head
- **Beard:** Salt and pepper beard
- **Skin Tone:** Medium brown
- **Expression:** Wide smile (though scene shows exhaustion)

## Test Steps

1. **In Gemini Chat:**
   - Upload the reference image (use the public URL if GCS doesn't work)
   - Paste the prompt text above
   - Check if generated image matches ethnicity and features

2. **Expected Result:**
   - If Gemini Chat generates correctly but API doesn't → Issue is with API request structure
   - If both fail → Issue is with prompt format or reference image access
