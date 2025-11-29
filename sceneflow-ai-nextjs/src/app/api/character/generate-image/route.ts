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
    const { prompt, projectId, characterId, quality = 'auto', artStyle, shotType, cameraAngle, lighting, additionalDetails, rawMode } = await req.json()
    
    // Aggregate character attributes (ALWAYS if IDs provided) and merge with user prompt
    const attributeParts: string[] = []
    if (projectId && characterId) {
      try {
        const character = await getCharacterAttributes(projectId, characterId)
        if (character) {
          if (character.keyFeature) attributeParts.push(character.keyFeature)
          if (character.ethnicity) attributeParts.push(character.ethnicity)
          if (character.hairColor && character.hairStyle) attributeParts.push(`${character.hairColor} ${character.hairStyle} hair`)
          if (character.eyeColor) attributeParts.push(`${character.eyeColor} eyes`)
          if (character.expression) attributeParts.push(character.expression)
          if (character.build) attributeParts.push(`${character.build} build`)
        }
      } catch (e) {
        console.warn('[Character Image] Failed to load character attributes:', e)
      }
    }

    // Merge attributes + user prompt (if provided) then dedupe
    const userPrompt = prompt?.trim() || ''
    const combinedTokens = [...attributeParts, userPrompt]
      .join(', ')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    const seenTokens = new Set<string>()
    const merged: string[] = []
    for (const tok of combinedTokens) {
      const key = tok.toLowerCase()
      if (seenTokens.has(key)) continue
      merged.push(tok)
      seenTokens.add(key)
    }
    let finalPrompt = merged.join(', ')
    if (!finalPrompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    
    if (!finalPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    let enhancedPrompt: string
    if (rawMode) {
      // Advanced mode: use user prompt verbatim (only trim) to avoid hidden overrides
      enhancedPrompt = finalPrompt.trim()
    } else {
      // Guided mode: assemble structured parts
      const parts: string[] = []
      parts.push(finalPrompt)
      const stylePreset = artStyle ? artStylePresets.find(s => s.id === artStyle) : undefined
      if (stylePreset) parts.push(stylePreset.promptSuffix)
      const shotMap: Record<string, string> = {
        'wide-shot': 'wide shot composition',
        'medium-shot': 'medium shot composition',
        'medium-close-up': 'medium close-up portrait',
        'close-up': 'close-up portrait',
        'extreme-close-up': 'extreme close-up portrait',
        'over-shoulder': 'over the shoulder view'
      }
      const angleMap: Record<string, string> = {
        'eye-level': 'eye level angle',
        'low-angle': 'low angle view',
        'high-angle': 'high angle view',
        'birds-eye': "bird's eye view",
        'dutch-angle': 'dutch angle'
      }
      const lightingMap: Record<string, string> = {
        'natural': 'soft natural lighting',
        'golden-hour': 'golden hour lighting',
        'dramatic': 'dramatic cinematic lighting',
        'soft': 'soft diffused lighting',
        'harsh': 'high contrast lighting',
        'backlit': 'backlit subject'
      }
      if (shotType) parts.push(shotMap[shotType] || shotType)
      if (cameraAngle && cameraAngle !== 'eye-level') parts.push(angleMap[cameraAngle] || cameraAngle)
      if (lighting) parts.push(lightingMap[lighting] || lighting)
      if (additionalDetails) parts.push(additionalDetails)
      const tokens = parts.join(', ').split(',').map(t => t.trim()).filter(Boolean)
      const seen = new Set<string>()
      const out: string[] = []
      const photoTerms = ['photorealistic','photo','photograph','photography','8k','4k','realistic']
      const artTerms = ['anime','cartoon','sketch','illustration','painting','drawing']
      for (const t of tokens) {
        const key = t.toLowerCase()
        if (seen.has(key)) continue
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

