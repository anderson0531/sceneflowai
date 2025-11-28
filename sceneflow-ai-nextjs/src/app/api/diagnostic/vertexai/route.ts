import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const results: any = {
    ok: false,
    authMethod: null,
    apiKey: null,
    modelTest: { status: 0, ok: false },
    hints: []
  }

  try {
    // Check for API key (preferred method - no IAM needed!)
    if (process.env.GOOGLE_API_KEY) {
      results.authMethod = 'api-key'
      results.apiKey = 'present'
      
      // Test Imagen 3 endpoint with API key
      const model = 'imagen-3.0-fast-generate-001'
      const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:predict`
      
      try {
        const testRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instances: [{ prompt: 'test diagnostic image' }],
            parameters: { sampleCount: 1, aspectRatio: '1:1' }
          })
        })
        
        results.modelTest.status = testRes.status
        // 200 = success, 400 = accessible but bad params (still counts as working)
        results.modelTest.ok = testRes.ok || testRes.status === 400
        
        if (!testRes.ok) {
          const text = await testRes.text()
          results.modelTest.error = text.slice(0, 300)
          
          if (testRes.status === 403) {
            results.hints.push('API key invalid or Vertex AI API not enabled in Google Cloud Console')
          } else if (testRes.status === 404) {
            results.hints.push('Model not found - ensure Vertex AI API is enabled')
          }
        }
      } catch (error: any) {
        results.modelTest.error = error.message
        results.hints.push(`Request failed: ${error.message}`)
      }
      
      results.ok = results.modelTest.ok
      
      if (results.ok) {
        results.hints.push('✅ API key authentication working! No IAM configuration needed.')
      }
      
    } else {
      results.authMethod = 'none'
      results.hints.push('Missing GOOGLE_API_KEY environment variable')
      results.hints.push('Add your Google Cloud API key to enable Vertex AI Imagen (no IAM needed!)')
    }

    return NextResponse.json(results)
  } catch (error: any) {
    results.hints.push(`Unexpected error: ${error.message}`)
    return NextResponse.json(results, { status: 500 })
  }
}
