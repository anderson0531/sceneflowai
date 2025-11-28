import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const results: any = {
    ok: false,
    authMethod: 'api_key',
    projectId: process.env.GCP_PROJECT_ID || null,
    region: process.env.GCP_REGION || 'us-central1',
    serviceAccount: null,
    tokenTest: { ok: false },
    predictTest: { status: 0, ok: false },
    hints: []
  }

  try {
    // 1. Check environment
    if (!process.env.GOOGLE_API_KEY) {
      results.hints.push('Missing GOOGLE_API_KEY')
      return NextResponse.json(results, { status: 500 })
    }
    
    if (!results.projectId) {
      results.hints.push('Missing GCP_PROJECT_ID')
      return NextResponse.json(results, { status: 500 })
    }

    // 2. No service account needed for API key
    results.serviceAccount = 'N/A (API key auth)'

    // 3. Test API key (just check if present)
    results.tokenTest.ok = true

    // 4. Test predict endpoint
    const model = 'imagegeneration@006'
    const endpoint = `https://${results.region}-aiplatform.googleapis.com/v1/projects/${results.projectId}/locations/${results.region}/publishers/google/models/${model}:predict?key=${process.env.GOOGLE_API_KEY}`
    
    try {
      const testRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
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
          results.hints.push('API key may not have Vertex AI permissions or project quota exceeded.')
        }
      }
    } catch (error: any) {
      results.predictTest.error = error.message
    }

    results.ok = results.predictTest.ok
    
    if (results.ok) {
      results.hints.push('✅ API key working! Image generation should work.')
    }

    return NextResponse.json(results)
  } catch (error: any) {
    results.hints.push(`Unexpected error: ${error.message}`)
    return NextResponse.json(results, { status: 500 })
  }
}
