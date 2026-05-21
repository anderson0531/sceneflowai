import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import CollabBlueprintFeedback from '@/models/CollabBlueprintFeedback'
import { resolveSessionByToken, getPayload } from '@/lib/blueprint/shareSession'
import { requireOwnerForSession, validateParticipant, sessionDbId } from '@/lib/blueprint/shareAuth'
import type { BlueprintStructuredFeedbackInput } from '@/lib/blueprint/shareTypes'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const auth = await requireOwnerForSession(token)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await sequelize.authenticate()
    const sessionId = sessionDbId(auth.session!)

    const rows = await CollabBlueprintFeedback.findAll({
      where: { sessionId },
      order: [['createdAt', 'DESC']],
      limit: 100,
    })

    return NextResponse.json({
      success: true,
      feedback: rows.map((r) => ({
        id: r.id,
        participantId: r.participantId,
        reviewerName: r.reviewerName,
        reviewerEmail: r.reviewerEmail,
        overallScore: r.overallScore,
        preferred: r.preferred,
        sections: r.sections,
        freeformNotes: r.freeformNotes,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    await sequelize.authenticate()

    const session = await resolveSessionByToken(token)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }
    if (!getPayload(session)) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 400 })
    }

    const body = (await req.json()) as BlueprintStructuredFeedbackInput
    if (!body.reviewerName?.trim()) {
      return NextResponse.json({ success: false, error: 'reviewerName required' }, { status: 400 })
    }

    const sessionId = sessionDbId(session)
    if (body.participantId) {
      const v = await validateParticipant(sessionId, body.participantId)
      if (!v.ok) {
        return NextResponse.json({ success: false, error: v.error }, { status: 403 })
      }
    }

    const row = await CollabBlueprintFeedback.create({
      sessionId,
      participantId: body.participantId || null,
      reviewerName: body.reviewerName.trim().slice(0, 120),
      reviewerEmail: body.reviewerEmail?.trim() || null,
      overallScore:
        typeof body.overallScore === 'number'
          ? Math.min(5, Math.max(1, Math.round(body.overallScore)))
          : null,
      preferred: body.preferred ?? null,
      sections: body.sections || null,
      freeformNotes: body.freeformNotes?.slice(0, 5000) || null,
    })

    return NextResponse.json({
      success: true,
      id: row.id,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
