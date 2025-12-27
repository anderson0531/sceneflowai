import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CREDIT_COSTS, getCreditCost } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'

export const dynamic = 'force-dynamic'
export const maxDuration = 120  // Increased for new AI image models

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // Credit pre-check
    const CREDIT_COST = getCreditCost('IMAGE_GENERATION')
    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json(
        { 
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: `This operation requires ${CREDIT_COST} credits. You have ${breakdown.total_credits}.`,
          required: CREDIT_COST,
          available: breakdown.total_credits
        },
        { status: 402 }
      )
    }

    const { projectId, sceneNumber, customPrompt, scene, visualStyle, characters } = await request.json()

    if (!projectId || !sceneNumber || !customPrompt) {
      return NextResponse.json(
        { success: false, error: 'projectId, sceneNumber, and customPrompt are required' },
        { status: 400 }
      )
    }

    console.log(`[Regenerate Scene] Regenerating image for scene ${sceneNumber}`)

    // Ensure database connection
    await sequelize.authenticate()

    // Generate image with Vertex AI Imagen 3
    const base64Image = await generateImageWithGemini(customPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1,
      imageSize: '2K'
    })

    // Upload to Vercel Blob
    const blobUrl = await uploadImageToBlob(
      base64Image,
      `scenes/${projectId}-scene-${sceneNumber}-${Date.now()}.png`
    )

    console.log(`[Regenerate Scene] Image uploaded to Blob:`, blobUrl)

    // Update scene in project metadata
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const script = visionPhase.script || {}
    const scenes = script.script?.scenes || script.scenes || []

    // Update the specific scene
    const updatedScenes = scenes.map((s: any) =>
      s.sceneNumber === sceneNumber
        ? {
            ...s,
            imageUrl: blobUrl,
            imagePrompt: customPrompt,
            imageGeneratedAt: new Date().toISOString()
          }
        : s
    )

    // Update metadata
    const updatedMetadata = {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        script: {
          ...script,
          script: {
            ...script.script,
            scenes: updatedScenes
          },
          scenes: updatedScenes // Also update top-level scenes array if it exists
        }
      }
    }

    await project.update({ metadata: updatedMetadata })

    console.log(`[Regenerate Scene] Scene ${sceneNumber} image updated successfully`)

    // Charge credits after successful generation
    let newBalance: number | undefined
    try {
      await CreditService.charge(
        userId,
        CREDIT_COST,
        'ai_usage',
        projectId,
        { operation: 'scene_image_regenerate', sceneNumber, model: 'imagen-3' }
      )
      console.log(`[Regenerate Scene] Charged ${CREDIT_COST} credits to user ${userId}`)
      const breakdown = await CreditService.getCreditBreakdown(userId)
      newBalance = breakdown.total_credits
    } catch (chargeError: any) {
      console.error('[Regenerate Scene] Failed to charge credits:', chargeError)
    }

    return NextResponse.json({
      success: true,
      imageUrl: blobUrl,
      promptUsed: customPrompt,
      model: 'imagen-3.0-generate-001',
      provider: 'vertex-ai-imagen-3',
      storageType: 'vercel-blob',
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance
    })
  } catch (error: any) {
    console.error('[Regenerate Scene] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to regenerate scene image' },
      { status: 500 }
    )
  }
}

