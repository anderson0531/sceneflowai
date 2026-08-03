import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID || null
  const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1'
  
  const results: any = {
    ok: false,
    authMethod: 'oauth2',
    projectId,
    location,
    envVars: {
      VERTEX_PROJECT_ID: !!process.env.VERTEX_PROJECT_ID,
      VERTEX_LOCATION: !!process.env.VERTEX_LOCATION,
      GCP_PROJECT_ID: !!process.env.GCP_PROJECT_ID,
      GCP_REGION: !!process.env.GCP_REGION,
      GOOGLE_APPLICATION_CREDENTIALS_JSON: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    },
    serviceAccount: null,
    tokenTest: { ok: false },
    predictTest: { status: 0, ok: false },
    hints: []
  }

  try {
    // 1. Check environment
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      results.hints.push('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON - This is REQUIRED for Vertex AI authentication')
      return NextResponse.json(results, { status: 500 })
    }
    
    if (!projectId) {
      results.hints.push('Missing VERTEX_PROJECT_ID or GCP_PROJECT_ID - One is REQUIRED')
      return NextResponse.json(results, { status: 500 })
    }

    // 2. Parse service account
    try {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      results.serviceAccount = creds.client_email || 'unknown'
      results.credentialsProjectId = creds.project_id
    } catch {
      results.hints.push('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON - Check JSON syntax')
      return NextResponse.json(results, { status: 500 })
    }

    // 3. Get access token
    try {
      await getVertexAIAuthToken()
      results.tokenTest.ok = true
    } catch (error: any) {
      results.tokenTest.error = error.message
      results.hints.push(`Token acquisition failed: ${error.message}`)
      return NextResponse.json(results, { status: 500 })
    }

    // 4. Test the Gemini Image endpoint (Imagen endpoints were retired 2026-06-30)
    const model = GEMINI_IMAGE_MODELS.flash
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
    results.model = model
    results.testEndpoint = endpoint

    try {
      const token = await getVertexAIAuthToken()
      const testRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'test diagnostic image' }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '1:1' },
          },
        })
      })
      
      results.predictTest.status = testRes.status
      results.predictTest.ok = testRes.ok || testRes.status === 400
      
      if (!testRes.ok && testRes.status !== 400) {
        const text = await testRes.text()
        results.predictTest.error = text.slice(0, 500)
        
        if (testRes.status === 403) {
          results.hints.push(`IAM permission denied. Run: gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:${results.serviceAccount}" --role="roles/aiplatform.user"`)
        } else if (testRes.status === 404) {
          results.hints.push(`Model ${model} not found. Check that region ${location} serves Gemini Image.`)
        }
      } else {
        results.ok = true
      }
    } catch (error: any) {
      results.predictTest.error = error.message
    }

    results.ok = results.predictTest.ok
    
    if (results.ok) {
      results.hints.push('✅ OAuth2 working! Image generation should work.')
    }

    return NextResponse.json(results)
  } catch (error: any) {
    results.hints.push(`Unexpected error: ${error.message}`)
    return NextResponse.json(results, { status: 500 })
  }
}
