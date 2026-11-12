import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { enforceEnsembleFamilyConsistency } from '@/lib/character/characterFamily'
import {
  buildCharacterLocalizationPromptBlock,
  inferLocaleDefaultEthnicityHint,
} from '@/lib/character/characterIntelligence'
import { localeDirective } from '@/lib/prompts/localeDirective'

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
    const {
      characterName,
      dialogueLines,
      scenes,
      sampleLine,
      projectTitle,
      projectGenre,
      setting,
      storyLocale,
      targetAudience,
      audienceDefinition,
      existingCharacters,
      familyRelationships,
    } = body

    if (!characterName?.trim()) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    // Check/consume credits (2 credits for character description generation)
    const creditCost = 2
    
    // Charge credits (will throw INSUFFICIENT_CREDITS if not enough)
    try {
      await CreditService.charge(userId, creditCost, 'ai_usage', null, {
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

    const projectContext = projectTitle || projectGenre || setting
      ? `\n\nProject context: ${projectTitle || 'Untitled'}${projectGenre ? ` (${projectGenre})` : ''}${setting ? ` — Setting: ${setting}` : ''}`
      : ''

    const localizationBlock = buildCharacterLocalizationPromptBlock({
      setting,
      storyLocale,
      targetAudience,
      audienceDefinition,
    })

    const castRosterContext =
      Array.isArray(existingCharacters) && existingCharacters.length > 0
        ? `\n\nEXISTING ENSEMBLE CAST (maintain cultural localization & strict biological/mixed-heritage family consistency with any relatives):\n${existingCharacters
            .slice(0, 12)
            .map((c: any) => {
              const parts = [
                c.name,
                c.role ? `(${c.role})` : '',
                c.age || c.ageRange ? `Age: ${c.age || c.ageRange}` : '',
                c.ethnicity ? `Ethnicity: ${c.ethnicity}` : '',
                c.appearanceDescription || c.appearance ? `Look: ${(c.appearanceDescription || c.appearance).slice(0, 140)}` : '',
              ].filter(Boolean)
              return `- ${parts.join(' | ')}`
            })
            .join('\n')}`
        : ''

    const explicitFamilyHint =
      Array.isArray(familyRelationships) && familyRelationships.length > 0
        ? `\nKnown family relationships for ${characterName}: ${JSON.stringify(familyRelationships)}`
        : ''

    const langBlock = localeDirective(storyLocale)

    const systemPrompt = `You are an expert casting director and character designer for film and television. Your task is to create a comprehensive, story-aligned character profile based on script context, world localization, and ensemble family lineage.

${localizationBlock}
${langBlock}
Analyze the character's dialogue, scenes, and role to determine:
1. Their personality, playable contradiction, and dramatic purpose
2. A visually compelling physical appearance grounded in the setting's cultural authenticity and any biological/mixed-ethnicity family ties
3. How they should look and sound for casting/visualization purposes

IMPORTANT GUIDELINES:
- Ground ethnicity, age, grooming, and attire authentically in the setting and cultural signals
- If related biologically to existing cast members: match exact ethnicity for same-heritage parents/siblings, OR use "Mixed [Parent A] and [Parent B] heritage" when biological parents have different ethnicities, and enforce plausible generational age gaps
- The appearanceDescription MUST be 2-3 vivid English sentences of standing physical identity ONLY (height in feet, build, facial structure, hair, eyes, skin tone — NO clothing)
- For gender: use explicit narrative cues only — never infer from the character's name alone

Return a JSON object with these exact fields:
{
  "description": "A 2-3 sentence character description including their role, playable contradiction, and significance to the story",
  "personality": "Key personality traits based on dialogue and actions (e.g., 'sharp-witted, guarded, quietly determined')",
  "appearanceDescription": "A comprehensive, vivid standing physical description in English suitable for image generation (2-3 sentences, no clothing)",
  "ethnicity": "Specific ethnicity in English (or 'Mixed [Parent A] and [Parent B] heritage' when biological parents differ)",
  "gender": "male, female, or non-binary — base on explicit narrative cues (dialogue, role, description), NOT the character's name.",
  "ageRange": "Concrete age or narrow band in English (e.g., '42' or 'early 30s')",
  "build": "Standing height + body type in English (e.g., '5\\'8\\" tall, athletic lean build')",
  "hairStyle": "Specific hair style, length, and texture in English",
  "hairColor": "Specific hair color in English",
  "eyeColor": "Specific eye color in English",
  "keyFeature": "One distinctive natural facial/physical feature in English",
  "expression": "Default resting expression in English",
  "style": "Signature baseline clothing/attire in English grounded in setting & role",
  "voiceDescription": "Voice qualities for TTS casting in English (e.g., 'warm and authoritative baritone, measured cadence')",
  "familyRelationships": [
    {
      "relatedCharacterName": "Exact Name in cast",
      "relation": "parent_of | child_of | sibling_of | grandparent_of | grandchild_of | spouse_of",
      "biological": true
    }
  ]
}

Return ONLY the JSON object, no additional text.`

    const userPrompt = `Generate a character profile for: ${characterName}${projectContext}${castRosterContext}${explicitFamilyHint}${dialogueContext}${sceneContext}

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

    if (Array.isArray(existingCharacters) && existingCharacters.length > 0) {
      const reconciled = enforceEnsembleFamilyConsistency(
        [
          ...existingCharacters,
          {
            name: characterName,
            ...characterProfile,
            age: characterProfile.age || characterProfile.ageRange,
            familyRelationships: characterProfile.familyRelationships || familyRelationships,
          },
        ],
        {
          scenes,
          defaultLocaleEthnicity: inferLocaleDefaultEthnicityHint({
            setting,
            storyLocale,
            targetAudience,
            audienceDefinition,
          }),
        }
      )
      const targetOut = reconciled[reconciled.length - 1]
      if (targetOut) {
        if (targetOut.ethnicity) characterProfile.ethnicity = targetOut.ethnicity
        if (targetOut.age) {
          characterProfile.ageRange = String(targetOut.age)
          characterProfile.age = String(targetOut.age)
        }
        if (Array.isArray(targetOut.familyRelationships) && targetOut.familyRelationships.length > 0) {
          characterProfile.familyRelationships = targetOut.familyRelationships
        }
      }
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
