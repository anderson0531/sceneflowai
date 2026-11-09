import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LEGAL_SUPPORT_EMAIL } from '@/config/legal/legalCopy'
import {
  evaluateGenerationError,
  type GenerationMediaType,
} from '@/lib/errors/generationErrorIntelligence'
import {
  generateSupportTicketId,
  saveSupportErrorReport,
  sendSupportEscalationEmail,
  type GenerationErrorSupportReport,
  type SupportReportContext,
} from '@/lib/support/generationErrorReport'

export const runtime = 'nodejs'

interface ReportGenerationErrorBody {
  mediaType?: GenerationMediaType
  rawError?: string
  technicalDetails?: string
  statusCode?: number
  errorCode?: string
  category?: string
  title?: string
  explanation?: string
  recommendedAction?: string
  prompt?: string
  userNote?: string
  context?: SupportReportContext
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const sessionUser = (session as { user?: { id?: string; email?: string; name?: string } } | null)?.user

    if (!sessionUser?.email && !sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Please sign in to submit a support report.' },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as ReportGenerationErrorBody
    const mediaType: GenerationMediaType = body.mediaType === 'still' ? 'still' : 'clip'
    const rawDiagnostic = (body.technicalDetails || body.rawError || '').trim()

    const evaluated = evaluateGenerationError({
      mediaType,
      rawError: rawDiagnostic || body.explanation || 'Generation failed',
      statusCode: body.statusCode,
      errorCode: body.errorCode,
      generationMethod: body.context?.generationMethod,
      provider: body.context?.provider,
    })

    const nowIso = new Date().toISOString()
    const ticketId = generateSupportTicketId()

    const report: GenerationErrorSupportReport = {
      ticketId,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: 'open',
      user: {
        id: sessionUser.id ? String(sessionUser.id) : undefined,
        email: sessionUser.email || undefined,
        name: sessionUser.name || undefined,
      },
      mediaType,
      category: evaluated.category,
      title: body.title?.trim() || evaluated.title,
      explanation: body.explanation?.trim() || evaluated.explanation,
      recommendedAction: body.recommendedAction?.trim() || evaluated.primaryCta.label,
      context: {
        projectId: body.context?.projectId?.slice(0, 120),
        projectTitle: body.context?.projectTitle?.slice(0, 200),
        sceneId: body.context?.sceneId?.slice(0, 120),
        sceneNumber:
          typeof body.context?.sceneNumber === 'number' ? body.context.sceneNumber : undefined,
        beatId: body.context?.beatId?.slice(0, 120),
        segmentId: body.context?.segmentId?.slice(0, 120),
        shotNumber:
          typeof body.context?.shotNumber === 'number' ? body.context.shotNumber : undefined,
        shotLabel: body.context?.shotLabel?.slice(0, 200),
        frameRole: body.context?.frameRole?.slice(0, 40),
        generationMethod: body.context?.generationMethod?.slice(0, 40),
        provider: body.context?.provider?.slice(0, 60),
        model: body.context?.model?.slice(0, 120),
        qualityTier: body.context?.qualityTier?.slice(0, 40),
        resolution: body.context?.resolution?.slice(0, 40),
        pageUrl: body.context?.pageUrl?.slice(0, 500),
        userAgent: request.headers.get('user-agent')?.slice(0, 300) || body.context?.userAgent?.slice(0, 300),
      },
      prompt: body.prompt?.trim().slice(0, 6000) || undefined,
      technicalDetails: rawDiagnostic.slice(0, 8000) || undefined,
      userNote: body.userNote?.trim().slice(0, 2000) || undefined,
      emailSent: false,
    }

    const emailOutcome = await sendSupportEscalationEmail(report)
    report.emailSent = emailOutcome.sent

    await saveSupportErrorReport(report)

    console.info('[SupportEscalation] Generation error reported:', {
      ticketId: report.ticketId,
      user: report.user.email || report.user.id,
      mediaType: report.mediaType,
      category: report.category,
      projectId: report.context.projectId,
      sceneId: report.context.sceneId,
      segmentId: report.context.segmentId,
      beatId: report.context.beatId,
      emailSent: report.emailSent,
    })

    return NextResponse.json({
      success: true,
      ticketId: report.ticketId,
      supportEmail: LEGAL_SUPPORT_EMAIL,
      emailSent: report.emailSent,
    })
  } catch (error) {
    console.error('[SupportEscalation] Failed to record support report:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Could not submit support report right now. Please email support@sceneflowai.studio.',
      },
      { status: 500 }
    )
  }
}
