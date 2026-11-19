import { normalizeWorkflowStep } from '@/constants/workflowSteps'
import { getProjectCreditsUsed } from '@/lib/credits/projectBudgetShared'
import { TIER_CATALOG, normalizeTierName } from '@/lib/billing/tierCatalog'

/**
 * Operator bulk credit cost baseline ($0.010/credit from Operator Pro / Agency Scale $250 pack).
 * Used to estimate gross margin on white-label client orders.
 */
export const OPERATOR_CREDIT_COST_USD = 0.01

/** Stale threshold when waiting on client feedback before flagging SLA nudge (48 hours). */
export const CLIENT_WAITING_STALE_HOURS = 48

/** Due-soon threshold before target delivery date (48 hours). */
export const SLA_DUE_SOON_HOURS = 48

export type KanbanStageId =
  | 'intake'
  | 'blueprint'
  | 'storyboard'
  | 'production'
  | 'client_review'
  | 'delivered'

export interface KanbanColumnDef {
  id: KanbanStageId
  label: string
  shortLabel: string
  description: string
  accentClass: string
}

export const KANBAN_COLUMNS: readonly KanbanColumnDef[] = [
  {
    id: 'intake',
    label: 'Client Intake',
    shortLabel: 'Intake',
    description: 'Awaiting client interview or asset upload',
    accentClass: 'border-sky-500/40 bg-sky-950/20 text-sky-300',
  },
  {
    id: 'blueprint',
    label: 'Blueprint Room',
    shortLabel: 'Blueprint',
    description: 'Treatment, script & audience resonance pass',
    accentClass: 'border-blue-500/40 bg-blue-950/20 text-blue-300',
  },
  {
    id: 'storyboard',
    label: 'Storyboard & Cast',
    shortLabel: 'Storyboard',
    description: 'Continuity locks, casting & visual frames',
    accentClass: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-300',
  },
  {
    id: 'production',
    label: 'Production & Render',
    shortLabel: 'Production',
    description: 'Video generation, voiceover, music & assembly',
    accentClass: 'border-purple-500/40 bg-purple-950/20 text-purple-300',
  },
  {
    id: 'client_review',
    label: 'Client Review',
    shortLabel: 'Review',
    description: 'In Screening Room or awaiting revision pass',
    accentClass: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
  },
  {
    id: 'delivered',
    label: 'Delivered & Approved',
    shortLabel: 'Delivered',
    description: 'Client approved or final master completed',
    accentClass: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
  },
] as const

export interface AgencyProjectInput {
  id: string
  title: string
  status: string
  currentStep?: string | null
  progress?: number | null
  seriesId?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  metadata?: Record<string, any> | null
  assignedMembers?: Array<{ memberUserId: string; memberEmail: string; role: string }>
  clientUploadsBytes?: number
}

export interface ProjectSlaEvaluation {
  slaLevel: 'overdue' | 'due_soon' | 'waiting_stale' | 'on_track' | 'delivered'
  isOverdue: boolean
  isDueSoon: boolean
  isWaitingStale: boolean
  daysUntilDue: number | null
  staleHours: number | null
  targetDeliveryDate: string | null
  revisionCount: number
  maxFeedbackRounds: number | null
  badgeLabel: string
}

/**
 * Classifies any project into one of the 6 agency Kanban pipeline columns.
 */
