/**
 * Translation Health Check Endpoint
 * 
 * Quick diagnostic to verify Vertex AI translation is working.
 * Tests both Translation LLM and standard NMT with a simple "Hello" → target language.
 * 
 * GET /api/translate/test?lang=es
 */

import { NextRequest, NextResponse } from 'next/server'
import { translateWithVertexAI } from '@/lib/vertexai/translate'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const targetLang = req.nextUrl.searchParams.get('lang') || 'es'
  const testText = 'Hello, how are you today? The weather is beautiful.'
  
  const startTime = Date.now()
  
  try {
    // Check env vars first
    const projectId = process.env.GCP_PROJECT_ID || process.env.VERTEX_PROJECT_ID
    const location = process.env.VERTEX_LOCATION || 'us-central1'
    const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    
    if (!projectId) {
      return NextResponse.json({
        status: 'error',
        error: 'GCP_PROJECT_ID / VERTEX_PROJECT_ID not configured',
        config: { projectId: null, location, hasCredentials }
      }, { status: 503 })
    }
    
    if (!hasCredentials) {
      return NextResponse.json({
        status: 'error',
        error: 'GOOGLE_APPLICATION_CREDENTIALS_JSON not configured',
        config: { projectId, location, hasCredentials }
      }, { status: 503 })
    }
    
    // Attempt translation
    const result = await translateWithVertexAI({
      text: testText,
      targetLanguage: targetLang,
      sourceLanguage: 'en'
    })
    
    const elapsed = Date.now() - startTime
    
    return NextResponse.json({
      status: 'ok',
      config: {
        projectId,
        location,
        hasCredentials: true,
        endpoint: `translate.googleapis.com/v3/projects/${projectId}/locations/${location}:translateText`,
        model: `projects/${projectId}/locations/${location}/models/general/translation-llm`
      },
      test: {
        sourceLanguage: 'en',
        targetLanguage: targetLang,
        input: testText,
        output: result.translatedText,
        detectedSource: result.detectedSourceLanguage
      },
      timing: {
        elapsedMs: elapsed,
        elapsedFormatted: `${(elapsed / 1000).toFixed(2)}s`
      }
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      config: {
        projectId: process.env.GCP_PROJECT_ID || process.env.VERTEX_PROJECT_ID,
        location: process.env.VERTEX_LOCATION || 'us-central1',
        hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      },
      timing: {
        elapsedMs: elapsed,
        elapsedFormatted: `${(elapsed / 1000).toFixed(2)}s`
      }
    }, { status: 500 })
  }
}
