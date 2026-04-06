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
Your task is to write a short, precise Director's Note (Audio Profile) that captures the character's unique voice, personality, and tone.

This note will be passed as instructions to an advanced Text-to-Speech system (Gemini TTS).

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
1. Write ONLY the voice description / Audio Profile. Do NOT write a monologue or script for the character to say.
2. The description must focus strictly on the vocal qualities: tone, pitch, cadence, age, gender, accent, texture, and emotional delivery.
3. Be highly descriptive but concise (4-5 sentences max).
4. Example output format: "A resonant, middle-aged African American male voice in his early 50s. The tone is a warm, textured baritone with a slight, natural huskiness. His delivery is measured, grounded, and deeply empathetic, conveying the calm authority of a trusted mentor."`

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
