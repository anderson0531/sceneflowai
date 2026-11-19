import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  KANBAN_COLUMNS,
  buildClientDirectory,
  buildKanbanMovePatch,
  buildPmScorecard,
  collectPurgeableDraftMedia,
  estimateProjectStorage,
  evaluateProjectSla,
  formatStorageBytes,
  getTierStorageCapBytes,
  resolveKanbanStage,
  type AgencyProjectInput,
} from '@/lib/producer/agencyOps'

const NOW = new Date('2026-11-20T12:00:00.000Z')

describe('Kanban pipeline stage resolution & transitions', () => {
  it('classifies projects accurately across all 6 agency pipeline columns', () => {
    expect(KANBAN_COLUMNS).toHaveLength(6)

    expect(
      resolveKanbanStage({
        id: 'p1',
        title: 'Intake',
        status: 'draft',
        currentStep: 'ideation',
        metadata: { clientOrder: { isClientProject: true, stage: 'awaiting_intake' } },
      })
    ).toBe('intake')

    expect(
      resolveKanbanStage({
        id: 'p2',
        title: 'Blueprint',
        status: 'in_progress',
        currentStep: 'blueprint',
      })
    ).toBe('blueprint')

    expect(
      resolveKanbanStage({
        id: 'p3',
        title: 'Storyboard',
        status: 'in_progress',
        currentStep: 'storyboard',
      })
    ).toBe('storyboard')

    expect(
      resolveKanbanStage({
        id: 'p4',
        title: 'Production',
        status: 'in_progress',
        currentStep: 'vision',
      })
    ).toBe('production')

    expect(
      resolveKanbanStage({
        id: 'p5',
        title: 'Client Review',
        status: 'in_progress',
        currentStep: 'vision',
        metadata: { clientOrder: { isClientProject: true, actionState: 'waiting_on_client' } },
      })
    ).toBe('client_review')

    expect(
      resolveKanbanStage({
        id: 'p6',
        title: 'Delivered',
        status: 'completed',
        progress: 100,
      })
    ).toBe('delivered')
  })

  it('produces valid DB updates for Kanban column transitions', () => {
    const toReview = buildKanbanMovePatch('client_review', { existing: 1 }, NOW)
    expect(toReview.status).toBe('in_progress')
    expect(toReview.metadata.clientOrder.actionState).toBe('waiting_on_client')
    expect(toReview.metadata.existing).toBe(1)

    const toDelivered = buildKanbanMovePatch(
      'delivered',
      { clientOrder: { isClientProject: true } },
      NOW
    )
    expect(toDelivered.status).toBe('completed')
    expect(toDelivered.current_step).toBe('launch')
    expect(toDelivered.metadata.clientOrder.actionState).toBe('client_approved')
    expect(toDelivered.metadata.clientOrder.completedAt).toBe(NOW.toISOString())
  })
})

describe('SLA aging & due-date tracking', () => {
  it('flags overdue, due-soon, and >48h waiting-on-client projects accurately', () => {
    const overdue = evaluateProjectSla(
      {
        id: 'p1',
        title: 'Late Memoir',
        status: 'in_progress',
        currentStep: 'vision',
        metadata: {
          clientOrder: {
            isClientProject: true,
            targetDeliveryDate: '2026-11-18T12:00:00.000Z',
          },
        },
      },
      NOW
    )
    expect(overdue.slaLevel).toBe('overdue')
    expect(overdue.isOverdue).toBe(true)
    expect(overdue.badgeLabel).toBe('Overdue 2d')

    const dueSoon = evaluateProjectSla(
      {
        id: 'p2',
        title: 'Tomorrow Delivery',
        status: 'in_progress',
        currentStep: 'vision',
        metadata: {
          clientOrder: {
            isClientProject: true,
            targetDeliveryDate: '2026-11-21T12:00:00.000Z',
          },
        },
      },
      NOW
    )
    expect(dueSoon.slaLevel).toBe('due_soon')
    expect(dueSoon.isDueSoon).toBe(true)

    const stale = evaluateProjectSla(
      {
        id: 'p3',
        title: 'Client Ghosting',
        status: 'in_progress',
        currentStep: 'vision',
        updatedAt: '2026-11-17T00:00:00.000Z',
        metadata: {
          clientOrder: {
            isClientProject: true,
            actionState: 'waiting_on_client',
          },
        },
      },
      NOW
    )
    expect(stale.slaLevel).toBe('waiting_stale')
    expect(stale.isWaitingStale).toBe(true)
    expect(stale.staleHours).toBe(84)
    expect(stale.badgeLabel).toBe('Client Idle 84h')
  })
})

