import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateAnalyticsSummary } from '@/services/BehavioralAnalyticsService'
import { listPremiereScreenings } from '@/lib/premiere/screenings'
import { getPremiereScreeningById } from '@/lib/premiere/screeningLookup'
import { listPremiereFeedback, summarizePremiereFeedback } from '@/lib/premiere/feedback'
import { syncPremiereScreeningFromAnalytics } from '@/lib/premiere/syncAnalytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const projectId = (request.nextUrl.searchParams.get('projectId') || '').trim()
    const screeningId = (request.nextUrl.searchParams.get('screeningId') || '').trim()

    if (screeningId) {
      await syncPremiereScreeningFromAnalytics(screeningId)
      const record = await getPremiereScreeningById(screeningId)
      const summary = await generateAnalyticsSummary(screeningId)
      const feedback = record
        ? await listPremiereFeedback(record.projectId, { screeningId })
        : []
      return NextResponse.json({
        success: true,
        screeningId,
        summary,
        feedback: summarizePremiereFeedback(feedback),
        screening: record,
      })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId or screeningId required' }, { status: 400 })
    }

    const screenings = await listPremiereScreenings(projectId)
    const feedbackItems = await listPremiereFeedback(projectId)
    let totalSessions = 0
    let completedSessions = 0
    let totalEngagement = 0
    let summaryCount = 0
    const emotionTotals: Record<string, number> = {}

    for (const s of screenings) {
      if (!s.id.startsWith('premiere-')) continue
      try {
        await syncPremiereScreeningFromAnalytics(s.id)
        const summary = await generateAnalyticsSummary(s.id)
        totalSessions += summary.totalSessions
        completedSessions += summary.completedSessions
        totalEngagement += summary.averageEngagementScore || 0
        summaryCount++
        for (const [emotion, pct] of Object.entries(summary.emotionBreakdown || {})) {
          emotionTotals[emotion] = (emotionTotals[emotion] || 0) + pct
        }
      } catch {
        /* no analytics yet */
      }
    }

    const feedbackSummary = summarizePremiereFeedback(feedbackItems)
    const avgCompletion =
      totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
    const avgEngagement = summaryCount > 0 ? Math.round(totalEngagement / summaryCount) : 0

    const emotionBreakdown =
      summaryCount > 0
        ? Object.fromEntries(
            Object.entries(emotionTotals).map(([k, v]) => [k, Math.round(v / summaryCount)])
          )
        : {}

    return NextResponse.json({
      success: true,
      projectId,
      totalScreenings: screenings.length,
      totalViewers: totalSessions,
      averageCompletion: avgCompletion,
      averageEngagement: avgEngagement,
      emotionBreakdown,
      feedback: feedbackSummary,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
