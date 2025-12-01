/**
 * ISOLATED TEST ENDPOINT: Verify Imagen API can read reference images
 * 
 * This test uses the SIMPLEST possible prompt to verify:
 * 1. Base64 images are correctly encoded
 * 2. The API can interpret reference images
 * 3. The [1] marker correctly links to referenceId: 1
 * 
 * Test prompt: "A portrait photo of [1]"
 * Expected: The generated image should look like the reference image
 */

import { NextRequest, NextResponse } from 'next/server'
import { downloadImageAsBase64 } from '@/lib/storage/gcs'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      gcsUri,           // GCS URI of the reference image
      testPrompt,       // Optional: custom test prompt (defaults to simple portrait)
      subjectDescription // Optional: subject description (defaults to "a person")
    } = body

    if (!gcsUri) {
      return NextResponse.json({ 
        success: false, 
        error: 'gcsUri is required. Provide a GCS URI like gs://bucket/path/image.jpg' 
      }, { status: 400 })
    }

    console.log('[Test Reference] ========================================')
    console.log('[Test Reference] ISOLATED REFERENCE IMAGE TEST')
    console.log('[Test Reference] ========================================')
    console.log('[Test Reference] GCS URI:', gcsUri)

    // Step 1: Download and validate the image
    console.log('[Test Reference] Step 1: Downloading image from GCS...')
    let base64Data: string
    try {
      base64Data = await downloadImageAsBase64(gcsUri)
      console.log('[Test Reference] ✓ Image downloaded:', base64Data.length, 'base64 chars')
    } catch (error: any) {
      console.error('[Test Reference] ✗ Failed to download image:', error.message)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to download image: ${error.message}` 
      }, { status: 500 })
    }

    // Step 2: Build the SIMPLEST possible API request
    const simplePrompt = testPrompt || 'A professional portrait photo of [1]. The person is looking directly at the camera with a neutral expression. photorealistic, studio lighting, sharp focus'
    const description = subjectDescription || 'a person'
    
    console.log('[Test Reference] Step 2: Building minimal API request...')
    console.log('[Test Reference] Prompt:', simplePrompt)
    console.log('[Test Reference] Subject Description:', description)

    // Get access token
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}')
    const { GoogleAuth } = await import('google-auth-library')
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })
    const accessToken = await auth.getAccessToken()

    if (!accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to get Google access token' 
      }, { status: 500 })
    }

    // Build the request - EXACTLY matching Google's documentation
    const projectId = credentials.project_id || 'gen-lang-client-0596406756'
    const region = 'us-central1'
    const model = 'imagen-3.0-capability-001'
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:predict`

    const requestBody = {
      instances: [{
        prompt: simplePrompt,
        referenceImages: [{
          referenceType: 'REFERENCE_TYPE_SUBJECT',
          referenceId: 1,
          referenceImage: {
            bytesBase64Encoded: base64Data
          },
          subjectImageConfig: {
            subjectType: 'SUBJECT_TYPE_PERSON',
            subjectDescription: description
          }
        }]
      }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',  // Square for portrait
        safetySetting: 'block_some',
        personGeneration: 'allow_adult'
      }
    }

    console.log('[Test Reference] Step 3: Sending request to Imagen API...')
    console.log('[Test Reference] Endpoint:', endpoint)
    console.log('[Test Reference] Request structure:')
    console.log(JSON.stringify({
      ...requestBody,
      instances: [{
        prompt: requestBody.instances[0].prompt,
        referenceImages: [{
          referenceType: 'REFERENCE_TYPE_SUBJECT',
          referenceId: 1,
          referenceImage: { bytesBase64Encoded: `[${base64Data.length} chars]` },
          subjectImageConfig: requestBody.instances[0].referenceImages[0].subjectImageConfig
        }]
      }]
    }, null, 2))

    const startTime = Date.now()
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const elapsed = Date.now() - startTime
    console.log('[Test Reference] Response received in', elapsed, 'ms')
    console.log('[Test Reference] Status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Test Reference] ✗ API Error:', errorText)
      return NextResponse.json({ 
        success: false, 
        error: `API Error: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status })
    }

    const result = await response.json()
    console.log('[Test Reference] ✓ Response keys:', Object.keys(result))

    if (!result.predictions || result.predictions.length === 0) {
      console.error('[Test Reference] ✗ No predictions in response')
      return NextResponse.json({ 
        success: false, 
        error: 'No predictions returned',
        response: result
      }, { status: 500 })
    }

    const prediction = result.predictions[0]
    if (!prediction.bytesBase64Encoded) {
      console.error('[Test Reference] ✗ No image data in prediction')
      return NextResponse.json({ 
        success: false, 
        error: 'No image data in prediction',
        prediction: { mimeType: prediction.mimeType, hasBytes: false }
      }, { status: 500 })
    }

    console.log('[Test Reference] ✓ Image generated successfully!')
    console.log('[Test Reference] Output size:', prediction.bytesBase64Encoded.length, 'base64 chars')
    console.log('[Test Reference] MIME type:', prediction.mimeType)

    // Return the generated image as base64 data URL
    const imageDataUrl = `data:${prediction.mimeType};base64,${prediction.bytesBase64Encoded}`

    return NextResponse.json({
      success: true,
      message: 'Reference image test completed successfully',
      test: {
        gcsUri,
        prompt: simplePrompt,
        subjectDescription: description,
        inputImageSize: base64Data.length,
        outputImageSize: prediction.bytesBase64Encoded.length,
        elapsedMs: elapsed
      },
      // Return both the input reference and output for comparison
      referenceImagePreview: `data:image/jpeg;base64,${base64Data.substring(0, 100)}...`,
      generatedImage: imageDataUrl
    })

  } catch (error: any) {
    console.error('[Test Reference] ✗ Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

/**
 * GET endpoint to show usage instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test/reference-image',
    method: 'POST',
    description: 'Isolated test to verify Imagen API can read reference images',
    usage: {
      required: {
        gcsUri: 'GCS URI of the reference image (e.g., gs://sceneflow-character-refs/characters/alex-anderson-1764493450843.jpg)'
      },
      optional: {
        testPrompt: 'Custom prompt (default: "A professional portrait photo of [1]...")',
        subjectDescription: 'Subject description (default: "a person")'
      }
    },
    example: {
      gcsUri: 'gs://sceneflow-character-refs/characters/alex-anderson-1764493450843.jpg',
      subjectDescription: 'a young man with curly hair'
    },
    expectedResult: 'If working correctly, the generated image should look like the reference image'
  })
}
