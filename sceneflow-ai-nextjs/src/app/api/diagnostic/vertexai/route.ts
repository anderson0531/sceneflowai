import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const results: any = {
    ok: false,
    authMethod: 'oauth2',
    projectId: process.env.GCP_PROJECT_ID || null,
    region: process.env.GCP_REGION || 'us-central1',
    serviceAccount: null,
    tokenTest: { ok: false },
    predictTest: { status: 0, ok: false },
    hints: []
  }

  try {
    // 1. Check environment
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      results.hints.push('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON')
      return NextResponse.json(results, { status: 500 })
    }
    
    if (!results.projectId) {
      results.hints.push('Missing GCP_PROJECT_ID')
      return NextResponse.json(results, { status: 500 })
    }

    // 2. Parse service account
    try {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      results.serviceAccount = creds.client_email || 'unknown'
    } catch {
      results.hints.push('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON')
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

    // 4. Test predict endpoint
    const model = 'imagen-3.0-fast-generate-001'
    const endpoint = `https://${results.region}-aiplatform.googleapis.com/v1/projects/${results.projectId}/locations/${results.region}/publishers/google/models/${model}:predict`
    
    try {
      const token = await getVertexAIAuthToken()
      const testRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instances: [{ prompt: 'test' }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' }
        })
      })
      
      results.predictTest.status = testRes.status
      results.predictTest.ok = testRes.ok || testRes.status === 400
      
      if (!testRes.ok && testRes.status !== 400) {
        const text = await testRes.text()
        results.predictTest.error = text.slice(0, 300)
        
        if (testRes.status === 403) {
          results.hints.push(`Run: gcloud projects add-iam-policy-binding ${results.projectId} --member="serviceAccount:${results.serviceAccount}" --role="roles/aiplatform.user"`)
        }
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
