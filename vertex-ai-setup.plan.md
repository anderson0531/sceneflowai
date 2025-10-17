# Set Up Vertex AI for Imagen Image Generation

## Overview

Configure Vertex AI API for Imagen image generation using service account authentication. This replaces the simple Gemini API approach with a more robust, production-ready solution.

## Prerequisites

- Google Cloud Platform account
- Billing enabled on GCP project
- Access to GCP Console

## Part 1: Google Cloud Platform Setup (You Do This)

### Step 1: Enable Vertex AI API

1. Go to https://console.cloud.google.com
2. Select your project (or create a new one)
3. Go to **APIs & Services** → **Library**
4. Search for **"Vertex AI API"**
5. Click **Enable**
6. Also enable **"Cloud AI Platform API"** if prompted

### Step 2: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Fill in details:
   - **Name**: `sceneflow-vertex-ai`
   - **Description**: `Service account for SceneFlow AI Vertex AI access`
4. Click **Create and Continue**

### Step 3: Grant Permissions

On the **Grant permissions** screen, add these roles:
- `Vertex AI User` (required for API access)
- `AI Platform Admin` (optional, for broader access)
- `Storage Object Viewer` (if using GCS for images)

Click **Continue** → **Done**

### Step 4: Create and Download JSON Key

1. Find your new service account in the list
2. Click the **⋮** (three dots) → **Manage keys**
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create**
6. A JSON file will download (e.g., `sceneflow-vertex-ai-abc123.json`)
7. **Keep this file secure!**

### Step 5: Get Your GCP Project ID

1. In GCP Console, look at the top navigation bar
2. Your project ID is shown next to the project name (e.g., `my-project-12345`)
3. Copy this ID - you'll need it

## Part 2: Vercel Environment Configuration (You Do This)

### Add Environment Variables in Vercel

1. Go to Vercel Dashboard → **sceneflow-ai-nextjs** → **Settings** → **Environment Variables**

2. **Add `GOOGLE_APPLICATION_CREDENTIALS_JSON`**:
   - **Name**: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - **Value**: Copy the **entire contents** of the JSON file you downloaded
   - **Environments**: Production, Preview, Development (all)
   - Click **Save**

3. **Add `GCP_PROJECT_ID`**:
   - **Name**: `GCP_PROJECT_ID`
   - **Value**: Your GCP project ID (e.g., `my-project-12345`)
   - **Environments**: Production, Preview, Development (all)
   - Click **Save**

4. **Add `GCP_REGION`** (optional):
   - **Name**: `GCP_REGION`
   - **Value**: `us-central1` (or your preferred region)
   - **Environments**: Production, Preview, Development (all)
   - Click **Save**

## Part 3: Code Implementation (I'll Do This)

### 1. Install Google Auth Library

**File**: `package.json`

Add dependency:
```json
{
  "dependencies": {
    "google-auth-library": "^9.0.0"
  }
}
```

### 2. Create Vertex AI Helper

**New file**: `src/lib/vertexai/client.ts`

```typescript
import { GoogleAuth } from 'google-auth-library'

let authClient: any = null

export async function getVertexAIAuthToken(): Promise<string> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
  }

  if (!authClient) {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })
    
    authClient = await auth.getClient()
  }

  const accessToken = await authClient.getAccessToken()
  return accessToken.token
}

export async function callVertexAIImagen(
  prompt: string,
  options: {
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4'
    numberOfImages?: number
    negativePrompt?: string
  } = {}
): Promise<string> {
  const projectId = process.env.GCP_PROJECT_ID
  const region = process.env.GCP_REGION || 'us-central1'
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID not configured')
  }

  const accessToken = await getVertexAIAuthToken()
  
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagegeneration@006:predict`
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{
        prompt: prompt
      }],
      parameters: {
        sampleCount: options.numberOfImages || 1,
        aspectRatio: options.aspectRatio || '16:9',
        negativePrompt: options.negativePrompt || '',
        safetySetting: 'block_few',
        personGeneration: 'allow_all'
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vertex AI error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  // Extract base64 image from response
  const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded
  if (!imageBytes) {
    throw new Error('No image data in Vertex AI response')
  }

  return `data:image/png;base64,${imageBytes}`
}
```

### 3. Update Thumbnail Generation Route

**File**: `src/app/api/projects/generate-thumbnail/route.ts`

Replace Gemini multi-model approach with Vertex AI:

```typescript
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'

