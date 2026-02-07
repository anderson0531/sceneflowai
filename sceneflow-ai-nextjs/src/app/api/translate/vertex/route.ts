/**
 * Vertex AI Translation API Endpoint
 * 
 * Uses Google Cloud Translation API v3 with service account authentication
 * to avoid API key rate limits that affect the v2 REST endpoint.
 * 
 * This endpoint mirrors the interface of /api/translate/google for easy migration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { translateWithVertexAI } from '@/lib/vertexai/translate'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, targetLanguage, sourceLanguage = 'en' } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required parameter: text' },
        { status: 400 }
      )
    }

    if (!targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required parameter: targetLanguage' },
        { status: 400 }
      )
    }

    console.log(`[Vertex Translate API] Request: ${sourceLanguage} -> ${targetLanguage}`)
    console.log(`[Vertex Translate API] Text length: ${text.length} characters`)

    const result = await translateWithVertexAI({
      text,
      targetLanguage,
      sourceLanguage
    })

    return NextResponse.json({
      translatedText: result.translatedText,
      detectedSourceLanguage: result.detectedSourceLanguage,
      sourceLanguage,
      targetLanguage
    })

  } catch (error: any) {
    console.error('[Vertex Translate API] Error:', error.message)
    
    // Check for specific error types
    if (error.message?.includes('not configured')) {
      return NextResponse.json(
        { error: 'Translation service not configured', details: error.message },
        { status: 503 }
      )
    }
    
    if (error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Translation authentication failed', details: error.message },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    )
  }
}