describe('Client CRM directory & PM workload/margin scorecard', () => {
  const sampleProjects: AgencyProjectInput[] = [
    {
      id: 'p1',
      title: 'Silva Family Ep 1',
      status: 'completed',
      currentStep: 'launch',
      progress: 100,
      seriesId: 'series-silva',
      createdAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-06T12:00:00.000Z',
      metadata: {
        creditsUsed: 5000,
        clientOrder: {
          isClientProject: true,
          customerName: 'Maria Silva',
          customerEmail: 'Maria@Example.com',
          locale: 'es',
          vertical: 'video_memoir',
          clientPriceUsd: 750,
          actionState: 'client_approved',
          completedAt: '2026-11-06T12:00:00.000Z',
          screeningRoomUrl: 'https://sceneflowai.studio/s/silva-ep1',
        },
      },
    },
    {
      id: 'p2',
      title: 'Silva Family Ep 2',
      status: 'in_progress',
      currentStep: 'vision',
      progress: 50,
      seriesId: 'series-silva',
      createdAt: '2026-11-10T12:00:00.000Z',
      updatedAt: '2026-11-19T12:00:00.000Z',
      metadata: {
        creditsUsed: 2500,
        clientOrder: {
          isClientProject: true,
          customerName: 'Maria Silva',
          customerEmail: 'maria@example.com',
          locale: 'es',
          vertical: 'video_memoir',
          clientPriceUsd: 750,
          actionState: 'action_required',
          targetDeliveryDate: '2026-11-19T00:00:00.000Z',
        },
      },
    },
    {
      id: 'p3',
      title: 'Unassigned Brand Story',
      status: 'in_progress',
      currentStep: 'blueprint',
      metadata: {
        creditsUsed: 400,
        clientOrder: {
          isClientProject: true,
          customerName: 'Acme Corp',
          customerEmail: 'ceo@acme.com',
          locale: 'en',
          vertical: 'brand_story',
          clientPriceUsd: 500,
        },
      },
    },
  ]

  it('groups repeat client orders by normalized email and calculates gross margin', () => {
    const clients = buildClientDirectory(sampleProjects, NOW)
    expect(clients).toHaveLength(2)

    const maria = clients.find((c) => c.email === 'maria@example.com')
    expect(maria).toBeDefined()
    expect(maria?.totalProjects).toBe(2)
    expect(maria?.completedProjects).toBe(1)
    expect(maria?.activeProjects).toBe(1)
    expect(maria?.overdueProjects).toBe(1)
    expect(maria?.totalRevenueUsd).toBe(1500)
    expect(maria?.totalCreditsUsed).toBe(7500)
    // 7500 * $0.01 = $75 cost -> $1425 gross margin -> 95%
    expect(maria?.estimatedCostUsd).toBe(75)
    expect(maria?.grossMarginUsd).toBe(1425)
    expect(maria?.grossMarginPct).toBe(95)
  })

  it('computes PM workload, series-inherited assignments, credit utilization, and avg turnaround days', () => {
    const scorecard = buildPmScorecard({
      members: [
        {
          id: 'm1',
          memberUserId: 'pm-lucia',
          memberEmail: 'lucia@agency.com',
          role: 'project_manager',
          status: 'active',
          accessAllProjects: false,
          monthlyCreditLimit: 10000,
          creditsUsedMonth: 6500,
        },
      ],
      projects: sampleProjects,
      projectAssignments: [],
      seriesAssignments: [{ seriesId: 'series-silva', memberUserId: 'pm-lucia' }],
      now: NOW,
    })

    expect(scorecard.unassignedActiveCount).toBe(1) // p3
    expect(scorecard.rows).toHaveLength(1)
    const lucia = scorecard.rows[0]
    expect(lucia.activeProjectCount).toBe(1)
    expect(lucia.completedProjectCount).toBe(1)
    expect(lucia.overdueProjectCount).toBe(1)
    expect(lucia.actionRequiredCount).toBe(1)
    expect(lucia.creditUtilizationPct).toBe(65)
    expect(lucia.assignedRevenueUsd).toBe(1500)
    expect(lucia.estimatedMarginPct).toBe(95)
    expect(lucia.avgTurnaroundDays).toBe(5)
  })
})

