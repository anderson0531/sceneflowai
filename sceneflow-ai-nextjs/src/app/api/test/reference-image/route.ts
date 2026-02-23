/**
 * ISOLATED TEST ENDPOINT: Verify Imagen API can read reference images
 * 
 * This test verifies the LINKING mechanism:
 * - The subject_description in referenceImages MUST match text in the prompt
 * - This is how the model knows which reference image applies to which person
 * 
 * Example:
 *   prompt: "A portrait of a man with curly hair..."
 *   subject_description: "a man with curly hair"  <- SAME TEXT
 * 
 * NOT:
 *   prompt: "A portrait of [1]..."
 *   subject_description: "Alex Anderson"  <- DOESN'T MATCH
 */

import { NextRequest, NextResponse } from 'next/server'
import { downloadImageAsBase64 } from '@/lib/storage/gcs'
import { generateLinkingDescription } from '@/lib/imagen/promptOptimizer'
import { getImagenSafetyFilterLevel, getImagenPersonGeneration } from '@/lib/vertexai/safety'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      gcsUri,              // GCS URI of the reference image
      subjectDescription,  // Optional: override the LINKING TEXT
      customPrompt,        // Optional: fully custom prompt (must contain subjectDescription text)
      appearanceDescription // Optional: character appearance to generate linking text from
    } = body

    if (!gcsUri) {
      return NextResponse.json({ 
        success: false, 
        error: 'gcsUri is required. Provide a GCS URI like gs://bucket/path/image.jpg' 
      }, { status: 400 })
    }

    // Generate linking description from appearance, or use provided, or default
    let linkingDescription = subjectDescription
    if (!linkingDescription && appearanceDescription) {
      linkingDescription = generateLinkingDescription(appearanceDescription)
      console.log('[Test Reference] Generated linking description from appearance:', linkingDescription)
    }
    if (!linkingDescription) {
      linkingDescription = 'a man with curly hair'  // Default for testing
    }

    console.log('[Test Reference] ========================================')
    console.log('[Test Reference] REFERENCE IMAGE LINKING TEST')
    console.log('[Test Reference] ========================================')
    console.log('[Test Reference] GCS URI:', gcsUri)
    console.log('[Test Reference] Linking Description:', linkingDescription)

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

    // Step 2: Build prompt with MATCHING TEXT
    // The key insight: subject_description text MUST appear in the prompt
    const prompt = customPrompt || `A professional portrait photograph of ${linkingDescription}. The person is looking directly at the camera with a neutral expression. The background is a simple grey studio backdrop. photorealistic, studio lighting, sharp focus, 8K resolution`
    
    console.log('[Test Reference] Step 2: Building API request with LINKED description...')
    console.log('[Test Reference] Prompt:', prompt)
    console.log('[Test Reference] Subject Description (MUST match text in prompt):', linkingDescription)
    console.log('[Test Reference] Text match check:', prompt.toLowerCase().includes(linkingDescription.toLowerCase()) ? '✓ MATCH' : '✗ NO MATCH')

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

    const projectId = credentials.project_id || 'gen-lang-client-0596406756'
    const region = 'us-central1'
    const model = 'imagen-3.0-capability-001'
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:predict`

    // Build request WITHOUT [1] markers - use TEXT MATCHING instead
    const requestBody = {
      instances: [{
        prompt: prompt,
        referenceImages: [{
          referenceType: 'REFERENCE_TYPE_SUBJECT',
          referenceId: 1,
          referenceImage: {
            bytesBase64Encoded: base64Data
          },
          subjectImageConfig: {
            subjectType: 'SUBJECT_TYPE_PERSON',
            subjectDescription: linkingDescription  // SAME TEXT as in prompt
          }
        }]
      }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        safetySetting: getImagenSafetyFilterLevel(),
        personGeneration: getImagenPersonGeneration()
      }
    }

    console.log('[Test Reference] Step 3: Sending request to Imagen API...')
    console.log('[Test Reference] Request structure:')
    console.log(JSON.stringify({
      instances: [{
        prompt: prompt.substring(0, 100) + '...',
        referenceImages: [{
          referenceType: 'REFERENCE_TYPE_SUBJECT',
          referenceId: 1,
          referenceImage: { bytesBase64Encoded: `[${base64Data.length} chars]` },
          subjectImageConfig: {
            subjectType: 'SUBJECT_TYPE_PERSON',
            subjectDescription: linkingDescription
          }
        }]
      }],
      parameters: requestBody.parameters
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

    if (!result.predictions || result.predictions.length === 0 || !result.predictions[0].bytesBase64Encoded) {
      console.error('[Test Reference] ✗ No image in response')
      return NextResponse.json({ 
        success: false, 
        error: 'No image data in response',
        response: result
      }, { status: 500 })
    }

    const prediction = result.predictions[0]
    console.log('[Test Reference] ✓ Image generated successfully!')

    const imageDataUrl = `data:${prediction.mimeType};base64,${prediction.bytesBase64Encoded}`

    return NextResponse.json({
      success: true,
      message: 'Reference image test completed - compare generated image to reference!',
      linkingMechanism: {
        explanation: 'The subject_description text must appear in the prompt to link the reference image',
        subjectDescription: linkingDescription,
        appearsInPrompt: prompt.toLowerCase().includes(linkingDescription.toLowerCase())
      },
      test: {
        gcsUri,
        prompt,
        subjectDescription: linkingDescription,
        elapsedMs: elapsed
      },
      generatedImage: imageDataUrl
    })

  } catch (error: any) {
    console.error('[Test Reference] ✗ Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test/reference-image',
    method: 'POST',
    description: 'Test reference image LINKING mechanism',
    keyInsight: 'The subject_description text MUST appear in the prompt. This is how the model links the reference image to the correct person in the scene.',
    example: {
      gcsUri: 'gs://sceneflow-character-refs/characters/alex-anderson-1764493450843.jpg',
      subjectDescription: 'a young man with curly dark hair and a beard'
    },
    wrongApproach: {
      prompt: 'A photo of [1] sitting at a table',
      subjectDescription: 'Alex Anderson',
      problem: '[1] and "Alex Anderson" are not the same text - no link!'
    },
    correctApproach: {
      prompt: 'A photo of a young man with curly dark hair sitting at a table',
      subjectDescription: 'a young man with curly dark hair',
      solution: 'Same text in both = model knows which reference image to use'
    }
  })
}
