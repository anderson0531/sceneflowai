import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 60
export const runtime = 'nodejs'

interface EnhanceWardrobeRequest {
  characterName: string
  characterRole?: string
  appearanceDescription?: string
  currentWardrobeDescription: string
  currentAccessories?: string
  wardrobeName?: string
  /** Optional screenplay context for genre/tone-appropriate enhancement */
  genre?: string
  tone?: string
  setting?: string
  visualStyle?: string
}

/**
 * POST /api/character/enhance-wardrobe
 * 
 * Takes a vague wardrobe description and uses Gemini to generate a highly detailed,
 * image-generation-optimized version. This is the "one-click enhance" for individual
 * wardrobe descriptions — turning "business casual" into "An impeccably tailored 
 * three-piece suit in deep charcoal gray..." etc.
 * 
 * The enhanced description is specific enough that AI image generators produce
 * consistent results across multiple scene generations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EnhanceWardrobeRequest

    if (!body.currentWardrobeDescription?.trim()) {
      return NextResponse.json(
        { error: 'Current wardrobe description is required' },
        { status: 400 }
      )
    }

    if (!body.characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      )
    }

    console.log(`[Enhance Wardrobe] Enhancing wardrobe for ${body.characterName}: "${body.currentWardrobeDescription.substring(0, 60)}..."`)

    const prompt = buildEnhancePrompt(body)
    
    const result = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    })

    // Parse JSON response
    let enhanced: { description: string; accessories: string }
    try {
      let cleanText = result.text.trim()
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }
      enhanced = JSON.parse(cleanText)

      if (!enhanced.description || enhanced.description.trim().length < 20) {
        throw new Error('Enhanced description too short')
      }
    } catch (parseError) {
      console.error('[Enhance Wardrobe] Parse error:', parseError, 'Response:', result.text.substring(0, 200))
      return NextResponse.json(
        { error: 'Failed to parse enhanced wardrobe response' },
        { status: 500 }
      )
    }

    console.log(`[Enhance Wardrobe] ✓ Enhanced wardrobe for ${body.characterName} (${enhanced.description.length} chars)`)

    return NextResponse.json({
      success: true,
      enhanced: {
        description: enhanced.description.trim(),
        accessories: enhanced.accessories?.trim() || body.currentAccessories || '',
      }
    })

  } catch (error) {
    console.error('[Enhance Wardrobe] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enhance wardrobe' },
      { status: 500 }
    )
  }
}

function buildEnhancePrompt(request: EnhanceWardrobeRequest): string {
  return `You are a professional film costume designer. Your task is to take a VAGUE wardrobe description and transform it into a HIGHLY SPECIFIC, DETAILED description optimized for AI image generation consistency.

CHARACTER CONTEXT:
- Name: ${request.characterName}
${request.characterRole ? `- Role: ${request.characterRole}` : ''}
${request.appearanceDescription ? `- Physical Appearance: ${request.appearanceDescription}` : ''}
${request.wardrobeName ? `- Wardrobe Name: ${request.wardrobeName}` : ''}

${request.genre || request.tone || request.setting ? `SCREENPLAY CONTEXT:
${request.genre ? `- Genre: ${request.genre}` : ''}
${request.tone ? `- Tone: ${request.tone}` : ''}
${request.setting ? `- Setting: ${request.setting}` : ''}
${request.visualStyle ? `- Visual Style: ${request.visualStyle}` : ''}` : ''}

CURRENT WARDROBE DESCRIPTION (VAGUE):
"${request.currentWardrobeDescription}"
${request.currentAccessories ? `\nCURRENT ACCESSORIES:\n"${request.currentAccessories}"` : ''}

TASK:
Transform the vague description above into a HIGHLY DETAILED, SPECIFIC wardrobe description that:

1. SPECIFIES EXACT GARMENTS: Not "business casual" → "A tailored single-breasted navy blazer over a crisp white Oxford shirt, paired with slim-fit charcoal wool trousers"
2. NAMES SPECIFIC COLORS: Not "muted tones" → "deep charcoal gray", "navy blue", "slate blue"
3. DESCRIBES MATERIALS & TEXTURES: "high-quality wool blend", "crisp cotton", "silk", "Italian leather"
4. DEFINES FIT & STYLE: "modern slim fit", "single-breasted with notched lapel", "spread collar"
5. PRESERVES THE ORIGINAL INTENT: The enhanced version should feel like the same outfit, just described more precisely
6. IS IMAGE-GENERATION OPTIMIZED: Descriptions that AI image models can consistently reproduce across multiple generations
7. INCLUDES FOOTWEAR: Always specify shoes/footwear that match the outfit

Keep the total description under 200 words — specific enough for consistency, concise enough for image prompts.

RESPONSE FORMAT (JSON):
{
  "description": "The enhanced, highly detailed wardrobe description (one cohesive paragraph)",
  "accessories": "Specific accessories with materials, colors, and styles (e.g., 'Stainless steel minimalist wristwatch with dark face, thin gold-framed rectangular glasses')"
}

Return ONLY the JSON object.`
}
