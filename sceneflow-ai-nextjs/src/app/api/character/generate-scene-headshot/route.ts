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
import {
  composeUploadAndPersistCombinedCharacterRef,
  wardrobeExpectedFingerprint,
} from '@/lib/character/combinedCharacterRef'

export const runtime = 'nodejs'
export const maxDuration = 300

const CREDIT_COST = IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT

type WardrobeReferenceMode = 'fullBody' | 'diptych'

async function maybePersistCombinedRef(args: {
  projectId?: string
  characterId?: string
  wardrobeId?: string
  identityUrl: string
  wardrobeUrl: string
  characterName: string
  wardrobe?: {
    name?: string
    description?: string
    accessories?: string
    appearanceNotes?: string
  }
}): Promise<string | undefined> {
  const { projectId, characterId, wardrobeId, identityUrl, wardrobeUrl } = args
  if (!projectId || !characterId || !wardrobeId) return undefined
  const url = await composeUploadAndPersistCombinedCharacterRef({
    projectId,
    characterId,
    wardrobeId,
    identityUrl,
    wardrobeUrl,
    expectedFingerprint: wardrobeExpectedFingerprint(args.wardrobe || {}),
    label: args.characterName,
  })
  return url ?? undefined
}

interface GenerateSceneHeadshotRequest extends SceneCharacterHeadshotInput, FullBodyWardrobeInput {
  projectId?: string
  characterId?: string
  wardrobeId?: string
  uploadPath?: string
  forceRegenerate?: boolean
  /** fullBody (default) generates dedicated wardrobe image; diptych uses legacy 16:9 split panel */
  referenceMode?: WardrobeReferenceMode
  existingFullBodyUrl?: string
  promptOverride?: string
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
      wardrobeId,
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
        appearanceNotes: headshotFields.appearanceNotes,
        promptOverride: headshotFields.promptOverride,
      }

      const cachedFullBody = forceRegenerate ? undefined : pickFullBodyWardrobeUrl(fullBodyInput)
      if (cachedFullBody) {
        const combinedCharacterRefUrl = await maybePersistCombinedRef({
          projectId,
          characterId,
          wardrobeId,
          identityUrl: identityReferenceUrl.trim(),
          wardrobeUrl: cachedFullBody,
          characterName: characterName.trim(),
          wardrobe: {
            description: headshotFields.wardrobeDescription,
            accessories: headshotFields.wardrobeAccessories,
            appearanceNotes: headshotFields.appearanceNotes,
          },
        })
        return NextResponse.json({
          success: true,
          imageUrl: cachedFullBody,
          fullBodyUrl: cachedFullBody,
          ...(combinedCharacterRefUrl ? { combinedCharacterRefUrl } : {}),
          prompt: buildFullBodyWardrobePrompt({
            characterName: fullBodyInput.characterName,
            appearanceDescription: fullBodyInput.appearanceDescription,
            wardrobeDescription: fullBodyInput.wardrobeDescription,
            wardrobeAccessories: fullBodyInput.wardrobeAccessories,
            appearanceNotes: fullBodyInput.appearanceNotes,
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

      const combinedCharacterRefUrl = await maybePersistCombinedRef({
        projectId,
        characterId,
        wardrobeId,
        identityUrl: identityReferenceUrl.trim(),
        wardrobeUrl: result.imageUrl,
        characterName: characterName.trim(),
        wardrobe: {
          description: headshotFields.wardrobeDescription,
          accessories: headshotFields.wardrobeAccessories,
          appearanceNotes: headshotFields.appearanceNotes,
        },
      })

      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        fullBodyUrl: result.imageUrl,
        ...(combinedCharacterRefUrl ? { combinedCharacterRefUrl } : {}),
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
