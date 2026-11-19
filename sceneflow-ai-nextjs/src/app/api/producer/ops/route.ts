import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import '@/models'
import { sequelize } from '@/config/database'
import Project from '@/models/Project'
import WorkspaceMember from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import SeriesAssignment from '@/models/SeriesAssignment'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { buildAccessibleProjectsScope } from '@/lib/producer/workspaceProjectsQuery'
import { resolveProducerWhiteLabelEligibility } from '@/lib/producer/producerProfileService'
import {
  buildClientDirectory,
  buildPmScorecard,
  estimateProjectStorage,
  evaluateProjectSla,
  getTierStorageCapBytes,
  resolveKanbanStage,
  type AgencyProjectInput,
} from '@/lib/producer/agencyOps'
import { getProjectCreditsUsed } from '@/lib/credits/projectBudgetShared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Compact JSON projection for Agency Ops rollup: extracts clientOrder, credits,
 * storage accounting, and lightweight take counts without pulling multi-MB scripts/prompts.
 */
const OPS_METADATA_SQL = `jsonb_strip_nulls(jsonb_build_object(
  'clientOrder', metadata->'clientOrder',
  'storyLocale', metadata->'storyLocale',
  'creditsUsed', metadata->'creditsUsed',
  'creditsBudget', metadata->'creditsBudget',
  'creationHub', CASE WHEN metadata->'creationHub'->'metrics' IS NOT NULL
    THEN jsonb_build_object('metrics', metadata->'creationHub'->'metrics') ELSE NULL END,
  'productionCosts', metadata->'productionCosts',
  'screeningRoomShareUrl', metadata->'screeningRoomShareUrl',
  'storageBytes', metadata->'storageBytes',
  'storagePurgedAt', metadata->'storagePurgedAt',
  'visionPhase', CASE WHEN metadata->'visionPhase'->'production' IS NOT NULL
    THEN jsonb_build_object('production', metadata->'visionPhase'->'production')
    ELSE NULL END
))`