describe('Storage accounting & 1-click draft intermediate purge', () => {
  it('strips superseded candidate takes & old storyboard versions while preserving active masters & Blueprint JSON', () => {
    const metadata = {
      filmTreatmentVariant: { title: 'Keep My Blueprint Forever' },
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                imageUrl: 'https://example.public.blob.vercel-storage.com/final-frame.webp',
                imageVersions: [
                  { url: 'https://example.public.blob.vercel-storage.com/old-frame-1.webp' },
                  { url: 'https://example.public.blob.vercel-storage.com/final-frame.webp' },
                ],
              },
            ],
          },
        },
        production: {
          scenes: [
            {
              segments: [
                {
                  activeAssetUrl: 'https://example.public.blob.vercel-storage.com/master-take.mp4',
                  takes: [
                    { videoUrl: 'https://example.public.blob.vercel-storage.com/draft-take-1.mp4', isSelected: false },
                    { videoUrl: 'https://example.public.blob.vercel-storage.com/draft-take-2.mp4', isSelected: false },
                    { videoUrl: 'https://example.public.blob.vercel-storage.com/master-take.mp4', isSelected: true },
                  ],
                },
              ],
            },
          ],
        },
      },
    }

    const est = estimateProjectStorage(metadata, 5 * 1024 * 1024)
    expect(est.purgeableDraftCount).toBe(3) // 2 draft video takes + 1 old storyboard frame
    expect(est.totalBytes).toBeGreaterThan(50 * 1024 * 1024)

    const plan = collectPurgeableDraftMedia(metadata)
    expect(plan.removedTakeCount).toBe(3)
    expect(plan.removedBlobUrls).toContain(
      'https://example.public.blob.vercel-storage.com/draft-take-1.mp4'
    )
    expect(plan.removedBlobUrls).not.toContain(
      'https://example.public.blob.vercel-storage.com/master-take.mp4'
    )
    expect(plan.cleanedMetadata.filmTreatmentVariant.title).toBe('Keep My Blueprint Forever')
    expect(plan.cleanedMetadata.visionPhase.production.scenes[0].segments[0].takes).toHaveLength(1)
    expect(
      plan.cleanedMetadata.visionPhase.production.scenes[0].segments[0].takes[0].videoUrl
    ).toBe('https://example.public.blob.vercel-storage.com/master-take.mp4')
  })

  it('maps tier storage caps and formats byte strings cleanly', () => {
    expect(getTierStorageCapBytes('pro')).toBe(150 * 1024 * 1024 * 1024)
    expect(getTierStorageCapBytes('studio')).toBe(750 * 1024 * 1024 * 1024)
    expect(formatStorageBytes(150 * 1024 * 1024 * 1024)).toBe('150.00 GB')
    expect(formatStorageBytes(54 * 1024 * 1024)).toBe('54.0 MB')
  })
})

describe('Sprint 3 architecture contracts', () => {
  const root = process.cwd()

  it('wires Kanban view mode & Clients/Ops link into /dashboard/projects and /api/projects/bulk', () => {
    const pageSrc = readFileSync(path.join(root, 'src/app/dashboard/projects/page.tsx'), 'utf8')
    expect(pageSrc).toContain('ProjectsKanbanBoard')
    expect(pageSrc).toContain("viewMode === 'kanban'")
    expect(pageSrc).toContain('/dashboard/clients')
    expect(pageSrc).toContain('kanban_move')
    expect(pageSrc).toContain('set_sla')

    const bulkSrc = readFileSync(path.join(root, 'src/app/api/projects/bulk/route.ts'), 'utf8')
    expect(bulkSrc).toContain("action === 'kanban_move'")
    expect(bulkSrc).toContain("action === 'set_sla'")
  })

  it('enforces owner/admin RBAC on POST /api/projects/[id]/purge-drafts and serves /api/producer/ops', () => {
    const purgeSrc = readFileSync(
      path.join(root, 'src/app/api/projects/[id]/purge-drafts/route.ts'),
      'utf8'
    )
    expect(purgeSrc).toContain('canRoleDeleteProject')
    expect(purgeSrc).toContain('collectPurgeableDraftMedia')
    expect(purgeSrc).toContain('storagePurgedAt')

    const opsSrc = readFileSync(path.join(root, 'src/app/api/producer/ops/route.ts'), 'utf8')
    expect(opsSrc).toContain('buildClientDirectory')
    expect(opsSrc).toContain('buildPmScorecard')
    expect(opsSrc).toContain('estimateProjectStorage')
    expect(opsSrc).toContain('workspaceOwnerId')
  })
})
