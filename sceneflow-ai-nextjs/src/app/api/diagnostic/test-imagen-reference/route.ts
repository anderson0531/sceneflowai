import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { gcsUri, characterName, sceneDescription } = await req.json()
    
    if (!gcsUri || !characterName || !sceneDescription) {
      return NextResponse.json({ 
        error: 'Missing required fields: gcsUri, characterName, sceneDescription' 
      }, { status: 400 })
    }
    
    console.log('[Imagen Test] Testing with GCS reference:', gcsUri)
    
    // Test 1: Simple prompt without reference
    console.log('[Imagen Test] Test 1: Generating without reference...')
    const withoutRef = await callVertexAIImagen(
      `${sceneDescription}`,
      { aspectRatio: '16:9', numberOfImages: 1 }
    )
    
    // Test 2: Prompt with reference (need to add GCS support to callVertexAIImagen)
    // This will show if the API accepts GCS URIs
    console.log('[Imagen Test] Test 2: Generating with GCS reference...')
    
    // Note: This requires updating callVertexAIImagen to actually USE the referenceImages parameter
    // Currently it's defined but not used in the request body
    
    return NextResponse.json({
      success: true,
      withoutReference: !!withoutRef,
      message: 'Reference image support needs to be re-enabled in callVertexAIImagen'
    })
  } catch (error: any) {
    console.error('[Imagen Test] Error:', error)
    return NextResponse.json({
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}