export async function GET(req: NextRequest) {
  try {
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await ensureProducerPlatformSchema()

    const workspaceOwnerId = req.nextUrl.searchParams.get('workspaceOwnerId') || undefined
    const scope = await buildAccessibleProjectsScope(actorUserId, {
      activeWorkspaceOwnerId: workspaceOwnerId,
    })

    const ownerIdsList = Array.from(scope.accessibleOwnerIds)
    const primaryOwnerForBilling =
      workspaceOwnerId && workspaceOwnerId !== 'all' && workspaceOwnerId !== 'personal'
        ? workspaceOwnerId
        : actorUserId

    const [projectRows, members, projectAssignments, seriesAssignments, uploadAggs, eligibility] =
      await Promise.all([
        Project.findAll({
          where: scope.where,
          attributes: [
            'id',
            'user_id',
            'series_id',
            'title',
            'status',
            'current_step',
            'step_progress',
            'created_at',
            'updated_at',
            [sequelize.literal(OPS_METADATA_SQL), 'metadata'],
          ],
          order: [['updated_at', 'DESC']],
          limit: 1000,
        }),
        ownerIdsList.length > 0
          ? WorkspaceMember.findAll({
              where: {
                owner_user_id: { [Op.in]: ownerIdsList },
                status: { [Op.ne]: 'revoked' },
              },
              order: [['created_at', 'ASC']],
            })
          : Promise.resolve([]),
        ownerIdsList.length > 0
          ? ProjectAssignment.findAll({
              where: { owner_user_id: { [Op.in]: ownerIdsList } },
              attributes: ['project_id', 'member_user_id'],
            })
          : Promise.resolve([]),
        ownerIdsList.length > 0
          ? SeriesAssignment.findAll({
              where: { owner_user_id: { [Op.in]: ownerIdsList } },
              attributes: ['series_id', 'member_user_id'],
            })
          : Promise.resolve([]),
        ownerIdsList.length > 0
          ? ClientAssetSubmission.findAll({
              where: { owner_user_id: { [Op.in]: ownerIdsList } },
              attributes: [
                'project_id',
                [sequelize.fn('SUM', sequelize.col('file_size_bytes')), 'totalBytes'],
              ],
              group: ['project_id'],
              raw: true,
            }).catch(() => [])
          : Promise.resolve([]),
        resolveProducerWhiteLabelEligibility(primaryOwnerForBilling),
      ])

    const uploadBytesByProject = new Map<string, number>()
    for (const row of uploadAggs as Array<{ project_id?: string; totalBytes?: string | number }>) {
      if (row.project_id) {
        uploadBytesByProject.set(row.project_id, Number(row.totalBytes || 0))
      }
    }

    const now = new Date()
    const agencyProjects: AgencyProjectInput[] = projectRows.map((p: any) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      currentStep: p.current_step,
      progress: p.step_progress?.overall ?? 0,
      seriesId: p.series_id || null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      metadata: p.metadata || {},
      clientUploadsBytes: uploadBytesByProject.get(p.id) || 0,
    }))

    const clients = buildClientDirectory(agencyProjects, now)

    const scorecard = buildPmScorecard({
      members: members.map((m) => ({
        id: m.id,
        memberUserId: m.member_user_id,
        memberEmail: m.member_email,
        role: m.role,
        status: m.status,
        accessAllProjects: m.access_all_projects,
        monthlyCreditLimit: m.monthly_credit_limit,
        creditsUsedMonth: m.credits_used_month,
      })),
      projects: agencyProjects,
      projectAssignments: projectAssignments.map((a) => ({
        projectId: a.project_id,
        memberUserId: a.member_user_id,
      })),
      seriesAssignments: seriesAssignments.map((a) => ({
        seriesId: a.series_id,
        memberUserId: a.member_user_id,
      })),
      now,
    })

    // SLA rollup & Storage rollup
    let overdueCount = 0
    let dueSoonCount = 0
    let waitingStaleCount = 0
    let deliveredCount = 0
    let totalRevenueUsd = 0
    let totalCreditsUsed = 0
    let totalStorageBytes = 0
    let totalReclaimableBytes = 0

    const storageProjects: Array<{
      id: string
      title: string
      status: string
      stage: string
      storageBytes: number
      purgeableDraftCount: number
      estimatedReclaimableBytes: number
      clientUploadsBytes: number
      storagePurgedAt: string | null
      updatedAt: string | null
    }> = []

    for (const p of agencyProjects) {
      const sla = evaluateProjectSla(p, now)
      const stage = resolveKanbanStage(p)
      if (sla.isOverdue) overdueCount += 1
      else if (sla.isDueSoon) dueSoonCount += 1
      if (sla.isWaitingStale) waitingStaleCount += 1
      if (stage === 'delivered') deliveredCount += 1

      const order = (p.metadata?.clientOrder || {}) as Record<string, any>
      totalRevenueUsd += Math.max(0, Number(order.clientPriceUsd ?? 0) || 0)
      totalCreditsUsed += Math.max(0, getProjectCreditsUsed(p.metadata))

      const est = estimateProjectStorage(p.metadata, p.clientUploadsBytes || 0)
      totalStorageBytes += est.totalBytes
      totalReclaimableBytes += est.estimatedReclaimableBytes

      storageProjects.push({
        id: p.id,
        title: p.title,
        status: p.status,
        stage,
        storageBytes: est.totalBytes,
        purgeableDraftCount: est.purgeableDraftCount,
        estimatedReclaimableBytes: est.estimatedReclaimableBytes,
        clientUploadsBytes: p.clientUploadsBytes || 0,
        storagePurgedAt: est.storagePurgedAt,
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
      })
    }

    storageProjects.sort((a, b) => b.storageBytes - a.storageBytes)

    const tierStorageCapBytes = getTierStorageCapBytes(eligibility.tierName)
    const storageUtilizationPct =
      tierStorageCapBytes > 0
        ? Math.min(100, Math.round((totalStorageBytes / tierStorageCapBytes) * 100))
        : 0

    return NextResponse.json({
      success: true,
      tierName: eligibility.tierName,
      totalProjects: agencyProjects.length,
      slaSummary: {
        overdueCount,
        dueSoonCount,
        waitingStaleCount,
        deliveredCount,
        totalRevenueUsd,
        totalCreditsUsed,
      },
      clients,
      pmScorecard: scorecard.rows,
      unassignedActiveCount: scorecard.unassignedActiveCount,
      storageSummary: {
        totalStorageBytes,
        tierStorageCapBytes,
        storageUtilizationPct,
        totalReclaimableBytes,
        projects: storageProjects.slice(0, 100),
      },
    })
  } catch (err: unknown) {
    console.error('[GET /api/producer/ops] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to load Agency Ops telemetry'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