export function resolveKanbanStage(project: AgencyProjectInput): KanbanStageId {
  const meta = (project.metadata || {}) as Record<string, any>
  const order = (meta.clientOrder || {}) as Record<string, any>
  const status = String(project.status || '').toLowerCase()
  const progress = Number(project.progress ?? 0)
  const rawStep = String(project.currentStep || '').toLowerCase()
  const orderStage = String(order.stage || '').toLowerCase()
  const actionState = String(order.actionState || '').toLowerCase()

  // Explicit override if PM moved card via Kanban
  if (
    orderStage === 'intake' ||
    orderStage === 'blueprint' ||
    orderStage === 'storyboard' ||
    orderStage === 'production' ||
    orderStage === 'client_review' ||
    orderStage === 'delivered'
  ) {
    if (status === 'completed' || actionState === 'client_approved') {
      return 'delivered'
    }
    return orderStage
  }

  if (
    status === 'completed' ||
    progress >= 100 ||
    actionState === 'client_approved' ||
    orderStage === 'completed'
  ) {
    return 'delivered'
  }

  if (orderStage === 'awaiting_intake' || orderStage === 'intake_in_progress') {
    return 'intake'
  }

  if (
    order.isClientProject &&
    (actionState === 'waiting_on_client' ||
      actionState === 'action_required' ||
      orderStage === 'review' ||
      orderStage === 'screening_review')
  ) {
    return 'client_review'
  }

  if (rawStep === 'storyboard') {
    return 'storyboard'
  }

  const normalized = normalizeWorkflowStep(project.currentStep || 'blueprint')
  if (normalized === 'blueprint') {
    return 'blueprint'
  }

  return 'production'
}

/**
 * Maps a Kanban column drop/move to canonical DB updates on `Project`.
 */
export function buildKanbanMovePatch(
  targetStage: KanbanStageId,
  existingMetadata: Record<string, any> | null | undefined,
  now = new Date()
): {
  status: 'draft' | 'in_progress' | 'completed'
  current_step: string
  metadata: Record<string, any>
} {
  const meta = { ...(existingMetadata || {}) }
  const prevOrder =
    meta.clientOrder && typeof meta.clientOrder === 'object' ? { ...meta.clientOrder } : {}

  const baseOrder: Record<string, any> = {
    ...prevOrder,
    stage: targetStage,
    stageUpdatedAt: now.toISOString(),
  }

  switch (targetStage) {
    case 'intake':
      return {
        status: 'draft',
        current_step: 'ideation',
        metadata: {
          ...meta,
          clientOrder: {
            ...baseOrder,
            stage: 'awaiting_intake',
            actionState: 'waiting_on_client',
          },
        },
      }
    case 'blueprint':
      return {
        status: 'in_progress',
        current_step: 'blueprint',
        metadata: {
          ...meta,
          clientOrder: {
            ...baseOrder,
            actionState: prevOrder.isClientProject ? 'action_required' : prevOrder.actionState,
          },
        },
      }
    case 'storyboard':
      return {
        status: 'in_progress',
        current_step: 'storyboard',
        metadata: {
          ...meta,
          clientOrder: {
            ...baseOrder,
            actionState: prevOrder.isClientProject ? 'action_required' : prevOrder.actionState,
          },
        },
      }
    case 'production':
      return {
        status: 'in_progress',
        current_step: 'vision',
        metadata: {
          ...meta,
          clientOrder: {
            ...baseOrder,
            actionState: prevOrder.isClientProject ? 'action_required' : prevOrder.actionState,
          },
        },
      }
    case 'client_review':
      return {
        status: 'in_progress',
        current_step: 'vision',
        metadata: {
          ...meta,
          clientOrder: {
            ...baseOrder,
            isClientProject: true,
            actionState: 'waiting_on_client',
          },
        },
      }
    case 'delivered':
    default:
      return {
        status: 'completed',
        current_step: 'launch',
        metadata: {
          ...meta,
          clientOrder: {
            ...baseOrder,
            actionState: prevOrder.isClientProject ? 'client_approved' : prevOrder.actionState,
            completedAt: prevOrder.completedAt || now.toISOString(),
          },
        },
      }
  }
}

/**
 * Evaluates SLA status, due-date proximity, and >48h client waiting staleness.
 */
