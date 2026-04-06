import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { characterContext, screenplayContext } = await request.json() as {
      characterContext?: CharacterContext
      screenplayContext?: ScreenplayContext
    }

    if (!characterContext) {
      return NextResponse.json({ error: 'Missing character context' }, { status: 400 })
    }

    const { name, role, attributes, backstory } = characterContext
    
    // Construct the prompt for the director script
    let prompt = `You are an expert Voice Director casting a voice actor for a specific character. 
Your task is to write a short, 10-15 second monologue (about 30-40 words) that captures the character's unique voice, personality, and tone. 
This script will be read by the voice actor to create a custom voice clone.

CHARACTER DETAILS:
Name: ${name || 'Unknown'}
Role: ${role || 'Not specified'}
Traits/Attributes: ${attributes ? Object.entries(attributes).map(([k, v]) => `${k}: ${v}`).join(', ') : 'Not specified'}
Backstory: ${backstory || 'Not specified'}`

    if (screenplayContext) {
      prompt += `\n\nSERIES CONTEXT:
Genre: ${screenplayContext.genre || 'Not specified'}
Tone: ${screenplayContext.tone || 'Not specified'}
Synopsis: ${screenplayContext.synopsis || 'Not specified'}`
    }

    prompt += `\n\nREQUIREMENTS:
1. Write ONLY the monologue text. No stage directions, no quotes, no intro/outro.
2. The text should be highly conversational and phonetic, showcasing the emotional range of the character.
3. Make it natural for a human to read aloud, avoiding overly complex words unless it fits the character.
4. Keep it exactly 10-15 seconds when spoken (approx 30-45 words).`

    const response = await generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 150
    })

    return NextResponse.json({ script: response.text.trim() })

  } catch (error) {
    console.error('[API] Error generating director prompt:', error)
    return NextResponse.json({ error: 'Failed to generate director prompt' }, { status: 500 })
  }
}
