import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix } from '@/lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'

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

    // Vertex AI uses service account credentials - no API key required
    console.log('👥 Character Breakdown - Input length:', input.length)
    console.log('👥 Core concept:', coreConcept.input_title)

    const characterBreakdown = await generateCharacterBreakdown(input, coreConcept, {
      targetAudience,
      keyMessage,
      tone,
      genre,
      duration,
      platform
    })

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
  context: any
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
}` + strictJsonPromptSuffix

  console.log('[Character Breakdown] Calling Vertex AI Gemini...')
  const generatedText = await generateText(prompt, { model: 'gemini-2.0-flash' })

  if (!generatedText) {
    throw new Error('No response from Vertex AI Gemini')
  }

  console.log('👥 Vertex AI Character Breakdown Response:', generatedText)

  try {
    const parsed = (() => {
      let t = (generatedText || '').trim()
      if (t.includes('```')) { const s=t.indexOf('```'); const e=t.indexOf('```', s+3); if (s!==-1&&e!==-1&&e>s){ t=t.slice(s+3,e).trim(); const nl=t.indexOf('\n'); const fl= nl!==-1 ? t.slice(0,nl) : t; if (/^[a-zA-Z]+\s*$/.test(fl)) t=(nl!==-1?t.slice(nl+1):'').trim(); } }
      const a=t.indexOf('{'); const b=t.lastIndexOf('}'); if (a!==-1&&b!==-1&&b>a) t=t.slice(a,b+1);
      t = t.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/,\s*([}\]])/g,'$1')
      return JSON.parse(t)
    })()
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
