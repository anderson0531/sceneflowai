import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import CollabBlueprintFeedback from '@/models/CollabBlueprintFeedback'
import CollabSession from '@/models/CollabSession'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import { requireOwnerForSession, sessionDbId } from '@/lib/blueprint/shareAuth'
import { getPayload } from '@/lib/blueprint/shareSession'
import { synthesizeCollabFeedback } from '@/lib/treatment/collabFeedbackSynthesizer'
import { ensureCollabBlueprintFeedbackTable } from '@/lib/blueprint/ensureCollabBlueprintSchema'

export const runtime = 'nodejs'

const CREDIT_COST = BLUEPRINT_CREDITS.BLUEPRINT_COLLAB_SYNTHESIS

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const auth = await requireOwnerForSession(token)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await sequelize.authenticate()
    await ensureCollabBlueprintFeedbackTable()
    const session = auth.session!
    const payload = getPayload(session)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 400 })
    }

    const hasCredits = await CreditService.ensureCredits(auth.ownerUserId, CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits', creditsRequired: CREDIT_COST },
        { status: 402 }
      )
    }

    const sessionId = sessionDbId(session)
    const rows = await CollabBlueprintFeedback.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
    })

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No feedback to synthesize' }, { status: 400 })
    }

    const recommendations = await synthesizeCollabFeedback({
      payload,
      feedbackRows: rows.map((r) => ({
        reviewerName: r.reviewerName,
        overallScore: r.overallScore,
        sections: r.sections,
        freeformNotes: r.freeformNotes,
      })),
    })

    const synthesizedAt = new Date().toISOString()
    const updatedPayload = {
      ...payload,
      lastSynthesis: { recommendations, synthesizedAt },
    }
    await CollabSession.update({ payload: updatedPayload }, { where: { id: sessionId } })

    await CreditService.charge(auth.ownerUserId, CREDIT_COST, 'ai_usage', null, {
      operation: 'blueprint_collab_synthesis',
      sessionId,
    })

    return NextResponse.json({
      success: true,
      recommendations,
      synthesizedAt,
      creditsCharged: CREDIT_COST,
    })
  } catch (e: unknown) {
    console.error('[blueprint/share/synthesize]', e)
    const message = e instanceof Error ? e.message : 'Synthesis failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
