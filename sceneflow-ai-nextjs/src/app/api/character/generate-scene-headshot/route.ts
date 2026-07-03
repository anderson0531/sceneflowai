import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  buildSceneCharacterHeadshotPrompt,
  generateAndUploadFullBodyWardrobe,
  generateAndUploadSceneCharacterHeadshot,
  pickFullBodyWardrobeUrl,
  pickSceneHeadshotUrl,
  type FullBodyWardrobeInput,
  type SceneCharacterHeadshotInput,
} from '@/lib/character/sceneCharacterHeadshot'
import { buildFullBodyWardrobePrompt } from '@/lib/character/characterReferencePrompts'

export const runtime = 'nodejs'
export const maxDuration = 180

const CREDIT_COST = IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT

type WardrobeReferenceMode = 'fullBody' | 'diptych'

interface GenerateSceneHeadshotRequest extends SceneCharacterHeadshotInput, FullBodyWardrobeInput {
  projectId?: string
  characterId?: string
  uploadPath?: string
  forceRegenerate?: boolean
  /** fullBody (default) generates dedicated wardrobe image; diptych uses legacy 16:9 split panel */
  referenceMode?: WardrobeReferenceMode
  existingFullBodyUrl?: string
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
        { error: 'Insufficient credits', required: CREDIT_COST, code: 'INSUFFICIENT_CREDITS' },
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
      referenceMode = 'fullBody',
      existingFullBodyUrl,
      ...headshotFields
    } = body

    if (!characterName?.trim()) {
      return NextResponse.json({ error: 'characterName is required' }, { status: 400 })
    }
    if (!identityReferenceUrl?.trim()) {
      return NextResponse.json({ error: 'identityReferenceUrl is required' }, { status: 400 })
    }

    const safeName = characterName.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()

    if (referenceMode === 'fullBody') {
      const fullBodyInput: FullBodyWardrobeInput = {
        characterName: characterName.trim(),
        identityReferenceUrl: identityReferenceUrl.trim(),
        forceRegenerate: forceRegenerate === true,
        existingFullBodyUrl,
        wardrobeDescription: headshotFields.wardrobeDescription,
        wardrobeAccessories: headshotFields.wardrobeAccessories,
        hairStyle: headshotFields.hairStyle,
        hairColor: headshotFields.hairColor,
        appearanceDescription: headshotFields.appearanceDescription,
      }

      const cachedFullBody = forceRegenerate ? undefined : pickFullBodyWardrobeUrl(fullBodyInput)
      if (cachedFullBody) {
        return NextResponse.json({
          success: true,
          imageUrl: cachedFullBody,
          fullBodyUrl: cachedFullBody,
          prompt: buildFullBodyWardrobePrompt({
            characterName: fullBodyInput.characterName,
            appearanceDescription: fullBodyInput.appearanceDescription,
            wardrobeDescription: fullBodyInput.wardrobeDescription,
            wardrobeAccessories: fullBodyInput.wardrobeAccessories,
          }),
          generated: false,
          reusedExistingHeadshot: true,
          referenceMode: 'fullBody',
        })
      }

      const blobPath =
        uploadPath?.trim() ||
        `characters/${projectId || 'default'}/${safeName}/wardrobes/full-body-${Date.now()}.png`

      const result = await generateAndUploadFullBodyWardrobe(fullBodyInput, blobPath)

      try {
        await CreditService.charge(userId, CREDIT_COST, 'ai_usage', projectId || null, {
          operation: 'character_full_body_wardrobe',
          characterId,
          characterName,
        })
      } catch (chargeError: unknown) {
        console.error('[Scene Headshot] Failed to charge credits:', chargeError)
      }

      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        fullBodyUrl: result.imageUrl,
        prompt: result.prompt,
        generated: result.generated,
        reusedExistingHeadshot: false,
        referenceMode: 'fullBody',
      })
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
        headshotUrl: cachedUrl,
        prompt: buildSceneCharacterHeadshotPrompt(headshotInput),
        generated: false,
        reusedExistingHeadshot: true,
        referenceMode: 'diptych',
      })
    }

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
      headshotUrl: result.imageUrl,
      prompt: result.prompt,
      generated: result.generated,
      reusedExistingHeadshot: false,
      referenceMode: 'diptych',
    })
  } catch (error) {
    console.error('[Scene Headshot] Generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scene headshot generation failed' },
      { status: 500 }
    )
  }
}