export function evaluateProjectSla(
  project: AgencyProjectInput,
  now = new Date()
): ProjectSlaEvaluation {
  const meta = (project.metadata || {}) as Record<string, any>
  const order = (meta.clientOrder || {}) as Record<string, any>
  const stage = resolveKanbanStage(project)
  const targetDeliveryDate =
    typeof order.targetDeliveryDate === 'string' && order.targetDeliveryDate.trim()
      ? order.targetDeliveryDate.trim()
      : null
  const revisionCount = Math.max(0, Number(order.revisionCount ?? 0) || 0)
  const maxFeedbackRounds =
    typeof order.maxFeedbackRounds === 'number' && Number.isFinite(order.maxFeedbackRounds)
      ? order.maxFeedbackRounds
      : null

  if (stage === 'delivered' || String(project.status || '').toLowerCase() === 'archived') {
    return {
      slaLevel: 'delivered',
      isOverdue: false,
      isDueSoon: false,
      isWaitingStale: false,
      daysUntilDue: null,
      staleHours: null,
      targetDeliveryDate,
      revisionCount,
      maxFeedbackRounds,
      badgeLabel: 'Delivered',
    }
  }

  let isOverdue = false
  let isDueSoon = false
  let daysUntilDue: number | null = null

  if (targetDeliveryDate) {
    const dueMs = Date.parse(targetDeliveryDate)
    if (Number.isFinite(dueMs)) {
      const diffHours = (dueMs - now.getTime()) / (60 * 60 * 1000)
      daysUntilDue = diffHours < 0 ? Math.floor(diffHours / 24) : Math.ceil(diffHours / 24)
      if (diffHours < 0) {
        isOverdue = true
      } else if (diffHours <= SLA_DUE_SOON_HOURS) {
        isDueSoon = true
      }
    }
  }

  const actionState = String(order.actionState || '').toLowerCase()
  let staleHours: number | null = null
  let isWaitingStale = false
  if (actionState === 'waiting_on_client') {
    const refTs =
      order.lastClientActivityAt || order.stageUpdatedAt || project.updatedAt || project.createdAt
    const refMs = refTs ? Date.parse(String(refTs)) : NaN
    if (Number.isFinite(refMs)) {
      staleHours = Math.max(0, Math.floor((now.getTime() - refMs) / (60 * 60 * 1000)))
      if (staleHours >= CLIENT_WAITING_STALE_HOURS) {
        isWaitingStale = true
      }
    }
  }

  if (isOverdue) {
    const overdueDays = Math.max(1, Math.abs(daysUntilDue ?? 1))
    return {
      slaLevel: 'overdue',
      isOverdue: true,
      isDueSoon: false,
      isWaitingStale,
      daysUntilDue,
      staleHours,
      targetDeliveryDate,
      revisionCount,
      maxFeedbackRounds,
      badgeLabel: `Overdue ${overdueDays}d`,
    }
  }

  if (isDueSoon) {
    return {
      slaLevel: 'due_soon',
      isOverdue: false,
      isDueSoon: true,
      isWaitingStale,
      daysUntilDue,
      staleHours,
      targetDeliveryDate,
      revisionCount,
      maxFeedbackRounds,
      badgeLabel: daysUntilDue === 0 ? 'Due Today' : `Due in ${daysUntilDue}d`,
    }
  }

  if (isWaitingStale && staleHours !== null) {
    return {
      slaLevel: 'waiting_stale',
      isOverdue: false,
      isDueSoon: false,
      isWaitingStale: true,
      daysUntilDue,
      staleHours,
      targetDeliveryDate,
      revisionCount,
      maxFeedbackRounds,
      badgeLabel: `Client Idle ${staleHours}h`,
    }
  }

  return {
    slaLevel: 'on_track',
    isOverdue: false,
    isDueSoon: false,
    isWaitingStale: false,
    daysUntilDue,
    staleHours,
    targetDeliveryDate,
    revisionCount,
    maxFeedbackRounds,
    badgeLabel: daysUntilDue !== null ? `Due in ${daysUntilDue}d` : 'On Track',
  }
}

