import { NextRequest, NextResponse } from 'next/server'

interface CharacterBreakdownRequest {
  input: string
  coreConcept: {
    input_title: string
    input_synopsis: string
    core_themes: string[]
    narrative_structure: string
  }
  targetAudience?: string
  keyMessage?: string
  tone?: string
  genre?: string
  duration?: number
  platform?: string
}

interface Character {
  name: string
  role: 'Protagonist' | 'Antagonist' | 'Supporting' | 'Narrator' | 'Expert' | 'Host'
  description: string
  importance: 'High' | 'Medium' | 'Low'
  key_traits: string[]
}

interface CharacterBreakdownResponse {
  success: boolean
  data: {
    characters: Character[]
    character_relationships: string[]
    character_arcs: string[]
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CharacterBreakdownRequest = await request.json()
    const { input, coreConcept, targetAudience, keyMessage, tone, genre, duration, platform } = body

    if (!input || !coreConcept) {
      return NextResponse.json({
        success: false,
        message: 'Input content and core concept are required'
      }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Google Gemini API key not configured'
      }, { status: 500 })
    }

    console.log('👥 Character Breakdown - Input length:', input.length)
    console.log('👥 Core concept:', coreConcept.input_title)

    const characterBreakdown = await generateCharacterBreakdown(input, coreConcept, {
      targetAudience,
      keyMessage,
      tone,
      genre,
      duration,
      platform
    }, apiKey)

    return NextResponse.json({
      success: true,
      data: characterBreakdown,
      message: 'Character breakdown completed successfully'
    })

  } catch (error) {
    console.error('❌ Character Breakdown Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to generate character breakdown'
    }, { status: 500 })
  }
}

async function generateCharacterBreakdown(
  input: string,
  coreConcept: any,
  context: any,
  apiKey: string
): Promise<CharacterBreakdownResponse['data']> {
  
  const prompt = `CRITICAL INSTRUCTIONS: You are a professional character analyst. Identify ALL characters from the input, focusing on their ESSENTIAL traits and roles.

INPUT:
${input}

CORE CONCEPT:
- Title: ${coreConcept.input_title}
- Synopsis: ${coreConcept.input_synopsis}
- Themes: ${coreConcept.core_themes.join(', ')}
- Structure: ${coreConcept.narrative_structure}

CONTEXT:
- Target Audience: ${context.targetAudience || 'General'}
- Key Message: ${context.keyMessage || 'Not specified'}
- Tone: ${context.tone || 'Professional'}
- Genre: ${context.genre || 'Documentary'}
- Duration: ${context.duration || 60} seconds

CRITICAL RULES:
1. Identify EVERY character mentioned in the input
2. Focus on ESSENTIAL traits, not detailed descriptions
3. Be CONCISE in character descriptions
4. Identify clear roles and importance levels
5. Extract key relationships and arcs

TASK: Identify and analyze all characters by:
1. Extracting ALL characters mentioned in the input
2. Determining their roles and importance
3. Describing their key traits and characteristics (CONCISE)
4. Identifying relationships between characters
5. Outlining potential character arcs

Respond with valid JSON only:
{
  "characters": [
    {
      "name": "Character Name",
      "role": "Protagonist" | "Antagonist" | "Supporting" | "Narrator" | "Expert" | "Host",
      "description": "Concise character description (≤30 words)",
      "importance": "High" | "Medium" | "Low",
      "key_traits": ["Trait 1", "Trait 2", "Trait 3"]
    }
  ],
  "character_relationships": ["Relationship 1", "Relationship 2"],
  "character_arcs": ["Arc 1", "Arc 2"]
}`

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!generatedText) {
    throw new Error('No response from Gemini API')
  }

  console.log('👥 Gemini Character Breakdown Response:', generatedText)

  try {
    const parsed = JSON.parse(generatedText)
    return {
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      character_relationships: Array.isArray(parsed.character_relationships) ? parsed.character_relationships : [],
      character_arcs: Array.isArray(parsed.character_arcs) ? parsed.character_arcs : []
    }
  } catch (parseError) {
    console.error('❌ Failed to parse character breakdown response:', parseError)
    throw new Error('Failed to parse character breakdown response')
  }
}
