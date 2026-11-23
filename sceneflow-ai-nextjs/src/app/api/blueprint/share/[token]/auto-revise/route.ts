import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import {
  applyConfirmedCustomerBlueprintRevision,
  clarifyCustomerBlueprintFeedback,
  dismissGuestBlueprintFeedback,
  ensureGuestBlueprintShareLink,
  grantBlueprintIterationPack,
  listGuestBlueprintFeedbackForPrimaryCustomer,
  runStandaloneCustomerArIteration,
} from '@/lib/intake/automatedClientBlueprint'

export const runtime = 'nodejs'
export const maxDuration = 180

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    await sequelize.authenticate()

    const body = (await req.json().catch(() => ({}))) as {
      action?:
        | 'clarify'
        | 'apply'
        | 'run_ar'
        | 'ensure_guest_link'
        | 'list_guest_feedback'
        | 'dismiss_guest_feedback'
        | 'purchase_iteration_pack'
      feedback?: string
      feedbackId?: string
      confirmedIntent?: string
      selectedFeedbackIds?: string[]
      selectedRecommendationIds?: string[]
      packsCount?: number
      reviewerName?: string
      locale?: string
    }

    const origin = new URL(req.url).origin
    const action = body.action || 'clarify'

    if (action === 'ensure_guest_link') {
      const res = await ensureGuestBlueprintShareLink({
        token,
        origin,
        locale: body.locale,
      })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: res.status })
      }
      return NextResponse.json({
        success: true,
        guestShareToken: res.guestShareToken,
        guestShareUrl: res.guestShareUrl,
      })
    }

    if (action === 'list_guest_feedback') {
      const res = await listGuestBlueprintFeedbackForPrimaryCustomer({ token })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: res.status })
      }
      return NextResponse.json({
        success: true,
        items: res.items,
      })
    }

    if (action === 'dismiss_guest_feedback') {
      const res = await dismissGuestBlueprintFeedback({
        token,
        feedbackId: String(body.feedbackId || ''),
      })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: res.status })
      }
      return NextResponse.json({
        success: true,
        dismissedFeedbackIds: res.dismissedFeedbackIds,
      })
    }

    if (action === 'purchase_iteration_pack') {
      const res = await grantBlueprintIterationPack({
        token,
        packsCount: typeof body.packsCount === 'number' ? body.packsCount : 1,
        origin,
        locale: body.locale,
        source: 'client_self_serve',
      })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: res.status })
      }
      return NextResponse.json({
        success: true,
        maxFeedbackRounds: res.maxFeedbackRounds,
        roundsUsed: res.roundsUsed,
        maxArIterations: res.maxArIterations,
        arIterationsUsed: res.arIterationsUsed,
        extraIterationPacksPurchased: res.extraIterationPacksPurchased,
        extraIterationRevenueUsd: res.extraIterationRevenueUsd,
      })
    }

    if (action === 'clarify') {
      const res = await clarifyCustomerBlueprintFeedback({
        token,
        rawFeedback: String(body.feedback || ''),
        selectedFeedbackIds: body.selectedFeedbackIds,
        selectedRecommendationIds: body.selectedRecommendationIds,
        reviewerName: body.reviewerName,
        locale: body.locale,
      })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: res.status })
      }
      return NextResponse.json({
        success: true,
        clarification: res.clarification,
        roundsUsed: res.roundsUsed,
        maxFeedbackRounds: res.maxFeedbackRounds,
      })
    }

    if (action === 'apply') {
      const res = await applyConfirmedCustomerBlueprintRevision({
        token,
        confirmedIntent: body.confirmedIntent,
        selectedRecommendationIds: body.selectedRecommendationIds,
        selectedFeedbackIds: body.selectedFeedbackIds,
        locale: body.locale,
        origin,
      })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: res.status })
      }
      return NextResponse.json({
        success: true,
        treatment: res.treatment,
        roundsUsed: res.roundsUsed,
        maxFeedbackRounds: res.maxFeedbackRounds,
        arIterationsUsed: res.arIterationsUsed,
        maxArIterations: res.maxArIterations,
        blueprintAudienceResonance: res.blueprintAudienceResonance,
      })
    }

    if (action === 'run_ar') {
      const res = await runStandaloneCustomerArIteration({
        token,
        locale: body.locale,
        origin,
      })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: res.error }, { status: res.status })
      }
      return NextResponse.json({
        success: true,
        arIterationsUsed: res.arIterationsUsed,
        maxArIterations: res.maxArIterations,
        blueprintAudienceResonance: res.blueprintAudienceResonance,
      })
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${String(action)}` },
      { status: 400 }
    )
  } catch (err: unknown) {
    console.error('[blueprint/share/auto-revise] Error:', err)
    const message = err instanceof Error ? err.message : 'Automated revision failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