export interface ClientCrmRecord {
  clientKey: string
  displayName: string
  email: string | null
  primaryLocale: string
  verticals: string[]
  totalProjects: number
  activeProjects: number
  completedProjects: number
  archivedProjects: number
  overdueProjects: number
  totalRevenueUsd: number
  totalCreditsUsed: number
  estimatedCostUsd: number
  grossMarginUsd: number
  grossMarginPct: number | null
  lastActivityAt: string | null
  projects: Array<{
    id: string
    title: string
    stage: KanbanStageId
    status: string
    slaLevel: ProjectSlaEvaluation['slaLevel']
    slaBadgeLabel: string
    targetDeliveryDate: string | null
    clientPriceUsd: number
    creditsUsed: number
    screeningRoomUrl: string | null
    blueprintShareUrl: string | null
    updatedAt: string | null
  }>
}

/**
 * Groups client orders across unlimited workspace projects into a Client CRM Directory.
 */
export function buildClientDirectory(
  projects: AgencyProjectInput[],
  now = new Date()
): ClientCrmRecord[] {
  const byClient = new Map<string, ClientCrmRecord>()

  for (const proj of projects) {
    const meta = (proj.metadata || {}) as Record<string, any>
    const order = (meta.clientOrder || {}) as Record<string, any>
    const emailRaw = typeof order.customerEmail === 'string' ? order.customerEmail.trim().toLowerCase() : ''
    const nameRaw =
      (typeof order.customerName === 'string' && order.customerName.trim()) ||
      (typeof order.customerLabel === 'string' && order.customerLabel.trim()) ||
      ''

    if (!order.isClientProject && !emailRaw && !nameRaw) {
      continue
    }

    const clientKey = emailRaw || `name:${(nameRaw || proj.title).toLowerCase()}`
    const displayName = nameRaw || emailRaw || proj.title
    const locale = String(order.locale || meta.storyLocale || 'en').trim() || 'en'
    const vertical = typeof order.vertical === 'string' && order.vertical.trim() ? order.vertical.trim() : null
    const priceUsd = Math.max(0, Number(order.clientPriceUsd ?? 0) || 0)
    const creditsUsed = Math.max(0, getProjectCreditsUsed(meta))
    const stage = resolveKanbanStage(proj)
    const sla = evaluateProjectSla(proj, now)
    const isArchived = String(proj.status || '').toLowerCase() === 'archived'
    const updatedIso = proj.updatedAt ? new Date(proj.updatedAt).toISOString() : null

    let record = byClient.get(clientKey)
    if (!record) {
      record = {
        clientKey,
        displayName,
        email: emailRaw || null,
        primaryLocale: locale,
        verticals: [],
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        archivedProjects: 0,
        overdueProjects: 0,
        totalRevenueUsd: 0,
        totalCreditsUsed: 0,
        estimatedCostUsd: 0,
        grossMarginUsd: 0,
        grossMarginPct: null,
        lastActivityAt: updatedIso,
        projects: [],
      }
      byClient.set(clientKey, record)
    }

    if (vertical && !record.verticals.includes(vertical)) {
      record.verticals.push(vertical)
    }
    record.totalProjects += 1
    if (isArchived) record.archivedProjects += 1
    else if (stage === 'delivered') record.completedProjects += 1
    else record.activeProjects += 1

    if (sla.isOverdue) record.overdueProjects += 1

    record.totalRevenueUsd += priceUsd
    record.totalCreditsUsed += creditsUsed

    if (updatedIso && (!record.lastActivityAt || updatedIso > record.lastActivityAt)) {
      record.lastActivityAt = updatedIso
    }

    record.projects.push({
      id: proj.id,
      title: proj.title,
      stage,
      status: proj.status,
      slaLevel: sla.slaLevel,
      slaBadgeLabel: sla.badgeLabel,
      targetDeliveryDate: sla.targetDeliveryDate,
      clientPriceUsd: priceUsd,
      creditsUsed,
      screeningRoomUrl:
        typeof order.screeningRoomUrl === 'string'
          ? order.screeningRoomUrl
          : typeof meta.screeningRoomShareUrl === 'string'
            ? meta.screeningRoomShareUrl
            : null,
      blueprintShareUrl:
        typeof order.blueprintShareUrl === 'string' ? order.blueprintShareUrl : null,
      updatedAt: updatedIso,
    })
  }

  const list = Array.from(byClient.values()).map((rec) => {
    const estimatedCostUsd = Number((rec.totalCreditsUsed * OPERATOR_CREDIT_COST_USD).toFixed(2))
    const grossMarginUsd = Number((rec.totalRevenueUsd - estimatedCostUsd).toFixed(2))
    const grossMarginPct =
      rec.totalRevenueUsd > 0
        ? Math.round(((rec.totalRevenueUsd - estimatedCostUsd) / rec.totalRevenueUsd) * 100)
        : null
    return {
      ...rec,
      estimatedCostUsd,
      grossMarginUsd,
      grossMarginPct,
    }
  })

  return list.sort((a, b) => {
    if (b.overdueProjects !== a.overdueProjects) return b.overdueProjects - a.overdueProjects
    if (b.totalRevenueUsd !== a.totalRevenueUsd) return b.totalRevenueUsd - a.totalRevenueUsd
    return (b.lastActivityAt || '').localeCompare(a.lastActivityAt || '')
  })
}

