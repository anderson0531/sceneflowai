# Migration: Vertex AI → Gemini API Studio

**Date:** December 2025  
**Status:** ✅ Complete  
**Impact:** Breaking change - requires new API key

## Overview

SceneFlow AI has migrated from Google Cloud Platform (Vertex AI) to Gemini API Studio for image generation. This simplifies operations, reduces costs, and consolidates services under a single API key.

## What Changed

### Image Generation
- **Before:** Vertex AI Imagen 3.0 (Capability & Generate models)
- **After:** Gemini 3 Pro Image Preview (`gemini-3-pro-image-preview`)

### Authentication
- **Before:** Service account JSON (`GOOGLE_APPLICATION_CREDENTIALS_JSON`) + GCP Project ID
- **After:** Simple API key (`GEMINI_API_KEY`)

### Character References
- **Before:** Vertex AI Capability model - up to multiple reference images
- **After:** Gemini 3 Pro Image - up to 5 reference images with character consistency

### Storage
- **Before:** Google Cloud Storage (GCS) for character reference images
- **After:** Vercel Blob storage (HTTP URLs directly accessible)

## Benefits

1. **Simplified Setup:** One API key instead of service account JSON
2. **Lower Cost:** Gemini API Studio pricing is more cost-effective
3. **Account Consolidation:** Use Gemini Ultra account instead of separate GCP billing
4. **Better Results:** Scene generation with references works better (as confirmed by user testing)
5. **No Infrastructure:** No GCS bucket management needed

## Migration Steps

### 1. Get Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create or select a project
3. Generate an API key
4. Copy the key (format: `AIzaSy...`)

### 2. Update Environment Variables

**Add:**
```bash
GEMINI_API_KEY=AIzaSyDEvVcDZKvdQF7YK8MjjlKUde9LxyBsW3c
```

**Remove (no longer needed):**
```bash
# GOOGLE_APPLICATION_CREDENTIALS_JSON=
# GCP_PROJECT_ID=
# GCP_REGION=
# GCS_BUCKET_NAME=
```

### 3. Updated Files

**New:**
- `/src/lib/gemini/imageClient.ts` - Gemini API image generation client

**Modified:**
- `/src/app/api/scene/generate-image/route.ts` - Uses `generateImageWithGemini`
- `/src/app/api/projects/generate-thumbnail/route.ts` - Uses `generateImageWithGemini`
- `/env.example` - Updated with new env var requirements
- `/README.md` - Updated setup instructions

**Deprecated (kept for backward compatibility):**
- `/src/lib/vertexai/client.ts` - Vertex AI client (no longer used)
- `/src/lib/storage/gcs.ts` - GCS client (no longer used)

## API Differences

### Request Format

**Vertex AI:**
```typescript
{
  instances: [{
    prompt: "...",
    referenceImages: [{
      referenceType: "REFERENCE_TYPE_SUBJECT",
      referenceId: 1,
      referenceImage: { bytesBase64Encoded: "..." },
      subjectImageConfig: {
        subjectType: "SUBJECT_TYPE_PERSON",
        subjectDescription: "..."
      }
    }]
  }],
  parameters: {
    sampleCount: 1,
    aspectRatio: "16:9"
  }
}
```

**Gemini API:**
```typescript
{
  contents: [{
    parts: [
      { text: "..." },
      { inline_data: { mime_type: "image/jpeg", data: "..." } }
    ]
  }],
  generationConfig: {
    response_modalities: ["IMAGE"],
    image_config: {
      aspect_ratio: "16:9",
      image_size: "1K"
    }
  }
}
```

### Response Format

**Vertex AI:**
```typescript
{
  predictions: [{
    bytesBase64Encoded: "..."
  }]
}
```

**Gemini API:**
```typescript
{
  candidates: [{
    content: {
      parts: [{
        inline_data: {
          mime_type: "image/png",
          data: "..."
        }
      }]
    }
  }]
}
```

## Features Comparison

| Feature | Vertex AI | Gemini API | Notes |
|---------|-----------|------------|-------|
| **Authentication** | Service Account JSON | API Key | ✅ Simpler |
| **Endpoint** | Regional (e.g., us-central1) | Global | ✅ Better availability |
| **Max Reference Images** | Unlimited (practical) | 5 for characters | ⚠️ Limit applies |
| **Aspect Ratios** | 1:1, 9:16, 16:9, 4:3, 3:4 | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 | ✅ More options |
| **Image Quality** | 'max', 'auto' | '1K', '2K', '4K' | ✅ Explicit resolution |
| **Negative Prompts** | Supported | Not supported | ⚠️ Removed |
| **Cost** | $0.02-0.12/image | Token-based (~$0.04/image) | ✅ More cost-effective |

## Testing

### Scene Generation with Characters
```bash
POST /api/scene/generate-image
{
  "prompt": "John standing in a modern office, professional lighting",
  "characterObjects": [
    {
      "name": "John",
      "referenceImage": "https://blob.vercel-storage.com/...",
      "visionDescription": "middle-aged man with grey beard and glasses"
    }
  ],
  "aspectRatio": "16:9"
}
```

### Thumbnail Generation
```bash
POST /api/projects/generate-thumbnail
{
  "projectId": "123",
  "description": "A sci-fi thriller about AI consciousness",
  "title": "Neural Dreams",
  "genre": "Sci-Fi"
}
```

## Rollback Plan

If issues arise:

1. Revert to commit before migration
2. Restore `GOOGLE_APPLICATION_CREDENTIALS_JSON` and `GCP_PROJECT_ID`
3. Restore GCS bucket access
4. Redeploy

## Notes

- ✅ Build succeeded with no TypeScript errors
- ✅ All image generation routes updated
- ✅ Environment variables simplified
- ✅ Documentation updated
- ⚠️ 5 reference image limit (down from unlimited) - should be sufficient for most scenes
- ⚠️ Negative prompts no longer supported - rely on descriptive prompts instead

## Support

For issues:
1. Check API key is valid: https://aistudio.google.com/apikey
2. Verify `GEMINI_API_KEY` is set in environment
3. Check logs for `[Gemini Image]` prefix
4. Review Gemini API docs: https://ai.google.dev/gemini-api/docs/image-generation