export async function POST(request: NextRequest) {
  try {
    const { projectId, userApiKey } = await request.json()
    
    // Load project and generate prompt...
    const prompt = `...` // Your existing prompt logic
    
    console.log('[Thumbnail] Generating with Vertex AI Imagen...')
    
    // Call Vertex AI Imagen
    const base64Image = await callVertexAIImagen(prompt, {
      aspectRatio: '16:9',
      numberOfImages: 1
    })
    
    // Upload to Vercel Blob
    const blobUrl = await uploadImageToBlob(
      base64Image,
      `thumbnails/${projectId}-${Date.now()}.png`
    )
    
    // Update project with thumbnail URL
    await project.update({
      metadata: {
        ...project.metadata,
        thumbnailUrl: blobUrl
      }
    })
    
    return NextResponse.json({
      success: true,
      imageUrl: blobUrl,
      model: 'imagegeneration@006',
      provider: 'vertex-ai',
      storageType: 'vercel-blob'
    })
    
  } catch (error: any) {
    console.error('[Thumbnail] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
```

### 4. Install Dependencies

Run after updating package.json:
```bash
npm install google-auth-library
```

## Part 4: Testing

### Test Vertex AI Connection

1. Deploy with new code
2. Try generating a thumbnail
3. Check logs for:
   ```
   [Thumbnail] Generating with Vertex AI Imagen...
   [Thumbnail] Image uploaded to Vercel Blob
   ```

### Verify in GCP

1. Go to GCP Console → **Vertex AI** → **Model Garden**
2. Check **API Requests** for activity
3. Monitor **Billing** to track usage

## Benefits of Vertex AI

✅ **Production-ready** - Official Google Cloud service  
✅ **Imagen support** - Access to latest Imagen models  
✅ **Better reliability** - No experimental API limitations  
✅ **BYOK ready** - Service accounts can be user-specific  
✅ **Scalable** - Built for enterprise use  

## BYOK Future Implementation

When ready for BYOK (at 80% completion):

1. Allow users to upload their own service account JSON
2. Store encrypted in database
3. Use user's credentials instead of platform credentials
4. Each user uses their own GCP billing

## Costs

**Imagen pricing (approximate):**
- $0.02 - $0.04 per image
- Cheaper than DALL-E 3 ($0.04-$0.08)
- Pay only for what you use

## Security Notes

- Service account JSON contains private keys - **never commit to git**
- Store in Vercel environment variables only
- Rotate keys periodically
- Monitor GCP billing and usage

## Troubleshooting

**If you get "permission denied":**
- Verify service account has "Vertex AI User" role
- Check API is enabled in your GCP project

**If you get "quota exceeded":**
- Check GCP quotas at **IAM & Admin** → **Quotas**
- Request quota increase if needed

**If you get "model not found":**
- Verify Imagen is available in your selected region
- Try `us-central1` (most features available)

## Implementation Order

1. ✅ You: Enable Vertex AI API in GCP
2. ✅ You: Create service account and download JSON
3. ✅ You: Add environment variables to Vercel
4. ✅ I: Install google-auth-library
5. ✅ I: Create Vertex AI helper module
6. ✅ I: Update thumbnail generation route
7. ✅ I: Test and verify
8. ✅ You: Test thumbnail generation in production

---

**Once you've completed Part 1 (GCP setup) and Part 2 (Vercel env vars), let me know and I'll implement Part 3 (code changes)!**

