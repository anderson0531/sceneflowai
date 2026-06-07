import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateWithVision } from '@/lib/vertexai/gemini'
import type { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'
import {
  buildWardrobeVoiceAnalysisPrompt,
  parseWardrobeVoiceAnalysisJson,
} from '@/lib/character/wardrobeVoiceAnalysis'

export const runtime = 'nodejs'
export const maxDuration = 60

interface AnalyzeVoiceFromWardrobeRequest {
  characterName: string
  wardrobeImageUrl: string
  wardrobeId?: string
  characterContext?: CharacterContext
  screenplayContext?: ScreenplayContext
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as AnalyzeVoiceFromWardrobeRequest
    const { characterName, wardrobeImageUrl, wardrobeId, characterContext, screenplayContext } = body

    if (!characterName?.trim()) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    if (!wardrobeImageUrl?.startsWith('http')) {
      return NextResponse.json(
        { error: 'A valid wardrobe turnaround image URL (fullBodyUrl) is required' },
        { status: 400 },
      )
    }

    const prompt = buildWardrobeVoiceAnalysisPrompt(characterName, {
      screenplayContext,
      characterDescription:
        characterContext?.description ||
        characterContext?.voiceDescription ||
        undefined,
    })

    const imageResponse = await fetch(wardrobeImageUrl)
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch wardrobe image: ${imageResponse.status}` },
        { status: 400 },
      )
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    console.log(`[Wardrobe Voice Analysis] Analyzing "${characterName}" from wardrobe image...`)

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

    const parsed = parseWardrobeVoiceAnalysisJson(result.text?.trim() || '')
    if (!parsed) {
      console.error('[Wardrobe Voice Analysis] Failed to parse response:', result.text?.slice(0, 300))
      return NextResponse.json(
        { error: 'Failed to parse voice analysis from wardrobe image' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ...parsed,
      wardrobeId,
      wardrobeImageUrl,
    })
  } catch (error: unknown) {
    console.error('[Wardrobe Voice Analysis] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Voice analysis failed' },
      { status: 500 },
    )
  }
}