export interface PmScorecardRow {
  memberId: string
  memberUserId: string | null
  memberEmail: string
  role: string
  status: string
  accessAllProjects: boolean
  activeProjectCount: number
  completedProjectCount: number
  overdueProjectCount: number
  actionRequiredCount: number
  creditsUsedMonth: number
  monthlyCreditLimit: number | null
  creditUtilizationPct: number | null
  assignedRevenueUsd: number
  assignedCreditsUsed: number
  estimatedMarginPct: number | null
  avgTurnaroundDays: number | null
}

/**
 * Computes per-PM workload, overdue alerts, credit burn utilization, margin, and turnaround days.
 */
export function buildPmScorecard(input: {
  members: Array<{
    id: string
    memberUserId: string | null
    memberEmail: string
    role: string
    status: string
    accessAllProjects: boolean
    monthlyCreditLimit: number | null
    creditsUsedMonth: number
  }>
  projects: AgencyProjectInput[]
  projectAssignments: Array<{ projectId: string; memberUserId: string }>
  seriesAssignments: Array<{ seriesId: string; memberUserId: string }>
  now?: Date
}): { rows: PmScorecardRow[]; unassignedActiveCount: number } {
  const now = input.now || new Date()
  const assignedMembersByProject = new Map<string, Set<string>>()

  for (const pa of input.projectAssignments) {
    const set = assignedMembersByProject.get(pa.projectId) || new Set<string>()
    set.add(pa.memberUserId)
    assignedMembersByProject.set(pa.projectId, set)
  }

  const seriesMembersMap = new Map<string, Set<string>>()
  for (const sa of input.seriesAssignments) {
    const set = seriesMembersMap.get(sa.seriesId) || new Set<string>()
    set.add(sa.memberUserId)
    seriesMembersMap.set(sa.seriesId, set)
  }

  for (const p of input.projects) {
    if (p.seriesId) {
      const seriesPms = seriesMembersMap.get(p.seriesId)
      if (seriesPms) {
        const set = assignedMembersByProject.get(p.id) || new Set<string>()
        for (const uid of seriesPms) set.add(uid)
        assignedMembersByProject.set(p.id, set)
      }
    }
  }

  let unassignedActiveCount = 0
  for (const p of input.projects) {
    const stage = resolveKanbanStage(p)
    const isArchived = String(p.status || '').toLowerCase() === 'archived'
    if (!isArchived && stage !== 'delivered') {
      const pms = assignedMembersByProject.get(p.id)
      if (!pms || pms.size === 0) {
        unassignedActiveCount += 1
      }
    }
  }

  const rows: PmScorecardRow[] = input.members.map((m) => {
    let activeProjectCount = 0
    let completedProjectCount = 0
    let overdueProjectCount = 0
    let actionRequiredCount = 0
    let assignedRevenueUsd = 0
    let assignedCreditsUsed = 0
    const turnaroundDays: number[] = []

    if (m.memberUserId) {
      for (const p of input.projects) {
        const pms = assignedMembersByProject.get(p.id)
        const isAssigned = pms?.has(m.memberUserId) || false
        if (!isAssigned) continue

        const meta = (p.metadata || {}) as Record<string, any>
        const order = (meta.clientOrder || {}) as Record<string, any>
        const stage = resolveKanbanStage(p)
        const sla = evaluateProjectSla(p, now)
        const isArchived = String(p.status || '').toLowerCase() === 'archived'

        if (stage === 'delivered') {
          completedProjectCount += 1
          const startMs = p.createdAt ? Date.parse(String(p.createdAt)) : NaN
          const endRaw = order.completedAt || p.updatedAt
          const endMs = endRaw ? Date.parse(String(endRaw)) : NaN
          if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
            turnaroundDays.push((endMs - startMs) / (24 * 60 * 60 * 1000))
          }
        } else if (!isArchived) {
          activeProjectCount += 1
        }

        if (sla.isOverdue) overdueProjectCount += 1
        if (order.actionState === 'action_required' && !isArchived && stage !== 'delivered') {
          actionRequiredCount += 1
        }

        assignedRevenueUsd += Math.max(0, Number(order.clientPriceUsd ?? 0) || 0)
        assignedCreditsUsed += Math.max(0, getProjectCreditsUsed(meta))
      }
    }

    const creditUtilizationPct =
      typeof m.monthlyCreditLimit === 'number' && m.monthlyCreditLimit > 0
        ? Math.min(100, Math.round((m.creditsUsedMonth / m.monthlyCreditLimit) * 100))
        : null

    const estimatedCost = assignedCreditsUsed * OPERATOR_CREDIT_COST_USD
    const estimatedMarginPct =
      assignedRevenueUsd > 0
        ? Math.round(((assignedRevenueUsd - estimatedCost) / assignedRevenueUsd) * 100)
        : null

    const avgTurnaroundDays =
      turnaroundDays.length > 0
        ? Number(
            (turnaroundDays.reduce((sum, d) => sum + d, 0) / turnaroundDays.length).toFixed(1)
          )
        : null

    return {
      memberId: m.id,
      memberUserId: m.memberUserId,
      memberEmail: m.memberEmail,
      role: m.role,
      status: m.status,
      accessAllProjects: m.accessAllProjects,
      activeProjectCount,
      completedProjectCount,
      overdueProjectCount,
      actionRequiredCount,
      creditsUsedMonth: m.creditsUsedMonth,
      monthlyCreditLimit: m.monthlyCreditLimit,
      creditUtilizationPct,
      assignedRevenueUsd,
      assignedCreditsUsed,
      estimatedMarginPct,
      avgTurnaroundDays,
    }
  })

  return { rows, unassignedActiveCount }
}

