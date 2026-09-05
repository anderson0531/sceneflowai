import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { Op } from 'sequelize'
import { getProjectCreditsUsed, getProjectCreditsBudget } from '@/lib/credits/projectBudget'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * GET /api/series/[seriesId]/budget
 * Aggregates credits used/budget across episode production projects.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params
    await sequelize.authenticate()

    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }

    const projectIds =
      series.episode_blueprints?.filter((ep) => ep.projectId).map((ep) => ep.projectId!) || []

    let totalUsed = 0
    let totalBudget = 0
    const byProject: Array<{
      projectId: string
      episodeNumber: number
      title: string
      creditsUsed: number
      creditsBudget: number
    }> = []

    if (projectIds.length > 0) {
      const projects = await Project.findAll({
        where: { id: { [Op.in]: projectIds } },
        attributes: ['id', 'title', 'metadata'],
      })

      for (const ep of series.episode_blueprints || []) {
        if (!ep.projectId) continue
        const project = projects.find((p) => p.id === ep.projectId)
        if (!project) continue
        const meta = (project.metadata || {}) as Record<string, unknown>
        const used = getProjectCreditsUsed(meta)
        const budget = getProjectCreditsBudget(meta)
        totalUsed += used
        totalBudget += budget
        byProject.push({
          projectId: project.id,
          episodeNumber: ep.episodeNumber,
          title: ep.title || project.title,
          creditsUsed: used,
          creditsBudget: budget,
        })
      }
    }

    // Include analyze-resonance charges recorded on series metadata
    const resonanceCredits = Number(
      (series.metadata as Record<string, unknown> | undefined)?.resonance_credits_used ?? 0
    )
    totalUsed += resonanceCredits

    return NextResponse.json({
      success: true,
      totalCreditsUsed: totalUsed,
      totalCreditsBudget: totalBudget,
      resonanceCreditsUsed: resonanceCredits,
      episodeProjects: byProject.sort((a, b) => a.episodeNumber - b.episodeNumber),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Budget fetch failed' },
      { status: 500 }
    )
  }
}
