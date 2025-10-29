# Gemini Chat Test Prompt for Imagen 4 Reference Images

## Request Details

Use this exact prompt structure to test in Gemini Chat (with image upload):

### Prompt Text:
```
Scene: BRIAN ANDERSON SR., sits hunched over a large desk, multiple monitors displaying complex spreadsheets and graphs. His face is etched with exhaustion. He rubs his temples, a half-eaten, cold sandwich beside him. He glances at a framed photo of four young boys, his sons, then back to the glowing screens, a deep sigh escaping him.

Featuring: Brian Anderson Sr.

photorealistic, professional photography, 8K resolution, studio lighting, sharp focus
```

### Reference Image URL (GCS):
```
gs://sceneflow-character-refs/characters/brian-anderson-sr-1761633490809.jpg
```

### Subject Description:
```
An African American man in his late 50s, with a bald head, a salt and pepper beard, medium brown skin tone, and a wide smile.
```

## Test Steps

1. Open Gemini Chat (chat.google.com)
2. Upload the reference image (or provide the GCS URL if supported)
3. Enter the prompt text above
4. Check if the generated image matches the reference character

## Alternative: Use Vercel Blob URL

If GCS URL doesn't work in Gemini Chat, try this public URL instead:

```
https://xxavfkdhdebrqida.public.blob.vercel-storage.com/character-refs/12bb4444-1bef-437e-ae1b-c43df87721b3/Brian%20Anderson%20Sr.-1761633490435.png
```

This is the public Vercel Blob URL that's also stored for this character.

## Expected Result

If Gemini Chat generates an accurate match (correct ethnicity, facial features, age) but our Imagen 4 API doesn't, then the issue is with our API request structure (not the prompt or reference image).
