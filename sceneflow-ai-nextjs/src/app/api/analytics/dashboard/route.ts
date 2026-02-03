/**
 * Dashboard Analytics API
 * 
 * GET /api/analytics/dashboard
 * 
 * Returns aggregated analytics for all screenings owned by the current user.
 * Optimized for the Screening Room dashboard to avoid N+1 API calls.
 * 
 * Query Parameters:
 * - projectId: string (optional) - Filter by specific project
 * 
 * Response:
 * {
 *   totalScreenings: number
 *   totalViewers: number
 *   averageCompletion: number
 *   averageWatchTime: number
 *   emotionBreakdown: { happy, surprised, engaged, neutral, confused, bored }
 *   screeningStats: { [screeningId]: { viewerCount, avgCompletion, avgWatchTime, emotionBreakdown } }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import {
  getSessionsForScreening,
  getMetricsForScreening,
} from '@/services/BehavioralAnalyticsService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScreeningAnalytics {
  screeningId: string
  projectId: string
  title: string
  screeningType: string
  viewerCount: number
  avgCompletion: number
  avgWatchTime: number
  emotionBreakdown: {
    happy: number
    surprised: number
    engaged: number
    neutral: number
    confused: number
    bored: number
  }
}

interface DashboardAnalytics {
  totalScreenings: number
  totalViewers: number
  averageCompletion: number
  averageWatchTime: number
  emotionBreakdown: {
    happy: number
    surprised: number
    engaged: number
    neutral: number
    confused: number
    bored: number
  }
  screeningStats: Record<string, ScreeningAnalytics>
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()

    // Resolve user ID
    let userId: string
    try {
      const resolvedUser = await resolveUser(session.user.id)
      userId = resolvedUser.id
    } catch (err) {
      console.error('[GET /api/analytics/dashboard] Failed to resolve user:', err)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get optional project filter
    const { searchParams } = new URL(request.url)
    const projectIdFilter = searchParams.get('projectId')

    // Fetch all projects for this user
    const whereClause: any = { user_id: userId }
    if (projectIdFilter) {
      whereClause.id = projectIdFilter
    }

    const projects: any[] = await Project.findAll({ where: whereClause })

    // Collect all screenings from project metadata
    const allScreenings: Array<{
      screening: any
      projectId: string
      projectTitle: string
    }> = []

    for (const project of projects) {
      const metadata = (project.metadata as Record<string, any>) || {}
      const screenings = metadata.screenings || []
      
      for (const screening of screenings) {
        // Only include active/non-expired screenings
        if (screening.status !== 'archived' && new Date(screening.expiresAt) > new Date()) {
          allScreenings.push({
            screening,
            projectId: project.id,
            projectTitle: project.title,
          })
        }
      }
    }

    // Initialize aggregated stats
    const aggregated: DashboardAnalytics = {
      totalScreenings: allScreenings.length,
      totalViewers: 0,
      averageCompletion: 0,
      averageWatchTime: 0,
      emotionBreakdown: {
        happy: 0,
        surprised: 0,
        engaged: 0,
        neutral: 0,
        confused: 0,
        bored: 0,
      },
      screeningStats: {},
    }

    // Fetch analytics for each screening
    let totalCompletionSum = 0
    let totalWatchTimeSum = 0
    let screeningsWithViewers = 0

    for (const { screening, projectId, projectTitle } of allScreenings) {
      try {
        // Get sessions from Vercel Blob storage
        const sessions = await getSessionsForScreening(screening.id)
        const metrics = await getMetricsForScreening(screening.id)

        const viewerCount = sessions.length
        const avgCompletion = viewerCount > 0
          ? sessions.reduce((sum, s) => sum + (s.completionRate || 0), 0) / viewerCount
          : 0
        const avgWatchTime = viewerCount > 0
          ? sessions.reduce((sum, s) => sum + (s.durationWatched || 0), 0) / viewerCount
          : 0

        // Calculate emotion breakdown from biometric metrics
        const emotionCounts = {
          happy: 0,
          surprised: 0,
          engaged: 0,
          neutral: 0,
          confused: 0,
          bored: 0,
        }

        for (const metric of metrics) {
          if (metric.type === 'biometric' && metric.biometric?.emotion) {
            const emotion = metric.biometric.emotion.toLowerCase()
            if (emotion in emotionCounts) {
              emotionCounts[emotion as keyof typeof emotionCounts]++
            }
          }
          // Count engagement from gaze tracking
          if (metric.type === 'biometric' && metric.biometric?.gazeOnScreen) {
            emotionCounts.engaged++
          }
        }

        // Also count manual reactions (emoji clicks)
        for (const metric of metrics) {
          if (metric.type === 'manual_reaction' && metric.reaction?.emoji) {
            // Map emoji to emotion
            const emoji = metric.reaction.emoji
            if (['😊', '😄', '❤️', '🎉'].includes(emoji)) emotionCounts.happy++
            else if (['😲', '🤯', '😱'].includes(emoji)) emotionCounts.surprised++
            else if (['🤔', '😕'].includes(emoji)) emotionCounts.confused++
            else if (['😴', '🥱'].includes(emoji)) emotionCounts.bored++
            else if (['👀', '🔥', '👏'].includes(emoji)) emotionCounts.engaged++
            else emotionCounts.neutral++
          }
        }

        // Store screening-level stats
        aggregated.screeningStats[screening.id] = {
          screeningId: screening.id,
          projectId,
          title: screening.title || projectTitle,
          screeningType: screening.screeningType || 'storyboard',
          viewerCount,
          avgCompletion: Math.round(avgCompletion * 100) / 100,
          avgWatchTime: Math.round(avgWatchTime),
          emotionBreakdown: emotionCounts,
        }

        // Add to aggregates
        aggregated.totalViewers += viewerCount
        if (viewerCount > 0) {
          totalCompletionSum += avgCompletion
          totalWatchTimeSum += avgWatchTime
          screeningsWithViewers++
        }

        // Add to emotion aggregates
        for (const key of Object.keys(emotionCounts) as Array<keyof typeof emotionCounts>) {
          aggregated.emotionBreakdown[key] += emotionCounts[key]
        }

      } catch (err) {
        console.error(`[Analytics] Failed to get stats for screening ${screening.id}:`, err)
        // Continue with other screenings
      }
    }

    // Calculate averages
    if (screeningsWithViewers > 0) {
      aggregated.averageCompletion = Math.round((totalCompletionSum / screeningsWithViewers) * 100) / 100
      aggregated.averageWatchTime = Math.round(totalWatchTimeSum / screeningsWithViewers)
    }

    console.log(
      `[Analytics Dashboard] User ${userId}: ${aggregated.totalScreenings} screenings, ` +
      `${aggregated.totalViewers} viewers, ${aggregated.averageCompletion}% avg completion`
    )

    return NextResponse.json(aggregated)

  } catch (error: any) {
    console.error('[GET /api/analytics/dashboard] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard analytics' },
      { status: 500 }
    )
  }
}
