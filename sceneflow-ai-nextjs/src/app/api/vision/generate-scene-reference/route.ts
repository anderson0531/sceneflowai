import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadReferenceLibraryBase64Image } from '@/lib/storage/referenceLibraryStorage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import {
  buildArtStyleSpecFromValue,
  isPhotorealisticArtStyle,
} from '@/lib/artStyle/globalArtStyle'
import { getArtStyleNegativeTerms, resolveProjectArtStyle } from '@/lib/vision/artStyle'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { executeMeteredProviderCall } from '@/lib/credits/meteredGateway'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'

export const runtime = 'nodejs'
export const maxDuration = 60

interface GenerateSceneReferenceRequest {
  prompt: string
  name: string
  description?: string
  sourceSceneNumber?: number
  aspectRatio?: '16:9' | '9:16' | '1:1'
  negativePrompt?: string
  projectId?: string
  artStyle?: string
}

/**
 * Generate a scene reference image using Gemini 3.0
 * Uses personGeneration: 'dont_allow' to ensure no people are generated
 * This creates clean environment/location references for video generation
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateSceneReferenceRequest = await req.json()
    const { 
      prompt: enteredPrompt, 
      name, 
      description, 
      sourceSceneNumber,
      aspectRatio = '16:9',
      negativePrompt = 'people, characters, faces, crowds, humans, persons, figures'
    } = body

    if (!enteredPrompt || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, name' },
        { status: 400 }
      )
    }

    // Typed in the creator's language; the image model needs English.
    const { storyLocale, properNouns } = await resolveRequestStoryLocale(req, {
      projectId: (body as { projectId?: string }).projectId,
    })
    const prompt = await englishForModel(enteredPrompt, storyLocale, properNouns)

    console.log('[Scene Reference Generation] Generating scene reference:', name)
    console.log('[Scene Reference Generation] Prompt:', prompt.substring(0, 200))
    console.log('[Scene Reference Generation] Source scene:', sourceSceneNumber)

    let effectiveArtStyle = body.artStyle?.trim() || undefined
    if (!effectiveArtStyle && body.projectId) {
      try {
        const { Project } = await import('@/models/Project')
        const project = await Project.findByPk(body.projectId)
        if (project?.metadata) {
          effectiveArtStyle = resolveProjectArtStyle(project.metadata)
        }
      } catch {
        // Optional DB lookup fallback
      }
    }

    const styleLine =
      effectiveArtStyle && effectiveArtStyle !== 'photorealistic'
        ? isPhotorealisticArtStyle(effectiveArtStyle)
          ? `\nGlobal Art Style grade: ${buildArtStyleSpecFromValue(effectiveArtStyle).stylePrompt}.`
          : `\n${buildArtStyleSpecFromValue(effectiveArtStyle).locationRefDirective}`
        : ''

    // Enhance prompt to explicitly exclude people
    const enhancedPrompt = `${prompt}

Environment only. No people, no characters, no human figures. Empty scene showing only the location, props, lighting, and atmosphere.${styleLine}`

    const mergedNegativePrompt =
      effectiveArtStyle && effectiveArtStyle !== 'photorealistic'
        ? `${negativePrompt}, ${getArtStyleNegativeTerms(effectiveArtStyle)}`
        : negativePrompt

    // Generate image using Gemini 3.0 with personGeneration: 'dont_allow' under credit escrow
    const metered = await executeMeteredProviderCall({
      userId: String(session.user.id),
      projectId: body.projectId || null,
      route: '/api/vision/generate-scene-reference',
      provider: 'vertex',
      model: GEMINI_IMAGE_MODELS.pro,
      operation: 'scene_reference',
      quoteInput: {
        kind: 'reference',
        model: GEMINI_IMAGE_MODELS.pro,
        resolution: '1080p',
        imageCount: 1,
        floorCredits: IMAGE_CREDITS.SCENE_REFERENCE,
      },
      meta: { name, sourceSceneNumber, aspectRatio },
      execute: async () => {
        const base64Image = await generateImageWithGemini(enhancedPrompt, {
          aspectRatio: aspectRatio,
          numberOfImages: 1,
          imageSize: '2K',
          personGeneration: 'dont_allow',  // Critical: ensures no people in scene reference
          negativePrompt: mergedNegativePrompt,
        })

        console.log('[Scene Reference Generation] Image generated, uploading to storage...')

        // Upload to blob storage
        return await uploadReferenceLibraryBase64Image(
          base64Image,
          `scene-references/${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`
        )
      },
    })

    const imageUrl = metered.result
    console.log('[Scene Reference Generation] Upload complete:', imageUrl)

    return NextResponse.json({
      success: true,
      imageUrl,
      name,
      description,
      sourceSceneNumber,
      creditsCharged: metered.creditsCharged,
    })

  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          required: IMAGE_CREDITS.SCENE_REFERENCE,
        },
        { status: 402 }
      )
    }
    console.error('[Scene Reference Generation] Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate scene reference',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
