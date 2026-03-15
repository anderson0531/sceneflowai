/**
 * AI Voice Profile Generation API Route
 * 
 * POST /api/tts/voice-profile/generate
 * 
 * Uses Gemini AI (with optional vision) to generate a rich, ElevenLabs-optimized
 * voice description from character context and reference image.
 * 
 * Input:
 *   - characterName: string
 *   - characterContext: { role, gender, age, ethnicity, personality, description }
 *   - referenceImageUrl?: string (URL to character reference image)
 *   - screenplayContext?: { genre, tone, era, setting }
 * 
 * Output:
 *   - voiceDescription: string (100-900 chars, optimized for ElevenLabs voice design)
 *   - summary: string (short human-readable summary)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText, generateWithVision } from '@/lib/vertexai/gemini'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface VoiceProfileRequest {
  characterName: string
  characterContext: {
    role?: string
    gender?: string
    age?: string
    ethnicity?: string
    personality?: string
    description?: string
  }
  referenceImageUrl?: string
  screenplayContext?: {
    genre?: string
    tone?: string
    era?: string
    setting?: string
    targetAudience?: string
    title?: string
  }
}

function buildVoiceProfilePrompt(req: VoiceProfileRequest): string {
  const { characterName, characterContext, screenplayContext } = req

  const charParts: string[] = []
  if (characterContext.gender) charParts.push(`Gender: ${characterContext.gender}`)
  if (characterContext.age) charParts.push(`Age: ${characterContext.age}`)
  if (characterContext.ethnicity) charParts.push(`Ethnicity: ${characterContext.ethnicity}`)
  if (characterContext.role) charParts.push(`Role: ${characterContext.role}`)
  if (characterContext.personality) charParts.push(`Key Traits: ${characterContext.personality}`)
  if (characterContext.description) charParts.push(`Description: ${characterContext.description}`)

  const screenplayParts: string[] = []
  if (screenplayContext?.genre) screenplayParts.push(`Genre: ${screenplayContext.genre}`)
  if (screenplayContext?.tone) screenplayParts.push(`Tone: ${screenplayContext.tone}`)
  if (screenplayContext?.era) screenplayParts.push(`Era: ${screenplayContext.era}`)
  if (screenplayContext?.setting) screenplayParts.push(`Setting: ${screenplayContext.setting}`)
  if (screenplayContext?.title) screenplayParts.push(`Project: ${screenplayContext.title}`)

  return `You are an expert voice casting director for film and television. Generate a detailed voice description for an AI text-to-speech voice design system (ElevenLabs).

CHARACTER: ${characterName}
${charParts.length > 0 ? charParts.join('\n') : 'No additional character info provided.'}

${screenplayParts.length > 0 ? `PRODUCTION CONTEXT:\n${screenplayParts.join('\n')}` : ''}

${req.referenceImageUrl ? 'A reference image of the character is attached. Analyze their appearance, expression, build, and demeanor to infer vocal qualities that would match their visual presence.' : ''}

INSTRUCTIONS:
Generate a rich voice description (200-600 characters) optimized for ElevenLabs voice design API. The description should:

1. **Vocal Quality**: Specify fundamental voice qualities (pitch range, resonance, timbre, breathiness, rasp)
2. **Age & Energy**: Match the character's apparent age and energy level
3. **Emotional Tone**: Default emotional register (warm, commanding, mysterious, playful, etc.)
4. **Pacing & Rhythm**: Speaking tempo and rhythm patterns (measured, rapid, deliberate, flowing)
5. **Cultural Nuance**: Any accent or cultural vocal qualities appropriate to the character
6. **Character Essence**: How the voice embodies the character's personality

FORMAT: Return ONLY the voice description text. No labels, no headers, no markdown. Just the description as a single flowing paragraph that reads naturally as a voice casting brief.

EXAMPLE OUTPUT:
"A warm, mid-range female voice with subtle honey-like resonance and a grounded, confident delivery. Natural American accent with hints of Southern warmth. Speaking pace is measured and deliberate, with occasional pauses for emphasis. The voice carries quiet authority and emotional depth — the kind of voice that makes you lean in to listen. Slight breathiness on softer passages adds intimacy, while firmer moments reveal underlying steel and determination."

Generate the voice description now:`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: VoiceProfileRequest = await request.json()
    const { characterName, characterContext, referenceImageUrl, screenplayContext } = body

    if (!characterName) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    const prompt = buildVoiceProfilePrompt(body)

    let voiceDescription: string

    if (referenceImageUrl && referenceImageUrl.startsWith('http')) {
      // Multimodal: Send character image + text prompt to Gemini Vision
      console.log(`[Voice Profile] Generating with vision for "${characterName}"...`)
      
      try {
        // Fetch the image and convert to base64
        const imageResponse = await fetch(referenceImageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch reference image: ${imageResponse.status}`)
        }
        
        const imageBuffer = await imageResponse.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        
        const result = await generateWithVision(
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
            maxOutputTokens: 1024,
          }
        )
        
        voiceDescription = result.text.trim()
      } catch (visionError) {
        console.warn('[Voice Profile] Vision failed, falling back to text-only:', visionError)
        // Fallback to text-only generation
        const result = await generateText(prompt, {
          temperature: 0.7,
          maxOutputTokens: 1024,
        })
        voiceDescription = result.text.trim()
      }
    } else {
      // Text-only: Generate from character context alone
      console.log(`[Voice Profile] Generating text-only for "${characterName}"...`)
      
      const result = await generateText(prompt, {
        temperature: 0.7,
        maxOutputTokens: 1024,
      })
      voiceDescription = result.text.trim()
    }

    // Clean up the response - remove any quotes wrapping the description
    voiceDescription = voiceDescription
      .replace(/^["']|["']$/g, '')
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .trim()

    // Ensure it meets ElevenLabs requirements (20-1000 chars)
    if (voiceDescription.length < 20) {
      voiceDescription = `A distinctive, expressive voice for ${characterName} with natural warmth and clear articulation suitable for film narration.`
    }
    if (voiceDescription.length > 1000) {
      // Truncate at the last sentence boundary within limit
      const truncated = voiceDescription.substring(0, 1000)
      const lastPeriod = truncated.lastIndexOf('.')
      if (lastPeriod > 500) {
        voiceDescription = truncated.substring(0, lastPeriod + 1)
      } else {
        voiceDescription = truncated
      }
    }

    // Generate a short summary for UI display
    const summaryLength = Math.min(voiceDescription.length, 120)
    const summary = voiceDescription.substring(0, summaryLength) + 
      (voiceDescription.length > summaryLength ? '...' : '')

    console.log(`[Voice Profile] Generated ${voiceDescription.length} char description for "${characterName}"`)

    return NextResponse.json({
      success: true,
      voiceDescription,
      summary,
      characterName,
      usedVision: !!referenceImageUrl
    })
  } catch (error) {
    console.error('[Voice Profile] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate voice profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
