import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 60
export const runtime = 'nodejs'

interface GenerateWardrobeRequest {
  characterName: string
  characterRole?: string
  appearanceDescription?: string
  wardrobeDescription?: string  // User's natural language description (optional in recommend mode)
  genre?: string
  setting?: string
  tone?: string
  logline?: string
  visualStyle?: string
  recommendMode?: boolean  // When true, AI recommends based on character profile + screenplay context
}

interface WardrobeResult {
  defaultWardrobe: string
  wardrobeAccessories: string
}

/**
 * Call Vertex AI Gemini for wardrobe generation
 */
async function callGemini(prompt: string): Promise<string> {
  console.log('[Generate Wardrobe] Calling Vertex AI Gemini...')
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 2048,  // Increased from 1024 to prevent truncation
    responseMimeType: 'application/json'
  })
  return result.text
}

function buildWardrobePrompt(request: GenerateWardrobeRequest): string {
  const isRecommendMode = request.recommendMode === true

  if (isRecommendMode) {
    return `You are a professional costume designer for film and television. Generate wardrobe recommendations that perfectly match a character's role, personality, and the overall screenplay context.

CHARACTER PROFILE:
- Name: ${request.characterName}
${request.characterRole ? `- Role in Story: ${request.characterRole}` : ''}
${request.appearanceDescription ? `- Physical Appearance: ${request.appearanceDescription}` : ''}

SCREENPLAY CONTEXT:
${request.genre ? `- Genre: ${request.genre}` : '- Genre: Not specified'}
${request.tone ? `- Tone/Mood: ${request.tone}` : ''}
${request.setting ? `- Setting/Era: ${request.setting}` : ''}
${request.logline ? `- Story: ${request.logline}` : ''}
${request.visualStyle ? `- Visual Style: ${request.visualStyle}` : ''}

TASK:
Based on the character profile and screenplay context, recommend a signature wardrobe that:
1. Reflects the character's personality and role (${request.characterRole || 'supporting'})
2. Fits the ${request.genre || 'drama'} genre conventions
3. Matches the overall tone and setting
4. Would be visually consistent across multiple AI-generated images

Consider:
- What would a ${request.characterRole || 'character'} in a ${request.genre || 'drama'} typically wear?
- How should clothing reflect their status, personality, or arc?
- What colors and materials convey the right mood?

RESPONSE FORMAT (JSON):
{
  "defaultWardrobe": "Complete outfit description with specific colors, materials, and style details. Should be 1-2 sentences that can be injected into an image prompt.",
  "wardrobeAccessories": "Specific accessories including jewelry, watches, glasses, bags, hats, etc. Be specific about materials and colors."
}

GUIDELINES:
- Keep descriptions concise but specific (30-50 words each)
- Use comma-separated lists of items
- Focus on visual descriptors that AI image generators understand
- Be creative but appropriate for the character's role and genre
- **Do NOT include bags, satchels, backpacks, or other casual accessories if the scene is a formal event, public debate, or stage performance.**
- If the context is a debate, stage, or public event, only include accessories that would be appropriate on stage (e.g., glasses, watch, ring, but NOT satchel or backpack)

Return ONLY the JSON object, no additional text.`
  }

  // Original user-description mode
  return `You are a professional costume designer for film and television. Generate specific, visually descriptive wardrobe specifications based on a character description.

CHARACTER CONTEXT:
- Name: ${request.characterName}
${request.characterRole ? `- Role: ${request.characterRole}` : ''}
${request.appearanceDescription ? `- Appearance: ${request.appearanceDescription}` : ''}
${request.genre ? `- Genre: ${request.genre}` : ''}
${request.setting ? `- Setting/Era: ${request.setting}` : ''}

USER'S WARDROBE DESCRIPTION:
"${request.wardrobeDescription}"

TASK:
Based on the user's description, generate detailed, specific wardrobe specifications that would ensure visual consistency in AI-generated images. Be specific about:
- Colors (use specific shades, not just "blue" but "navy blue" or "powder blue")
- Materials/textures (leather, silk, cotton, denim, etc.)
- Fit and style (tailored, loose, vintage, modern, etc.)
- Specific garment types

RESPONSE FORMAT (JSON):
{
  "defaultWardrobe": "Complete outfit description with specific colors, materials, and style details. Should be 1-2 sentences that can be injected into an image prompt.",
  "wardrobeAccessories": "Specific accessories including jewelry, watches, glasses, bags, hats, etc. Be specific about materials and colors."
}

GUIDELINES:
- Keep descriptions concise but specific (30-50 words each)
- Use comma-separated lists of items
- Focus on visual descriptors that AI image generators understand
- Ensure consistency with character's role and setting
- If the user's description is vague, make informed creative choices that fit the character

Return ONLY the JSON object, no additional text.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateWardrobeRequest

    // In recommend mode, wardrobeDescription is optional
    if (!body.recommendMode && !body.wardrobeDescription?.trim()) {
      return NextResponse.json(
        { error: 'Wardrobe description is required' },
        { status: 400 }
      )
    }

    if (!body.characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      )
    }

    const prompt = buildWardrobePrompt(body)
    console.log('[Generate Wardrobe] Processing request for:', body.characterName, body.recommendMode ? '(recommend mode)' : '(user description)')

    const responseText = await callGemini(prompt)
    
    // Parse the JSON response
    let wardrobe: WardrobeResult
    try {
      // Handle potential markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      wardrobe = JSON.parse(cleanedResponse)
      
      // Validate required fields
      if (!wardrobe.defaultWardrobe || !wardrobe.wardrobeAccessories) {
        throw new Error('Invalid wardrobe structure')
      }
    } catch (parseError) {
      console.error('[Generate Wardrobe] Parse error:', parseError, 'Response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse wardrobe response' },
        { status: 500 }
      )
    }

    console.log('[Generate Wardrobe] Generated wardrobe for:', body.characterName)
    
    return NextResponse.json({
      success: true,
      wardrobe
    })

  } catch (error) {
    console.error('[Generate Wardrobe] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate wardrobe' },
      { status: 500 }
    )
  }
}
