import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText, generateWithVision } from '@/lib/vertexai/gemini'
import type { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'
import {
  buildWardrobeVoiceAnalysisPrompt,
  parseWardrobeVoiceAnalysisJson,
} from '@/lib/character/wardrobeVoiceAnalysis'

export const runtime = 'nodejs'
export const maxDuration = 60

interface AnalyzeVoiceFromWardrobeRequest {
  characterName: string
  /** Preferred: character identity portrait URL */
  characterImageUrl?: string
  /** Legacy fallback */
  wardrobeImageUrl?: string
  wardrobeId?: string
  characterContext?: CharacterContext
  screenplayContext?: ScreenplayContext
}

function buildAnalysisPrompt(
  characterName: string,
  characterContext?: CharacterContext,
  screenplayContext?: ScreenplayContext,
  hasPortrait?: boolean,
): string {
  return buildWardrobeVoiceAnalysisPrompt(characterName, {
    screenplayContext,
    characterDescription:
      characterContext?.description ||
      characterContext?.voiceDescription ||
      undefined,
    characterRole: characterContext?.role,
    personality: characterContext?.personality,
    hasPortrait,
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as AnalyzeVoiceFromWardrobeRequest
    const {
      characterName,
      characterImageUrl,
      wardrobeImageUrl,
      wardrobeId,
      characterContext,
      screenplayContext,
    } = body

    const imageUrl = characterImageUrl?.trim() || wardrobeImageUrl?.trim()
    const hasPortrait = Boolean(imageUrl?.startsWith('http'))

    if (!characterName?.trim()) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    const hasNarrative =
      Boolean(characterContext?.description?.trim()) ||
      Boolean(characterContext?.voiceDescription?.trim()) ||
      Boolean(characterContext?.role?.trim()) ||
      Boolean(characterContext?.personality?.trim())

    if (!hasPortrait && !hasNarrative) {
      return NextResponse.json(
        {
          error:
            'Provide a character description, role, or reference image for voice profiling',
        },
        { status: 400 },
      )
    }

    const prompt = buildAnalysisPrompt(
      characterName,
      characterContext,
      screenplayContext,
      hasPortrait,
    )

    let resultText = ''

    if (hasPortrait && imageUrl) {
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch character image: ${imageResponse.status}` },
          { status: 400 },
        )
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

      console.log(`[Character Voice Analysis] Vision + narrative for "${characterName}"...`)

      const result = await generateWithVision(
        [
          {
            inlineData: {
              mimeType: contentType,
              data: base64Image,
            },
          },
          { text: prompt },
        ],
        {
          model: 'gemini-2.5-flash',
          temperature: 0.5,
          maxOutputTokens: 1024,
        },
      )
      resultText = result.text?.trim() || ''
    } else {
      console.log(`[Character Voice Analysis] Narrative-only for "${characterName}"...`)

      const result = await generateText(prompt, {
        model: 'gemini-2.5-flash',
        temperature: 0.5,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      })
      resultText = result.text?.trim() || ''
    }

    const parsed = parseWardrobeVoiceAnalysisJson(resultText, {
      confidence: hasPortrait ? 'vision' : 'narrative',
    })
    if (!parsed) {
      console.error('[Character Voice Analysis] Failed to parse response:', resultText.slice(0, 300))
      return NextResponse.json(
        { error: 'Failed to parse voice analysis' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ...parsed,
      wardrobeId,
      characterImageUrl: imageUrl,
      wardrobeImageUrl: imageUrl,
    })
  } catch (error: unknown) {
    console.error('[Character Voice Analysis] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Voice analysis failed' },
      { status: 500 },
    )
  }
}
