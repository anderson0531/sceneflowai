import { NextRequest, NextResponse } from 'next/server'
import { generateText, generateWithVision } from '@/lib/vertexai/gemini'
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

    const { name, role, attributes, backstory, description, age, gender, ethnicity, personality, referenceImage } = characterContext
    
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

    if (referenceImage) {
      prompt += `\n\nREFERENCE IMAGE:
A visual reference of the character is attached. Analyze their facial structure, apparent age, ethnicity, and overall demeanor to infer vocal qualities that perfectly match their physical presence.`
    }

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
6. Example output format: "An African American male voice in his late 40s to early 50s. The tone is a warm, textured baritone with a slight, natural huskiness. As the visionary host of 'Cognitive Horizons,' his delivery balances an energetic, forward-leaning enthusiasm with a measured, thoughtful pacing. His emotional delivery exudes a deep, empathetic hope, capturing the calm authority of an intellectually stimulating mind grappling with profound responsibilities."
7. You MUST return ONLY the final text. NO conversational filler. NO markdown formatting. NO JSON.`

    let generatedText = ''

    if (referenceImage && referenceImage.startsWith('http')) {
      try {
        console.log(`[Director Prompt] Generating with vision for "${name}"...`)
        const imageResponse = await fetch(referenceImage)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch reference image: ${imageResponse.status}`)
        }
        
        const imageBuffer = await imageResponse.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        
        const response = await generateWithVision(
          [
            {
              inlineData: {
                mimeType: contentType,
                data: base64Image
              }
            },
            { text: prompt }
          ],
          {
            temperature: 0.7,
            maxOutputTokens: 250,
          }
        )
        
        generatedText = response.text.trim()
      } catch (visionError) {
        console.warn('[Director Prompt] Vision failed, falling back to text-only:', visionError)
        // Fallback to text-only generation
        const response = await generateText(prompt, {
          temperature: 0.7,
          maxOutputTokens: 250
        })
        generatedText = response.text.trim()
      }
    } else {
      // Text-only generation
      const response = await generateText(prompt, {
        temperature: 0.7,
        maxOutputTokens: 250
      })
      generatedText = response.text.trim()
    }
    
    // The prompt explicitly asks to NOT return JSON, but if the model still returns JSON, 
    // it will be wrapped in ````json` or `{...}`.
    // However, if the model *obeys* the prompt and returns plain text, we don't want to extract
    // anything that looks like JSON or it might wipe out the plain text!
    
    // Check if the response contains a JSON block with an audio_profile key
    const jsonWithKeyMatch = generatedText.match(/\{[\s\S]*?"audio_profile"\s*:[\s\S]*?\}/);
    
    if (jsonWithKeyMatch) {
      // It definitely gave us JSON
      generatedText = jsonWithKeyMatch[0];
    } else {
      // It might be plain text with conversational filler
      // Clean up markdown formatting if Gemini still includes it
      generatedText = generatedText.replace(/^```[a-zA-Z]*\n?/, '')
                                   .replace(/^```\n?/, '')
                                   .replace(/\n?```$/, '')
                                   .replace(/^Here is the .*?:?\s*/i, '') // Remove conversational "Here is the..."
                                   .trim()
    }

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
