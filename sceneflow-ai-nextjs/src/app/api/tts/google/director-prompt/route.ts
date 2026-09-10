import { NextRequest, NextResponse } from 'next/server'
import { generateText, generateWithVision } from '@/lib/vertexai/gemini'
import { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'
import { buildDirectorNotePrompt } from '@/lib/tts/buildCharacterVoiceProfile'

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

    const { name, referenceImage } = characterContext

    const visionImageUrl =
      wardrobeImageUrl?.startsWith('http')
        ? wardrobeImageUrl
        : referenceImage?.startsWith('http')
          ? referenceImage
          : undefined

    const prompt = buildDirectorNotePrompt({
      characterContext,
      screenplayContext,
      selectedInstructions,
      hasPortrait: Boolean(referenceImage?.startsWith('http')),
      wardrobeTurnaround: Boolean(wardrobeImageUrl?.startsWith('http')),
    })

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
    
    // Extract JSON block using regex to safely ignore any conversational filler
    const jsonMatch = generatedText.match(/\{[\s\S]*?"audio_profile"\s*:[\s\S]*?\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.audio_profile) {
          generatedText = parsed.audio_profile
        }
      } catch (e) {
        console.error('[Director Prompt] Failed to parse JSON:', e)
        // If JSON parsing fails but we extracted it, it might have trailing commas, etc.
        // Fallback to stripping the JSON keys manually as a last resort
        generatedText = jsonMatch[0].replace(/\{\s*"audio_profile"\s*:\s*"/, '').replace(/"\s*\}$/, '').trim()
      }
    } else {
      // Complete fallback in case the model ignored the JSON instruction completely
      generatedText = generatedText.replace(/^```[a-zA-Z]*\n?/, '')
                                   .replace(/^```\n?/, '')
                                   .replace(/\n?```$/, '')
                                   .replace(/^(Here is the )?JSON requested:?\n?/i, '')
                                   .trim()
    }

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
