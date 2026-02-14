import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'

export const runtime = 'nodejs'
export const maxDuration = 60

interface CharacterContext {
  name: string
  dialogueLines: string[]
  scenes: {
    sceneNumber: number
    heading?: string
    action?: string
  }[]
  sampleLine?: string
}

/**
 * Generate an optimal character description and appearance based on their role in the script.
 * This analyzes the character's dialogue, scenes, and context to create a comprehensive profile.
 * 
 * Cost: 2 credits
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const { characterName, dialogueLines, scenes, sampleLine, projectTitle, projectGenre } = body

    if (!characterName?.trim()) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    // Check/consume credits (2 credits for character description generation)
    const creditCost = 2
    
    // Charge credits (will throw INSUFFICIENT_CREDITS if not enough)
    try {
      await CreditService.charge(userId, creditCost, 'ai', null, {
        type: 'character-description',
        characterName,
        dialogueCount: dialogueLines?.length || 0
      })
    } catch (chargeError: any) {
      if (chargeError.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ 
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          required: creditCost
        }, { status: 402 })
      }
      console.error('[Generate Description] Credit charge error:', chargeError)
      return NextResponse.json({ 
        error: 'Failed to charge credits',
        code: 'CREDIT_CHARGE_FAILED',
        details: chargeError.message
      }, { status: 402 })
    }

    // Build context for the prompt
    const dialogueContext = dialogueLines?.length > 0 
      ? `\n\nCharacter's dialogue lines:\n${dialogueLines.slice(0, 20).map((line: string, i: number) => `${i + 1}. "${line}"`).join('\n')}`
      : ''
    
    const sceneContext = scenes?.length > 0
      ? `\n\nScenes the character appears in:\n${scenes.slice(0, 10).map((s: any) => 
          `- Scene ${s.sceneNumber}${s.heading ? `: ${s.heading}` : ''}${s.action ? ` - ${s.action.substring(0, 100)}...` : ''}`
        ).join('\n')}`
      : ''

    const projectContext = projectTitle || projectGenre
      ? `\n\nProject context: ${projectTitle || 'Untitled'}${projectGenre ? ` (${projectGenre})` : ''}`
      : ''

    const systemPrompt = `You are an expert casting director and character designer for film and television. Your task is to create a comprehensive character profile based on script context.

Analyze the character's dialogue, scenes, and role to determine:
1. Their personality and demeanor
2. A visually compelling physical appearance that suits their role
3. How they should look for casting/visualization purposes

IMPORTANT GUIDELINES:
- Create a diverse, interesting character that fits their role in the story
- The appearance should be specific and vivid, suitable for AI image generation
- Consider the character's dialogue style to inform their personality
- Make choices that are cinematically interesting and casting-ready
- Avoid generic descriptions - be specific about features

Return a JSON object with these exact fields:
{
  "description": "A 2-3 sentence character description including their role, personality, and significance to the story",
  "personality": "Key personality traits based on dialogue and actions (e.g., 'sharp-witted, guarded, quietly determined')",
  "appearanceDescription": "A comprehensive, vivid physical description suitable for image generation (2-3 sentences)",
  "ethnicity": "Specific ethnicity (e.g., 'East Asian', 'South Asian', 'African American', 'Latino', 'Middle Eastern', 'Caucasian', 'Mixed heritage')",
  "gender": "male or female based on dialogue/context",
  "ageRange": "Approximate age range (e.g., 'early 30s', 'late 40s', 'mid 20s')",
  "build": "Body type (e.g., 'athletic', 'slender', 'stocky', 'average', 'tall and lean')",
  "hairStyle": "Specific hair style (e.g., 'short cropped', 'long wavy', 'slicked back', 'natural curls', 'pixie cut')",
  "hairColor": "Hair color (e.g., 'black', 'dark brown', 'auburn', 'silver-streaked', 'blonde')",
  "eyeColor": "Eye color (e.g., 'brown', 'hazel', 'blue', 'dark brown', 'green')",
  "keyFeature": "One distinctive visual feature (e.g., 'sharp cheekbones', 'warm smile', 'intense gaze', 'kind eyes', 'weathered face')",
  "expression": "Default expression (e.g., 'thoughtful', 'confident', 'guarded', 'warm', 'stern')",
  "style": "Clothing/style preference (e.g., 'professional business attire', 'casual streetwear', 'lab coat and scrubs', 'vintage-inspired')",
  "voiceDescription": "Voice qualities for TTS casting (e.g., 'warm and authoritative', 'soft-spoken with an edge', 'energetic and quick')"
}

Return ONLY the JSON object, no additional text.`

    const userPrompt = `Generate a character profile for: ${characterName}${projectContext}${dialogueContext}${sceneContext}

${sampleLine ? `Sample dialogue: "${sampleLine}"` : ''}

Based on the available context, create a compelling, specific character profile. If limited dialogue is available, make thoughtful creative choices that would suit this character's apparent role in the story.`

    console.log(`[Generate Description] Creating profile for ${characterName} (${dialogueLines?.length || 0} lines)`)

    const result = await generateText(`${systemPrompt}\n\n${userPrompt}`, {
      model: 'gemini-2.5-flash',
      temperature: 0.7
    })

    // Parse the JSON response
    const text = result.text.trim()
    
    // Extract JSON from potential markdown code blocks
    let jsonStr = text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    
    // Also try to find bare JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonStr = objectMatch[0]
    }

    let characterProfile
    try {
      characterProfile = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('[Generate Description] Failed to parse JSON:', parseError)
      console.error('[Generate Description] Raw response:', text)
      return NextResponse.json({ 
        error: 'Failed to parse AI response',
        rawResponse: text 
      }, { status: 500 })
    }

    // Validate required fields
    const requiredFields = ['description', 'appearanceDescription', 'ethnicity', 'build', 'hairStyle', 'hairColor', 'eyeColor']
    const missingFields = requiredFields.filter(field => !characterProfile[field])
    
    if (missingFields.length > 0) {
      console.warn('[Generate Description] Missing fields:', missingFields)
    }

    console.log(`[Generate Description] Success for ${characterName}:`, {
      ethnicity: characterProfile.ethnicity,
      ageRange: characterProfile.ageRange,
      keyFeature: characterProfile.keyFeature
    })

    return NextResponse.json({ 
      success: true,
      profile: characterProfile,
      creditsUsed: creditCost
    })

  } catch (error: any) {
    console.error('[Generate Description] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate character description'
    }, { status: 500 })
  }
}
