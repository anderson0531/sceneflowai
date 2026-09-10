import { NextRequest, NextResponse } from 'next/server'
import { generateText, generateWithVision } from '@/lib/vertexai/gemini'
import { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'
import { parseDirectorVoiceDesignResponse } from '@/lib/tts/geminiVoiceDesignPrompt'

export const dynamic = 'force-dynamic'

const DIRECTOR_PROMPT_GEN_OPTIONS = {
  temperature: 0.7,
  maxOutputTokens: 2048,
  thinkingLevel: 'minimal' as const,
}

export async function POST(request: NextRequest) {
  try {
    const { characterContext, screenplayContext, selectedInstructions, wardrobeImageUrl } = await request.json() as {
      characterContext?: CharacterContext
      screenplayContext?: ScreenplayContext
      selectedInstructions?: string[]
      wardrobeImageUrl?: string
    }

    if (!characterContext) {
      return NextResponse.json({ error: 'Missing character context' }, { status: 400 })
    }

    const { name, role, attributes, backstory, description, age, gender, ethnicity, personality, referenceImage } = characterContext
    
    // Construct the prompt for the director script
    let prompt = `You are an expert Voice Director writing Google AI Studio Voice Design notes for Gemini TTS.

The notes become Cloud TTS Style Instructions (input.prompt). They must describe how the character sounds, not what they look like or what they will say.`

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

    const visionImageUrl =
      wardrobeImageUrl?.startsWith('http')
        ? wardrobeImageUrl
        : referenceImage?.startsWith('http')
          ? referenceImage
          : undefined

    if (wardrobeImageUrl?.startsWith('http')) {
      prompt += `\n\nWARDROBE TURNAROUND IMAGE:
A 2-row costume turnaround sheet is attached. Use ONLY the TOP ROW headshots for voice inference (ignore outfit/bottom row). Analyze facial structure, apparent age, ethnicity, and demeanor to infer vocal qualities.`
    } else if (referenceImage) {
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
This note is Cloud TTS Style Instructions (AI Studio Voice Design). The spoken line is sent separately — never write dialogue or a TRANSCRIPT.

Focus strictly on vocal identity: timbre, pitch, cadence, accent, articulation, and standing affect. Do NOT mention wardrobe, clothing, hair, eyes, plot, or a line to speak.

Match the character's age, gender, ethnicity, and role. If those fields say "Not specified" but appear in Description or Backstory, extract them.

Return ONLY a JSON object with these keys (empty string if unknown):
{
  "name": "character name",
  "archetype": "short role title, no clothing",
  "identity": "1-2 sentences: age, gender, ethnicity, timbre",
  "style": "diction, inflection, how they colour the material",
  "pace": "cadence in plain language",
  "accent": "accent or dialect",
  "scene": ""
}

Leave "scene" empty unless the series context implies a standing location and vibe (not a plot beat).

Example:
{
  "name": "Julian Ward",
  "archetype": "Senior Director of Corporate Risk",
  "identity": "Late 50s Caucasian male. Authoritative, clinical baritone with dry, crisp diction.",
  "style": "Flat, declarative statements. Always resolve sentences with downward pitch; never lift pitch at phrase ends. Treat catastrophic events with the quiet nonchalance of a balance sheet.",
  "pace": "Slow, measured, and completely unhurried.",
  "accent": "Neutral American, no regionalisms.",
  "scene": ""
}`

    let generatedText = ''

    if (visionImageUrl) {
      try {
        console.log(`[Director Prompt] Generating with vision for "${name}"...`)
        const imageResponse = await fetch(visionImageUrl)
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
          DIRECTOR_PROMPT_GEN_OPTIONS
        )
        
        generatedText = response.text.trim()
      } catch (visionError) {
        console.warn('[Director Prompt] Vision failed, falling back to text-only:', visionError)
        // Fallback to text-only generation
        const response = await generateText(prompt, DIRECTOR_PROMPT_GEN_OPTIONS)
        generatedText = response.text.trim()
      }
    } else {
      // Text-only generation
      const response = await generateText(prompt, DIRECTOR_PROMPT_GEN_OPTIONS)
      generatedText = response.text.trim()
    }
    
    const designed = parseDirectorVoiceDesignResponse(generatedText, {
      name: name || undefined,
      archetype: role || undefined,
    })
    generatedText = designed || ''

    if (!generatedText?.trim()) {
      console.error('[Director Prompt] Empty profile after parsing')
      return NextResponse.json(
        { error: 'Failed to generate director prompt (empty response)' },
        { status: 502 }
      )
    }

    return NextResponse.json({ script: generatedText })

  } catch (error) {
    console.error('[API] Error generating director prompt:', error)
    return NextResponse.json({ error: 'Failed to generate director prompt' }, { status: 500 })
  }
}
