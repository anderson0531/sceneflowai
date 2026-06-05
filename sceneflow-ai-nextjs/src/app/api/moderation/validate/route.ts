import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { CreditService } from '@/services/CreditService'
import { getModerationValidationCost } from '@/lib/credits/creditCosts'
import { isValidationApiEnabled } from '@/lib/moderation/moderationFlags'
import { runStageModeration, type ModerationStage } from '@/lib/moderation/moderationPipeline'
import {
  resolveValidationContent,
  type ValidationContentSource,
} from '@/lib/moderation/validationResolver'

export const runtime = 'nodejs'
export const maxDuration = 120

const STAGES: ModerationStage[] = [
  'blueprint',
  'script',
  'character',
  'storyboard',
  'fal_video',
]

interface ValidateRequest {
  projectId: string
  stage: ModerationStage
  text?: string
  imageUrl?: string
  videoUrl?: string
  source?: ValidationContentSource
  resourceId?: string
  includeCopyrightMedia?: boolean
}

export async function POST(req: NextRequest) {
  try {
    if (!isValidationApiEnabled()) {
      return NextResponse.json(
        { error: 'Content validation is not enabled', code: 'MODERATION_DISABLED' },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as ValidateRequest
    const { projectId, stage, source, resourceId, includeCopyrightMedia } = body

    if (!projectId || !stage || !STAGES.includes(stage)) {
      return NextResponse.json(
        { error: 'projectId and valid stage are required' },
        { status: 400 }
      )
    }

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const ownerId = String((project as { user_id?: string }).user_id || '')
    if (ownerId && ownerId !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const creditCost = getModerationValidationCost(stage, { includeCopyrightMedia })
    const hasCredits = await CreditService.ensureCredits(userId, creditCost)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          creditsRequired: creditCost,
          creditsAvailable: breakdown?.total_credits ?? 0,
        },
        { status: 402 }
      )
    }

    let resolved
    try {
      resolved = resolveValidationContent({
        metadata: project.metadata as Record<string, unknown>,
        stage,
        source,
        resourceId,
        text: body.text,
        imageUrl: body.imageUrl,
        videoUrl: body.videoUrl,
      })
    } catch (resolveErr) {
      return NextResponse.json(
        {
          error: resolveErr instanceof Error ? resolveErr.message : 'Could not resolve content',
        },
        { status: 400 }
      )
    }

    if (!resolved.text?.trim() && !resolved.imageUrl && !resolved.videoUrl) {
      return NextResponse.json({ error: 'No content to validate' }, { status: 400 })
    }

    const moderationReport = await runStageModeration({
      stage,
      text: resolved.text,
      imageUrl: resolved.imageUrl,
      videoUrl: resolved.videoUrl,
      forceEnabled: true,
      validationMode: true,
      context: {
        userId: String(userId),
        projectId,
        resourceId: resolved.resourceId || resourceId,
        includeCopyrightMedia: includeCopyrightMedia === true,
      },
    })

    if (!moderationReport) {
      return NextResponse.json(
        {
          error: 'Validation service unavailable (Hive not configured)',
          code: 'HIVE_UNAVAILABLE',
        },
        { status: 503 }
      )
    }

    await CreditService.charge(userId, creditCost, 'ai_usage', projectId, {
      operation: 'moderation_validate',
      stage,
      resourceId: resolved.resourceId || resourceId,
    })

    const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)

    return NextResponse.json({
      success: true,
      moderationReport,
      creditsCharged: creditCost,
      creditsBalance: breakdown?.total_credits,
    })
  } catch (error) {
    console.error('[Moderation Validate] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    )
  }
}
