import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { characterContext, screenplayContext, selectedInstructions } = await request.json() as {
      characterContext?: CharacterContext
      screenplayContext?: ScreenplayContext
      selectedInstructions?: string[]
    }

    if (!characterContext) {
      return NextResponse.json({ error: 'Missing character context' }, { status: 400 })
    }

    const { name, role, attributes, backstory, description, age, gender, ethnicity, personality } = characterContext
    
    // Construct the prompt for the director script
    let prompt = `You are an expert Voice Director casting a voice actor for a specific character. 
Your task is to write a short, precise Director's Note (Audio Profile) that captures the character's unique voice, personality, and tone.

This note will be passed as instructions to an advanced Text-to-Speech system (Gemini TTS).

CHARACTER DETAILS:
Name: ${name || 'Unknown'}
Role: ${role || 'Not specified'}
Age: ${age || 'Not specified'}
Gender: ${gender || 'Not specified'}
Ethnicity: ${ethnicity || 'Not specified'}
Personality: ${personality || 'Not specified'}
Description: ${description || 'Not specified'}
Traits/Attributes: ${attributes ? Object.entries(attributes).map(([k, v]) => `${k}: ${v}`).join(', ') : 'Not specified'}
Backstory: ${backstory || 'Not specified'}`

    if (selectedInstructions && selectedInstructions.length > 0) {
      prompt += `\n\nSELECTED VOICE TRAITS:
The user has specifically requested the voice to include the following characteristics:
${selectedInstructions.map(i => `- ${i}`).join('\n')}

INCORPORATE THESE TRAITS into your final description naturally.`
    }

    if (screenplayContext) {
      prompt += `\n\nSERIES CONTEXT:
Genre: ${screenplayContext.genre || 'Not specified'}
Tone: ${screenplayContext.tone || 'Not specified'}
Synopsis: ${screenplayContext.synopsis || 'Not specified'}`
    }

    prompt += `\n\nREQUIREMENTS:
1. Write ONLY the voice description / Audio Profile. Do NOT write a monologue or script for the character to say.
2. Ensure the generated voice description exactly matches the character's provided age, gender, ethnicity, and role from the details above. If the demographic fields are "Not specified" but the details are mentioned in the Description or Backstory, you MUST extract and use them.
3. The description must focus strictly on the vocal qualities: tone, pitch, cadence, accent, texture, and emotional delivery. Include how their role and personality shape their vocal delivery.
4. Be highly descriptive but concise (4-5 sentences max).
5. Do NOT wrap the output in markdown code blocks or JSON formatting. Just return the raw text.
6. Example output format: "An African American male voice in his late 40s to early 50s. The tone is a warm, textured baritone with a slight, natural huskiness. As the visionary host of 'Cognitive Horizons,' his delivery balances an energetic, forward-leaning enthusiasm with a measured, thoughtful pacing. His emotional delivery exudes a deep, empathetic hope, capturing the calm authority of an intellectually stimulating mind grappling with profound responsibilities."`

    const response = await generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 250
    })

    let generatedText = response.text.trim()
    
    // Fallback: If Gemini still returns JSON, parse it out
    if (generatedText.startsWith('{')) {
      try {
        const parsed = JSON.parse(generatedText)
        if (parsed.audio_profile) {
          generatedText = parsed.audio_profile
        }
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({ script: generatedText })

  } catch (error) {
    console.error('[API] Error generating director prompt:', error)
    return NextResponse.json({ error: 'Failed to generate director prompt' }, { status: 500 })
  }
}
