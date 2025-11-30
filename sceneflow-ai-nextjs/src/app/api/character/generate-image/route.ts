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
    const { prompt, projectId, characterId, quality = 'auto', artStyle, rawMode } = await req.json()
    
    // Use user prompt directly. We trust the client (CharacterPromptBuilder) to have assembled 
    // the attributes, shot type, lighting, etc. into the prompt string.
    // We do NOT fetch attributes here to avoid duplication and allow user edits to persist.
    
    let finalPrompt = prompt?.trim() || ''

    if (!finalPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    let enhancedPrompt: string
    if (rawMode) {
      // Advanced mode: use user prompt verbatim
      enhancedPrompt = finalPrompt
    } else {
      // Guided mode: Apply style conflict filtering only.
      // We do NOT append shot/lighting/style suffixes here because the client already did it.
      
      const tokens = finalPrompt.split(',').map(t => t.trim()).filter(Boolean)
      const seen = new Set<string>()
      const out: string[] = []
      const photoTerms = ['photorealistic','photo','photograph','photography','8k','4k','realistic']
      const artTerms = ['anime','cartoon','sketch','illustration','painting','drawing']
      
      for (const t of tokens) {
        const key = t.toLowerCase()
        if (seen.has(key)) continue
        
        // Filter conflicting style terms
        if (artStyle && artStyle !== 'photorealistic' && photoTerms.some(term => key.includes(term))) continue
        if (artStyle === 'photorealistic' && artTerms.some(term => key.includes(term))) continue
        
        out.push(t)
        seen.add(key)
      }
      enhancedPrompt = out.join(', ')
    }

    console.log('[Character Image] rawMode:', !!rawMode, 'artStyle:', artStyle || '(none)')
    console.log('[Character Image] Final prompt preview:', enhancedPrompt.substring(0, 140))

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

