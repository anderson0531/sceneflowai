import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  buildSceneCharacterHeadshotPrompt,
  generateAndUploadSceneCharacterHeadshot,
  pickSceneHeadshotUrl,
  type SceneCharacterHeadshotInput,
} from '@/lib/character/sceneCharacterHeadshot'

export const runtime = 'nodejs'
export const maxDuration = 120

const CREDIT_COST = IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT

interface GenerateSceneHeadshotRequest extends SceneCharacterHeadshotInput {
  projectId?: string
  characterId?: string
  uploadPath?: string
  forceRegenerate?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const hasEnoughCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasEnoughCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: CREDIT_COST },
        { status: 402 }
      )
    }

    const body: GenerateSceneHeadshotRequest = await req.json()
    const {
      projectId,
      characterId,
      characterName,
      identityReferenceUrl,
      uploadPath,
      forceRegenerate,
      ...headshotFields
    } = body

    if (!characterName?.trim()) {
      return NextResponse.json({ error: 'characterName is required' }, { status: 400 })
    }
    if (!identityReferenceUrl?.trim()) {
      return NextResponse.json({ error: 'identityReferenceUrl is required' }, { status: 400 })
    }

    const headshotInput: SceneCharacterHeadshotInput = {
      characterName: characterName.trim(),
      identityReferenceUrl: identityReferenceUrl.trim(),
      forceRegenerate: forceRegenerate === true,
      ...headshotFields,
    }

    const cachedUrl = forceRegenerate ? undefined : pickSceneHeadshotUrl(headshotInput)
    if (cachedUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: cachedUrl,
        prompt: buildSceneCharacterHeadshotPrompt(headshotInput),
        generated: false,
        reusedExistingHeadshot: true,
      })
    }

    const safeName = characterName.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
    const blobPath =
      uploadPath?.trim() ||
      `characters/${projectId || 'default'}/${safeName}/scene-headshot-${Date.now()}.png`

    const result = await generateAndUploadSceneCharacterHeadshot(headshotInput, blobPath)

    try {
      await CreditService.charge(userId, CREDIT_COST, 'ai_usage', projectId || null, {
        operation: 'scene_character_headshot',
        characterId,
        characterName,
      })
    } catch (chargeError: unknown) {
      console.error('[Scene Headshot] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      prompt: result.prompt,
      generated: result.generated,
      reusedExistingHeadshot: false,
    })
  } catch (error) {
    console.error('[Scene Headshot] Generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scene headshot generation failed' },
      { status: 500 }
    )
  }
}