/** Average estimated media sizes for deterministic Continuity Vault storage accounting. */
const ESTIMATED_VIDEO_TAKE_BYTES = 18 * 1024 * 1024 // ~18 MB per 8s Veo clip
const ESTIMATED_STORYBOARD_IMAGE_BYTES = 1.4 * 1024 * 1024 // ~1.4 MB per frame/portrait
const ESTIMATED_AUDIO_CLIP_BYTES = 600 * 1024 // ~600 KB per voice/SFX stem

export interface PurgeableDraftPlan {
  cleanedMetadata: Record<string, any>
  removedTakeCount: number
  removedBlobUrls: string[]
  estimatedBytesReclaimed: number
}

export interface ProjectStorageEstimate {
  totalBytes: number
  purgeableDraftCount: number
  estimatedReclaimableBytes: number
  storagePurgedAt: string | null
}

/**
 * Safely collects superseded/non-selected intermediate candidate takes inside
 * `metadata.visionPhase.production` while strictly preserving:
 * - Every segment's active/selected master clip (`activeAssetUrl` / `videoUrl` / selected take)
 * - Final rendered exports & Screening Room masters
 * - Blueprint JSON, script, character references & Continuity Bible
 */
export function collectPurgeableDraftMedia(
  rawMetadata: Record<string, any> | null | undefined
): PurgeableDraftPlan {
  const cloned: Record<string, any> = rawMetadata
    ? JSON.parse(JSON.stringify(rawMetadata))
    : {}
  const removedBlobUrls: string[] = []
  let removedTakeCount = 0

  const production = cloned?.visionPhase?.production
  const scenesObj = production?.scenes

  const processSegments = (segments: any[]) => {
    for (const seg of segments) {
      if (!seg || typeof seg !== 'object') continue
      const activeUrl =
        (typeof seg.activeAssetUrl === 'string' && seg.activeAssetUrl.trim()) ||
        (typeof seg.videoUrl === 'string' && seg.videoUrl.trim()) ||
        (typeof seg.selectedTakeUrl === 'string' && seg.selectedTakeUrl.trim()) ||
        null

      if (Array.isArray(seg.takes) && seg.takes.length > 1) {
        const kept: any[] = []
        for (const take of seg.takes) {
          const takeUrl =
            (typeof take?.videoUrl === 'string' && take.videoUrl.trim()) ||
            (typeof take?.assetUrl === 'string' && take.assetUrl.trim()) ||
            (typeof take?.url === 'string' && take.url.trim()) ||
            null
          const isActive =
            Boolean(take?.isSelected) ||
            (activeUrl && takeUrl && takeUrl === activeUrl) ||
            (!activeUrl && kept.length === 0)
          if (isActive) {
            kept.push(take)
          } else {
            removedTakeCount += 1
            if (takeUrl && /^https?:\/\//i.test(takeUrl)) {
              removedBlobUrls.push(takeUrl)
            }
          }
        }
        seg.takes = kept.length > 0 ? kept : seg.takes.slice(-1)
      }

      if (Array.isArray(seg.candidateVideos) && seg.candidateVideos.length > 0) {
        for (const cand of seg.candidateVideos) {
          const candUrl = typeof cand === 'string' ? cand : cand?.url || cand?.videoUrl
          if (candUrl && candUrl !== activeUrl) {
            removedTakeCount += 1
            if (/^https?:\/\//i.test(candUrl)) removedBlobUrls.push(candUrl)
          }
        }
        seg.candidateVideos = []
      }
    }
  }

  if (Array.isArray(scenesObj)) {
    for (const scene of scenesObj) {
      if (Array.isArray(scene?.segments)) processSegments(scene.segments)
    }
  } else if (scenesObj && typeof scenesObj === 'object') {
    for (const scene of Object.values(scenesObj) as any[]) {
      if (Array.isArray(scene?.segments)) processSegments(scene.segments)
    }
  }

  // Also strip obsolete draft image versions on storyboard scenes while preserving current imageUrl
  const scriptScenes = cloned?.visionPhase?.script?.script?.scenes
  if (Array.isArray(scriptScenes)) {
    for (const sc of scriptScenes) {
      if (Array.isArray(sc?.imageVersions) && sc.imageVersions.length > 1) {
        const currentImg = typeof sc.imageUrl === 'string' ? sc.imageUrl.trim() : null
        const kept = sc.imageVersions.filter(
          (v: any, idx: number) =>
            (currentImg && (v?.url === currentImg || v === currentImg)) ||
            (!currentImg && idx === sc.imageVersions.length - 1)
        )
        const dropped = sc.imageVersions.length - Math.max(1, kept.length)
        if (dropped > 0) {
          removedTakeCount += dropped
          for (const v of sc.imageVersions) {
            const url = typeof v === 'string' ? v : v?.url
            if (url && url !== currentImg && /^https?:\/\//i.test(url)) {
              removedBlobUrls.push(url)
            }
          }
          sc.imageVersions = kept.length > 0 ? kept : sc.imageVersions.slice(-1)
        }
      }
    }
  }

  return {
    cleanedMetadata: cloned,
    removedTakeCount,
    removedBlobUrls: Array.from(new Set(removedBlobUrls)),
    estimatedBytesReclaimed: removedTakeCount * ESTIMATED_VIDEO_TAKE_BYTES,
  }
}

/**
 * Estimates total Continuity Vault storage footprint (in bytes) for a project,
 * plus how many draft intermediate clips can be reclaimed via 1-click purge.
 */
export function estimateProjectStorage(
  metadata: Record<string, any> | null | undefined,
  clientUploadsBytes = 0
): ProjectStorageEstimate {
  const meta = (metadata || {}) as Record<string, any>
  const purgePlan = collectPurgeableDraftMedia(meta)
  const storagePurgedAt =
    typeof meta.storagePurgedAt === 'string' ? meta.storagePurgedAt : null

  if (typeof meta.storageBytes === 'number' && Number.isFinite(meta.storageBytes) && meta.storageBytes >= 0) {
    return {
      totalBytes: Math.round(meta.storageBytes + Math.max(0, clientUploadsBytes)),
      purgeableDraftCount: purgePlan.removedTakeCount,
      estimatedReclaimableBytes:
        purgePlan.estimatedBytesReclaimed + Math.max(0, clientUploadsBytes),
      storagePurgedAt,
    }
  }

  let videoClips = 0
  let images = 0
  let audioClips = 0

  const scenesObj = meta?.visionPhase?.production?.scenes
  const countSegments = (segments: any[]) => {
    for (const seg of segments) {
      if (!seg || typeof seg !== 'object') continue
      if (Array.isArray(seg.takes) && seg.takes.length > 0) {
        videoClips += seg.takes.length
      } else if (seg.activeAssetUrl || seg.videoUrl) {
        videoClips += 1
      }
      if (Array.isArray(seg.candidateVideos)) {
        videoClips += seg.candidateVideos.length
      }
    }
  }

  if (Array.isArray(scenesObj)) {
    for (const sc of scenesObj) {
      if (Array.isArray(sc?.segments)) countSegments(sc.segments)
    }
  } else if (scenesObj && typeof scenesObj === 'object') {
    for (const sc of Object.values(scenesObj) as any[]) {
      if (Array.isArray(sc?.segments)) countSegments(sc.segments)
    }
  }

  const scriptScenes = meta?.visionPhase?.script?.script?.scenes
  if (Array.isArray(scriptScenes)) {
    for (const sc of scriptScenes) {
      if (sc?.imageUrl) images += 1
      if (Array.isArray(sc?.imageVersions) && sc.imageVersions.length > 1) {
        images += sc.imageVersions.length - 1
      }
      if (sc?.narrationAudioUrl) audioClips += 1
      if (Array.isArray(sc?.dialogue)) audioClips += sc.dialogue.length
    }
  }

  const characters = meta?.visionPhase?.characters
  if (Array.isArray(characters)) {
    for (const ch of characters) {
      if (ch?.referenceImage || ch?.imageUrl) images += 1
    }
  }

  const totalBytes = Math.round(
    videoClips * ESTIMATED_VIDEO_TAKE_BYTES +
      images * ESTIMATED_STORYBOARD_IMAGE_BYTES +
      audioClips * ESTIMATED_AUDIO_CLIP_BYTES +
      Math.max(0, clientUploadsBytes)
  )

  return {
    totalBytes,
    purgeableDraftCount: purgePlan.removedTakeCount,
    estimatedReclaimableBytes:
      purgePlan.estimatedBytesReclaimed + Math.max(0, clientUploadsBytes),
    storagePurgedAt,
  }
}

export function getTierStorageCapBytes(tierName?: string | null): number {
  const normalized = normalizeTierName(tierName || '') ?? 'explorer'
  const gb = TIER_CATALOG[normalized]?.storageGb ?? 5
  return gb * 1024 * 1024 * 1024
}

export function formatStorageBytes(bytes: number): string {
  const safe = Math.max(0, Number(bytes) || 0)
  if (safe >= 1024 * 1024 * 1024) {
    return `${(safe / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (safe >= 1024 * 1024) {
    return `${(safe / (1024 * 1024)).toFixed(1)} MB`
  }
  if (safe >= 1024) {
    return `${Math.round(safe / 1024)} KB`
  }
  return `${Math.round(safe)} B`
}
