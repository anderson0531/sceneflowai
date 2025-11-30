import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { artStylePresets } from '@/constants/artStylePresets'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getCharacterAttributes } from '../../../../lib/character/persistence'
import { analyzeCharacterImage } from '@/lib/imagen/visionAnalyzer'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // DEBUG: Log the ENTIRE request body to see exactly what the client sent
    console.log('[Character Image] ========== FULL REQUEST BODY ==========')
    console.log(JSON.stringify(body, null, 2))
    console.log('[Character Image] ========================================')
    
    const { prompt, projectId, characterId, quality = 'auto', artStyle, rawMode } = body
    
    // Use user prompt directly - NO modifications
    const finalPrompt = prompt?.trim() || ''

    if (!finalPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // SIMPLIFIED: Just use the prompt as-is. No filtering, no optimization.
    const enhancedPrompt = finalPrompt

    console.log('[Character Image] ========== PROMPT COMPARISON ==========')
    console.log('[Character Image] Received prompt length:', prompt?.length || 0)
    console.log('[Character Image] Final prompt length:', enhancedPrompt.length)
    console.log('[Character Image] Prompts identical:', prompt === enhancedPrompt)
    console.log('[Character Image] FULL PROMPT SENT TO MODEL:')
    console.log(enhancedPrompt)
    console.log('[Character Image] =======================================')

    // Generate with Vertex AI (1:1 for portrait)
    const base64Image = await callVertexAIImagen(enhancedPrompt, {
      aspectRatio: '1:1',
      numberOfImages: 1,
      quality: quality // Pass quality setting
    })
    
    // Upload to Vercel Blob
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `characters/char-${Date.now()}.png`
    )
    
    // AUTO-ANALYZE: Extract detailed description using Gemini Vision
    let visionDescription = null
    try {
      const characterName = prompt?.split(',')[0]?.trim() || 'Character'
      visionDescription = await analyzeCharacterImage(imageUrl, characterName)
      console.log(`[Character Image] Auto-analyzed with Gemini Vision`)
    } catch (error) {
      console.error('[Character Image] Vision analysis failed:', error)
      // Continue without analysis - not critical
    }
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      visionDescription, // Include in response for client to save
      model: quality === 'max' ? 'imagen-4.0-ultra-generate-001' : 'imagen-3.0-generate-002',
      quality: quality,
      provider: 'vertex-ai',
      storage: 'vercel-blob'
    })

  } catch (error) {
    console.error('[Character Image] Vertex AI generation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Image generation failed' 
    }, { status: 500 })
  }
}

