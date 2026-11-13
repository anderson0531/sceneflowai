import crypto from 'crypto'
import CollabSession from '@/models/CollabSession'
import ClientAssetSubmission, { type ContinuitySlotType } from '@/models/ClientAssetSubmission'
import Project from '@/models/Project'
import ReferenceAsset from '@/models/ReferenceAsset'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import {
  getLatestCustomerConsent,
  getOrCreateProducerProfile,
  toBrandProfileSnapshot,
  type BrandProfileSnapshot,
} from '@/lib/producer/producerProfileService'
import { evaluateCustomerTextQuarantine } from '@/lib/producer/quarantineCheck'
import { resolveClientPortalLocale, type ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import { notifyUser } from '@/lib/jobs/jobService'

export interface ContinuityPortalSlot {
  slotId: string
  slotType: ContinuitySlotType
  name: string
  role?: string
  description: string
  referenceImageUrl?: string | null
  needsClientPhoto: boolean
  clientDecision?: 'pending' | 'approved' | 'revision_requested'
  clientNote?: string
}

export interface ContinuitySessionPayload {
  type: 'continuity'
  projectId: string
  locale: ClientPortalLocale
  maxRounds: number
  roundsUsed: number
  approvalStatus: 'pending_review' | 'changes_requested' | 'approved'
  clientGroupSlug?: string
  brandProfileSnapshot: BrandProfileSnapshot
  slots: ContinuityPortalSlot[]
}

export function isContinuityPayload(
  payload: Record<string, unknown> | null | undefined
): payload is Record<string, unknown> & ContinuitySessionPayload {
  return payload?.type === 'continuity'
}

export async function resolveActiveContinuitySession(token: string) {
  const session = await CollabSession.findOne({
    where: { token, status: 'active' },
  })
  if (!session) return null
  const expiresAt = (session as { expires_at?: Date | null }).expires_at
  if (expiresAt && new Date(expiresAt) < new Date()) return null
  const payload = session.payload as Record<string, unknown> | null
  if (!isContinuityPayload(payload)) return null
  return { session, payload }
}

/**
 * Extracts Character, Location, and Prop slots from an existing Project's
 * Blueprint (`filmTreatmentVariant`) and Production (`visionPhase`) metadata.
 */
export function extractContinuitySlotsFromProject(project: Project): ContinuityPortalSlot[] {
  const md = ((project.metadata || {}) as Record<string, unknown>)
  const visionPhase = ((md.visionPhase || {}) as Record<string, any>)
  const variant = ((md.filmTreatmentVariant || {}) as Record<string, any>)
  const slots: ContinuityPortalSlot[] = []

  const vpChars = Array.isArray(visionPhase.characters) ? visionPhase.characters : []
  const bpChars = Array.isArray(variant.character_descriptions)
    ? variant.character_descriptions
    : []
  const charSource = vpChars.length > 0 ? vpChars : bpChars

  charSource.forEach((c: any, idx: number) => {
    const slotId = String(c.id || `char-${idx + 1}`)
    slots.push({
      slotId,
      slotType: 'character',
      name: String(c.name || `Character ${idx + 1}`),
      role: c.role ? String(c.role) : undefined,
      description: String(c.description || c.appearanceDescription || ''),
      referenceImageUrl: c.referenceImage || c.imageUrl || null,
      needsClientPhoto: true,
      clientDecision: 'pending',
    })
  })

  const refs = (visionPhase.references || {}) as Record<string, any>
  const sceneRefs = Array.isArray(refs.sceneReferences) ? refs.sceneReferences : []
  sceneRefs.forEach((loc: any, idx: number) => {
    slots.push({
      slotId: String(loc.id || `loc-${idx + 1}`),
      slotType: 'location',
      name: String(loc.name || `Location ${idx + 1}`),
      description: String(loc.description || ''),
      referenceImageUrl: loc.imageUrl || loc.referenceImage || null,
      needsClientPhoto: true,
      clientDecision: 'pending',
    })
  })

  const objRefs = Array.isArray(refs.objectReferences) ? refs.objectReferences : []
  objRefs.forEach((prop: any, idx: number) => {
    slots.push({
      slotId: String(prop.id || `prop-${idx + 1}`),
      slotType: 'prop',
      name: String(prop.name || `Prop ${idx + 1}`),
      description: String(prop.description || ''),
      referenceImageUrl: prop.imageUrl || prop.referenceImage || null,
      needsClientPhoto: true,
      clientDecision: 'pending',
    })
  })

  if (slots.length === 0) {
    slots.push(
      {
        slotId: 'char-1',
        slotType: 'character',
        name: 'Primary Subject / Host',
        description: 'Upload portrait or family photos across key eras.',
        referenceImageUrl: null,
        needsClientPhoto: true,
        clientDecision: 'pending',
      },
      {
        slotId: 'loc-1',
        slotType: 'location',
        name: 'Featured Location / Property',
        description: 'Upload room, exterior, or milestone setting photos.',
        referenceImageUrl: null,
        needsClientPhoto: true,
        clientDecision: 'pending',
      },
      {
        slotId: 'prop-1',
        slotType: 'prop',
        name: 'Featured Keepsake / Product',
        description: 'Upload close-up photos of meaningful objects or materials.',
        referenceImageUrl: null,
        needsClientPhoto: true,
        clientDecision: 'pending',
      }
    )
  }

  return slots
}

export async function createOrUpdateContinuityPortalLink(input: {
  project: Project
  ownerUserId: string
  ownerDisplayName?: string
  locale?: string
  maxRounds?: number
  clientGroupSlug?: string
  expiresInDays?: number
  origin: string
}): Promise<{
  token: string
  sessionId: string
  url: string
  slots: ContinuityPortalSlot[]
}> {
  await ensureProducerPlatformSchema()
  const profile = await getOrCreateProducerProfile(input.ownerUserId)
  if (!profile.commercial_addendum_accepted_at) {
    throw new Error(
      'COMMERCIAL_ADDENDUM_REQUIRED: Accept the Commercial Producer Addendum in Producer Settings before creating client continuity links.'
    )
  }

  const locale = resolveClientPortalLocale(input.locale)
  const brandSnapshot = toBrandProfileSnapshot(profile, input.ownerDisplayName || 'Studio Producer')
  const maxRounds = Math.min(
    10,
    Math.max(1, Math.round(input.maxRounds ?? profile.default_max_rounds ?? 2))
  )
  const freshSlots = extractContinuitySlotsFromProject(input.project)

  // Check if an active continuity session already exists for this project
  const existingRows = await CollabSession.findAll({
    where: {
      project_id: input.project.id,
      owner_user_id: input.ownerUserId,
      status: 'active',
    },
    order: [['created_at', 'DESC']],
    limit: 10,
  })

  for (const row of existingRows) {
    const p = row.payload as Record<string, unknown> | null
    if (isContinuityPayload(p)) {
      // Merge updated referenceImageUrls from Studio while preserving client decisions
      const prevBySlot = new Map(p.slots.map((s) => [s.slotId, s]))
      const mergedSlots = freshSlots.map((slot) => {
        const prev = prevBySlot.get(slot.slotId)
        return prev
          ? {
              ...slot,
              clientDecision: prev.clientDecision,
              clientNote: prev.clientNote,
            }
          : slot
      })
      const nextPayload: ContinuitySessionPayload = {
        ...p,
        locale,
        maxRounds,
        brandProfileSnapshot: brandSnapshot,
        clientGroupSlug: input.clientGroupSlug || p.clientGroupSlug,
        slots: mergedSlots,
      }
      await row.update({ payload: nextPayload as unknown as Record<string, unknown> })
      return {
        token: row.token,
        sessionId: row.id,
        url: `${input.origin}/share/continuity/${row.token}?lang=${encodeURIComponent(locale)}`,
        slots: mergedSlots,
      }
    }
  }

  const token = crypto.randomBytes(24).toString('base64url')
  const days = Math.min(90, Math.max(1, Math.round(input.expiresInDays ?? 30)))
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const payload: ContinuitySessionPayload = {
    type: 'continuity',
    projectId: input.project.id,
    locale,
    maxRounds,
    roundsUsed: 0,
    approvalStatus: 'pending_review',
    clientGroupSlug: input.clientGroupSlug?.trim() || undefined,
    brandProfileSnapshot: brandSnapshot,
    slots: freshSlots,
  }

  const created = await CollabSession.create({
    project_id: input.project.id,
    owner_user_id: input.ownerUserId,
    token,
    status: 'active',
    expires_at: expiresAt,
    payload: payload as unknown as Record<string, unknown>,
  })

  return {
    token,
    sessionId: created.id,
    url: `${input.origin}/share/continuity/${token}?lang=${encodeURIComponent(locale)}`,
    slots: freshSlots,
  }
}

export async function submitContinuityClientReview(input: {
  token: string
  reviewerName: string
  slotDecisions: Array<{
    slotId: string
    decision: 'approved' | 'revision_requested'
    note?: string
  }>
  generalNotes?: string
}): Promise<
  | {
      ok: true
      approvalStatus: 'approved' | 'changes_requested'
      roundsUsed: number
      maxRounds: number
    }
  | {
      ok: false
      status: number
      error: string
    }
> {
  const resolved = await resolveActiveContinuitySession(input.token)
  if (!resolved) {
    return { ok: false, status: 404, error: 'Continuity link not found or expired' }
  }
  const { session, payload } = resolved

  const consent = await getLatestCustomerConsent(session.id)
  if (!consent) {
    return {
      ok: false,
      status: 403,
      error: 'CONSENT_REQUIRED: Customer consent attestation is required',
    }
  }

  const hasRevisionRequest = input.slotDecisions.some(
    (d) => d.decision === 'revision_requested'
  )

  if (hasRevisionRequest && payload.roundsUsed >= payload.maxRounds) {
    return {
      ok: false,
      status: 409,
      error: 'ROUND_LIMIT_REACHED: Included continuity revision rounds have been completed.',
    }
  }

  const allNotes = [
    input.generalNotes || '',
    ...input.slotDecisions.map((d) => d.note || ''),
  ].join(' ')
  const quarantine = evaluateCustomerTextQuarantine(allNotes)
  if (quarantine.status === 'flagged') {
    return {
      ok: false,
      status: 422,
      error: quarantine.reason || 'Review notes flagged by safety filter',
    }
  }

  const decisionMap = new Map(input.slotDecisions.map((d) => [d.slotId, d]))
  const updatedSlots = payload.slots.map((slot) => {
    const incoming = decisionMap.get(slot.slotId)
    if (!incoming) return slot
    return {
      ...slot,
      clientDecision: incoming.decision,
      clientNote: incoming.note ? incoming.note.slice(0, 1000) : slot.clientNote,
    }
  })

  const nextApprovalStatus = hasRevisionRequest ? 'changes_requested' : 'approved'
  const nextRoundsUsed = hasRevisionRequest ? payload.roundsUsed + 1 : payload.roundsUsed

  const nextPayload: ContinuitySessionPayload = {
    ...payload,
    roundsUsed: nextRoundsUsed,
    approvalStatus: nextApprovalStatus,
    slots: updatedSlots,
  }

  await session.update({
    payload: nextPayload as unknown as Record<string, unknown>,
  })

  const project = await Project.findByPk(session.project_id).catch(() => null)
  if (project) {
    const md = ((project.metadata || {}) as Record<string, unknown>)
    const co = ((md.clientOrder || {}) as Record<string, unknown>)
    await project.update({
      metadata: {
        ...md,
        clientOrder: {
          ...co,
          isClientProject: true,
          stage:
            nextApprovalStatus === 'approved'
              ? 'continuity_approved'
              : 'continuity_changes_requested',
          actionState: 'action_required',
        },
      },
    })
  }

  try {
    await notifyUser({
      userId: session.owner_user_id,
      projectId: session.project_id,
      type:
        nextApprovalStatus === 'approved'
          ? 'client_stage_approved'
          : 'client_feedback_received',
      title:
        nextApprovalStatus === 'approved'
          ? 'Continuity Library Approved by Client'
          : 'Continuity Revision Notes Submitted',
      message: `${input.reviewerName || consent.customer_name} ${
        nextApprovalStatus === 'approved'
          ? 'approved all Continuity references. Ready for Pre-Vis & Video Production!'
          : 'submitted Continuity notes.'
      }`,
      sendEmail: true,
      metadata: {
        projectId: session.project_id,
        stage: 'continuity',
        openPath: `/dashboard/workflow/vision/${session.project_id}`,
      },
    })
  } catch (err) {
    console.warn('[continuityPortalService] notify warning:', err)
  }

  return {
    ok: true,
    approvalStatus: nextApprovalStatus,
    roundsUsed: nextRoundsUsed,
    maxRounds: payload.maxRounds,
  }
}

/**
 * Promotes a clean Customer-uploaded continuity photo into the Project's
 * Continuity Library (`visionPhase`) and optionally saves it to the Producer's
 * reusable `ReferenceAsset` vault tagged `client:<slug>` for multi-episode Series reuse!
 */
export async function promoteCustomerSubmissionToContinuity(input: {
  submissionId: string
  ownerUserId: string
  saveToReusableVault?: boolean
  clientGroupSlug?: string
}): Promise<
  | { ok: true; blobUrl: string; referenceAssetId?: string }
  | { ok: false; status: number; error: string }
> {
  await ensureProducerPlatformSchema()
  const submission = await ClientAssetSubmission.findByPk(input.submissionId)
  if (!submission || submission.owner_user_id !== input.ownerUserId) {
    return { ok: false, status: 404, error: 'Submission not found' }
  }
  if (submission.quarantine_status === 'flagged') {
    return {
      ok: false,
      status: 422,
      error: 'Flagged quarantine submissions cannot be promoted into studio continuity',
    }
  }

  const project = await Project.findByPk(submission.project_id)
  if (!project) {
    return { ok: false, status: 404, error: 'Project not found' }
  }

  const md = { ...((project.metadata || {}) as Record<string, any>) }
  const vp = { ...(md.visionPhase || {}) }

  if (submission.slot_type === 'character') {
    const chars = Array.isArray(vp.characters) ? vp.characters.map((c: any) => ({ ...c })) : []
    const idx = chars.findIndex((c: any) => String(c.id || '') === submission.slot_id)
    if (idx >= 0) {
      chars[idx].referenceImage = submission.blob_url
      chars[idx].imageUrl = submission.blob_url
    } else {
      chars.push({
        id: submission.slot_id,
        name: submission.slot_name,
        description: submission.caption || '',
        referenceImage: submission.blob_url,
        imageUrl: submission.blob_url,
      })
    }
    vp.characters = chars
  } else {
    const refs = { ...(vp.references || {}) }
    const key = submission.slot_type === 'location' ? 'sceneReferences' : 'objectReferences'
    const list = Array.isArray(refs[key]) ? refs[key].map((r: any) => ({ ...r })) : []
    const idx = list.findIndex((r: any) => String(r.id || '') === submission.slot_id)
    if (idx >= 0) {
      list[idx].imageUrl = submission.blob_url
      list[idx].referenceImage = submission.blob_url
    } else {
      list.push({
        id: submission.slot_id,
        name: submission.slot_name,
        description: submission.caption || '',
        imageUrl: submission.blob_url,
        referenceImage: submission.blob_url,
      })
    }
    refs[key] = list
    vp.references = refs
  }

  md.visionPhase = vp
  await project.update({ metadata: md })

  let referenceAssetId: string | undefined
  if (input.saveToReusableVault !== false) {
    try {
      const slug = (input.clientGroupSlug || submission.customer_name || 'client')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48)
      const assetKind =
        submission.slot_type === 'character'
          ? 'character'
          : submission.slot_type === 'location'
            ? 'location'
            : 'prop'
      const createdAsset = await ReferenceAsset.create({
        user_id: input.ownerUserId,
        kind: assetKind as any,
        name: submission.slot_name,
        description: submission.caption || `Uploaded by ${submission.customer_name}`,
        image_url: submission.blob_url,
        tags: [`client:${slug}`, 'client-upload'],
        metadata: {
          sourceSubmissionId: submission.id,
          projectId: submission.project_id,
          customerName: submission.customer_name,
        },
      } as any)
      referenceAssetId = createdAsset.id
    } catch (vaultErr) {
      console.warn('[continuityPortalService] ReferenceAsset vault save skipped:', vaultErr)
    }
  }

  await submission.update({
    approval_status: 'promoted',
    promoted_reference_asset_id: referenceAssetId || null,
  })

  return {
    ok: true,
    blobUrl: submission.blob_url,
    referenceAssetId,
  }
}
