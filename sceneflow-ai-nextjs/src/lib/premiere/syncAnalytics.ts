import { getPremiereScreeningById } from './screeningLookup'
import { updatePremiereScreening } from './screenings'
import { generateAnalyticsSummary } from '@/services/BehavioralAnalyticsService'

export async function resolvePremiereVideoForAnalytics(screeningId: string): Promise<{
  videoUrl: string
  title: string
  projectId: string
} | null> {
  const record = await getPremiereScreeningById(screeningId)
  if (!record || record.status === 'expired') return null
  return {
    videoUrl: record.videoUrl,
    title: record.title,
    projectId: record.projectId,
  }
}

export async function syncPremiereScreeningFromAnalytics(screeningId: string): Promise<void> {
  if (!screeningId.startsWith('premiere-')) return
  const record = await getPremiereScreeningById(screeningId)
  if (!record) return

  try {
    const summary = await generateAnalyticsSummary(screeningId)
    const completion =
      summary.totalSessions > 0
        ? Math.round((summary.completedSessions / summary.totalSessions) * 100)
        : 0
    await updatePremiereScreening(record.projectId, screeningId, {
      viewerCount: summary.totalSessions,
      averageCompletion: completion,
      engagementScore: Math.round(summary.averageEngagementScore || 0),
    })
  } catch {
    /* analytics may not exist yet */
  }
}
