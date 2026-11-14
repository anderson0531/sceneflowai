import crypto from 'crypto'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import ClientAssetSubmission, { type ContinuitySlotType } from '@/models/ClientAssetSubmission'
import Project from '@/models/Project'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import {
  getLatestCustomerConsent,
  getOrCreateProducerProfile,
  toBrandProfileSnapshot,
  type BrandProfileSnapshot,
} from '@/lib/producer/producerProfileService'
import { evaluateCustomerTextQuarantine } from '@/lib/producer/quarantineCheck'
import { resolveClientPortalLocale, type ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import { createReferenceAsset } from '@/lib/referenceLibrary/assetRepository'
import { notifyUser } from '@/lib/jobs/jobService'

export interface ContinuityPortalSlot {
  slotId: string
  slotType: ContinuitySlotType
  name: string
  parentId?: string
  parentName?: string
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
  projectTitle?: string
  clientMode?: boolean
  allowUploads?: boolean
  locale: ClientPortalLocale
  maxRounds: number
  roundsUsed: number
  approvalStatus: 'pending_review' | 'changes_requested' | 'approved'
  lastReviewerName?: string
  lastReviewedAt?: string
  generalNotes?: string
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
 * Extracts Character, Wardrobe, Location (including `locationReferences` + `sceneReferences`),
 * Location Version, and Prop slots from a Project's Blueprint and Production metadata.
 */
export function extractContinuitySlotsFromProject(project: Pick<Project, 'metadata'>): ContinuityPortalSlot[] {
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
    const charSlotId = String(c.id || `char-${idx + 1}`)
    const charName = String(c.name || `Character ${idx + 1}`)
    slots.push({
      slotId: charSlotId,
      slotType: 'character',
      name: charName,
      role: c.role ? String(c.role) : undefined,
      description: String(c.description || c.appearanceDescription || c.appearance || ''),
      referenceImageUrl: c.referenceImage || c.imageUrl || null,
      needsClientPhoto: !(c.referenceImage || c.imageUrl),
      clientDecision: 'pending',
    })

    const wardrobes = Array.isArray(c.wardrobes) ? c.wardrobes : []
    wardrobes.forEach((w: any, wIdx: number) => {
      const wId = String(w.id || `w-${wIdx + 1}`)
      slots.push({
        slotId: `wardrobe:${charSlotId}:${wId}`,
        slotType: 'wardrobe',
        parentId: charSlotId,
        parentName: charName,
        name: `${charName} — ${String(w.name || `Wardrobe ${wIdx + 1}`)}`,
        description: String(w.description || w.outfitDescription || ''),
        referenceImageUrl: w.fullBodyUrl || w.previewImageUrl || w.imageUrl || null,
        needsClientPhoto: !(w.fullBodyUrl || w.previewImageUrl || w.imageUrl),
        clientDecision: 'pending',
      })
    })
  })

  const refs = (visionPhase.references || {}) as Record<string, any>
  // Canonical Production Stage location store is `locationReferences`; also merge legacy `sceneReferences`
  const locRefs = Array.isArray(refs.locationReferences) ? refs.locationReferences : []
  const sceneRefs = Array.isArray(refs.sceneReferences) ? refs.sceneReferences : []
  const seenLocKeys = new Set<string>()
  const mergedLocations: any[] = []

  for (const loc of [...locRefs, ...sceneRefs]) {
    if (!loc) continue
    const dedupeKey = `${String(loc.id || '').toLowerCase()}::${String(loc.name || '').trim().toLowerCase()}`
    if (seenLocKeys.has(dedupeKey)) continue
    seenLocKeys.add(dedupeKey)
    mergedLocations.push(loc)
  }

  mergedLocations.forEach((loc: any, idx: number) => {
    const locSlotId = String(loc.id || `loc-${idx + 1}`)
    const locName = String(loc.name || `Location ${idx + 1}`)
    slots.push({
      slotId: locSlotId,
      slotType: 'location',
      name: locName,
      description: String(loc.description || ''),
      referenceImageUrl: loc.imageUrl || loc.referenceImage || null,
      needsClientPhoto: !(loc.imageUrl || loc.referenceImage),
      clientDecision: 'pending',
    })

    const versions = Array.isArray(loc.versions) ? loc.versions : []
    versions.forEach((ver: any, vIdx: number) => {
      const verId = String(ver.id || `ver-${vIdx + 1}`)
      slots.push({
        slotId: `locver:${locSlotId}:${verId}`,
        slotType: 'location_version',
        parentId: locSlotId,
        parentName: locName,
        name: `${locName} — ${String(ver.label || ver.name || `State ${vIdx + 1}`)}`,
        description: String(ver.description || ''),
        referenceImageUrl: ver.imageUrl || ver.referenceImage || null,
        needsClientPhoto: !(ver.imageUrl || ver.referenceImage),
        clientDecision: 'pending',
      })
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
      needsClientPhoto: !(prop.imageUrl || prop.referenceImage),
      clientDecision: 'pending',
    })
  })

  if (slots.length === 0) {
    slots.push(
      {
        slotId: 'char-1',
        slotType: 'character',
        name: 'Primary Subject / Cast',
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
        description: 'Upload close-up photos of meaningful objects or brand assets.',
        referenceImageUrl: null,
        needsClientPhoto: true,
        clientDecision: 'pending',
      }
    )
  }

  return slots
}

export async function getActiveContinuitySessionForProject(
  projectId: string,
  origin: string
): Promise<{
  session: CollabSession
  payload: ContinuitySessionPayload
  shareUrl: string
} | null> {
  await ensureProducerPlatformSchema()
  const rows = await CollabSession.findAll({
    where: {
      project_id: projectId,
      status: 'active',
    },
    order: [['created_at', 'DESC']],
    limit: 15,
  })
  const now = new Date()
  for (const row of rows) {
    const expiresAt = (row as { expires_at?: Date | null }).expires_at
    if (expiresAt && new Date(expiresAt) < now) continue
    const p = row.payload as Record<string, unknown> | null
    if (isContinuityPayload(p)) {
      const shareUrl = `${origin}/share/continuity/${row.token}?lang=${encodeURIComponent(
        p.locale || 'en'
      )}`
      return { session: row, payload: p, shareUrl }
    }
  }
  return null
}

export async function createOrUpdateContinuityPortalLink(input: {
  project: Project
  ownerUserId: string
  ownerDisplayName?: string
  clientMode?: boolean
  allowUploads?: boolean
  locale?: string
  maxRounds?: number
  clientGroupSlug?: string
  expiresInDays?: number
  origin: string
}): Promise<{
  token: string
  sessionId: string
  url: string
  clientMode: boolean
  allowUploads: boolean
  approvalStatus: ContinuitySessionPayload['approvalStatus']
  slots: ContinuityPortalSlot[]
}> {
  await ensureProducerPlatformSchema()
  const clientMode = input.clientMode === true
  const profile = await getOrCreateProducerProfile(input.ownerUserId)

  if (clientMode && !profile.commercial_addendum_accepted_at) {
    throw new Error(
      'COMMERCIAL_ADDENDUM_REQUIRED: Accept the Commercial Producer Addendum in Producer Settings before creating white-label B2B2C client continuity links.'
    )
  }

  const locale = resolveClientPortalLocale(input.locale)
  const brandSnapshot: BrandProfileSnapshot = clientMode
    ? toBrandProfileSnapshot(profile, input.ownerDisplayName || 'Studio Producer')
    : {
        brandName: profile.brand_name?.trim() || input.ownerDisplayName || 'SceneFlow Studio',
        logoUrl: profile.brand_logo_url || undefined,
        primaryColor: profile.primary_color || '#06b6d4',
        hideSceneFlowBranding: false,
      }
  const maxRounds = Math.min(
    10,
    Math.max(1, Math.round(input.maxRounds ?? profile.default_max_rounds ?? 3))
  )
  const allowUploads = input.allowUploads !== false
  const freshSlots = extractContinuitySlotsFromProject(input.project)

  const existing = await getActiveContinuitySessionForProject(input.project.id, input.origin)
  if (existing) {
    const p = existing.payload
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
    const effectiveClientMode = input.clientMode !== undefined ? clientMode : Boolean(p.clientMode)
    const effectiveAllowUploads =
      input.allowUploads !== undefined ? allowUploads : p.allowUploads !== false

    const nextPayload: ContinuitySessionPayload = {
      ...p,
      projectTitle: input.project.title || p.projectTitle,
      clientMode: effectiveClientMode,
      allowUploads: effectiveAllowUploads,
      locale,
      maxRounds,
      brandProfileSnapshot: brandSnapshot,
      clientGroupSlug: input.clientGroupSlug || p.clientGroupSlug,
      slots: mergedSlots,
    }
    await existing.session.update({
      payload: nextPayload as unknown as Record<string, unknown>,
    })
    return {
      token: existing.session.token,
      sessionId: existing.session.id,
      url: `${input.origin}/share/continuity/${existing.session.token}?lang=${encodeURIComponent(locale)}`,
      clientMode: effectiveClientMode,
      allowUploads: effectiveAllowUploads,
      approvalStatus: nextPayload.approvalStatus,
      slots: mergedSlots,
    }
  }

  const token = crypto.randomBytes(24).toString('base64url')
  const days = Math.min(90, Math.max(1, Math.round(input.expiresInDays ?? 30)))
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const payload: ContinuitySessionPayload = {
    type: 'continuity',
    projectId: input.project.id,
    projectTitle: input.project.title || 'Project',
    clientMode,
    allowUploads,
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
    clientMode,
    allowUploads,
    approvalStatus: payload.approvalStatus,
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
  if (payload.clientMode && !consent) {
    return {
      ok: false,
      status: 403,
      error: 'CONSENT_REQUIRED: Customer consent attestation is required',
    }
  }

  const reviewerLabel =
    input.reviewerName.trim() || consent?.customer_name || 'Reviewer'

  const hasRevisionRequest = input.slotDecisions.some(
    (d) => d.decision === 'revision_requested'
  )

  if (payload.clientMode && hasRevisionRequest && payload.roundsUsed >= payload.maxRounds) {
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
    lastReviewerName: reviewerLabel,
    lastReviewedAt: new Date().toISOString(),
    generalNotes: input.generalNotes ? input.generalNotes.slice(0, 1500) : payload.generalNotes,
    slots: updatedSlots,
  }

  await session.update({
    payload: nextPayload as unknown as Record<string, unknown>,
  })

  const project = await Project.findByPk(session.project_id).catch(() => null)
  if (project) {
    const md = ((project.metadata || {}) as Record<string, unknown>)
    const co = ((md.clientOrder || {}) as Record<string, unknown>)
    if (co.isClientProject || payload.clientMode || co.pmSupportRequested) {
      await project.update({
        metadata: {
          ...md,
          clientOrder: {
            ...co,
            isClientProject: Boolean(co.isClientProject || payload.clientMode),
            stage:
              nextApprovalStatus === 'approved'
                ? 'continuity_approved'
                : 'continuity_changes_requested',
            actionState: 'action_required',
          },
        },
      })
    }
  }

  try {
    const noteSummary = updatedSlots
      .filter((s) => s.clientDecision === 'revision_requested' && s.clientNote)
      .map((s) => `${s.name}: ${s.clientNote}`)
      .slice(0, 2)
      .join(' · ')

    await notifyUser({
      userId: session.owner_user_id,
      projectId: session.project_id,
      type:
        nextApprovalStatus === 'approved'
          ? 'client_stage_approved'
          : 'client_feedback_received',
      title:
        nextApprovalStatus === 'approved'
          ? 'Continuity Approved'
          : 'Continuity Revision Notes Submitted',
      message:
        nextApprovalStatus === 'approved'
          ? `${reviewerLabel} approved all Continuity references. Ready for Pre-Vis & Video Production!`
          : `${reviewerLabel} requested Continuity updates${noteSummary ? ` (${noteSummary})` : ''}.`,
      sendEmail: true,
      metadata: {
        projectId: session.project_id,
        source: 'continuity',
        stage: 'continuity',
        openPath: `/dashboard/workflow/vision/${session.project_id}?openLibrary=1`,
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
 * Pure helper applying a promoted Continuity submission into `project.metadata`.
 * Exported so unit tests can verify exact mutation semantics across all 5 slot types.
 */
export function applyPromotedSubmissionToProjectMetadata(
  rawMetadata: Record<string, any> | null | undefined,
  submission: {
    slot_id: string
    slot_type: ContinuitySlotType
    slot_name: string
    blob_url: string
    caption?: string | null
  }
): Record<string, any> {
  const md = { ...(rawMetadata || {}) }
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
  } else if (submission.slot_type === 'wardrobe') {
    // slot_id format: `wardrobe:<charId>:<wardrobeId>`
    const parts = submission.slot_id.split(':')
    const charId = parts[1] || ''
    const wardrobeId = parts.slice(2).join(':') || submission.slot_id
    const chars = Array.isArray(vp.characters) ? vp.characters.map((c: any) => ({ ...c })) : []
    const cIdx = chars.findIndex((c: any) => String(c.id || '') === charId)
    if (cIdx >= 0) {
      const wardrobes = Array.isArray(chars[cIdx].wardrobes)
        ? chars[cIdx].wardrobes.map((w: any) => ({ ...w }))
        : []
      const wIdx = wardrobes.findIndex((w: any) => String(w.id || '') === wardrobeId)
      if (wIdx >= 0) {
        wardrobes[wIdx].previewImageUrl = submission.blob_url
        wardrobes[wIdx].fullBodyUrl = submission.blob_url
        wardrobes[wIdx].combinedCharacterRefUrl = undefined
      } else {
        wardrobes.push({
          id: wardrobeId,
          name: submission.slot_name,
          description: submission.caption || '',
          previewImageUrl: submission.blob_url,
          fullBodyUrl: submission.blob_url,
        })
      }
      chars[cIdx].wardrobes = wardrobes
      vp.characters = chars
    }
  } else if (submission.slot_type === 'location' || submission.slot_type === 'location_version') {
    const refs = { ...(vp.references || {}) }
    const locRefs = Array.isArray(refs.locationReferences)
      ? refs.locationReferences.map((r: any) => ({ ...r }))
      : []

    if (submission.slot_type === 'location') {
      const idx = locRefs.findIndex((r: any) => String(r.id || '') === submission.slot_id)
      if (idx >= 0) {
        locRefs[idx].imageUrl = submission.blob_url
        locRefs[idx].referenceImage = submission.blob_url
      } else {
        locRefs.push({
          id: submission.slot_id,
          name: submission.slot_name,
          description: submission.caption || '',
          imageUrl: submission.blob_url,
          referenceImage: submission.blob_url,
        })
      }
      // Keep legacy `sceneReferences` synced if a matching entry exists
      if (Array.isArray(refs.sceneReferences)) {
        refs.sceneReferences = refs.sceneReferences.map((sr: any) =>
          String(sr?.id || '') === submission.slot_id
            ? { ...sr, imageUrl: submission.blob_url, referenceImage: submission.blob_url }
            : sr
        )
      }
    } else {
      // `locver:<locId>:<verId>`
      const parts = submission.slot_id.split(':')
      const locId = parts[1] || ''
      const verId = parts.slice(2).join(':') || submission.slot_id
      const lIdx = locRefs.findIndex((r: any) => String(r.id || '') === locId)
      if (lIdx >= 0) {
        const versions = Array.isArray(locRefs[lIdx].versions)
          ? locRefs[lIdx].versions.map((v: any) => ({ ...v }))
          : []
        const vIdx = versions.findIndex((v: any) => String(v.id || '') === verId)
        if (vIdx >= 0) {
          versions[vIdx].imageUrl = submission.blob_url
          versions[vIdx].referenceImage = submission.blob_url
        } else {
          versions.push({
            id: verId,
            label: submission.slot_name,
            description: submission.caption || '',
            imageUrl: submission.blob_url,
          })
        }
        locRefs[lIdx].versions = versions
      }
    }

    refs.locationReferences = locRefs
    vp.references = refs
  } else {
    const refs = { ...(vp.references || {}) }
    const objRefs = Array.isArray(refs.objectReferences)
      ? refs.objectReferences.map((r: any) => ({ ...r }))
      : []
    const idx = objRefs.findIndex((r: any) => String(r.id || '') === submission.slot_id)
    if (idx >= 0) {
      objRefs[idx].imageUrl = submission.blob_url
      objRefs[idx].referenceImage = submission.blob_url
    } else {
      objRefs.push({
        id: submission.slot_id,
        name: submission.slot_name,
        description: submission.caption || '',
        imageUrl: submission.blob_url,
        referenceImage: submission.blob_url,
      })
    }
    refs.objectReferences = objRefs
    vp.references = refs
  }

  md.visionPhase = vp
  return md
}

/**
 * Promotes a clean Customer-uploaded continuity photo into the Project's
 * Continuity Library (`visionPhase`) using a row-locked transaction and optionally
 * saves it to the Producer's reusable `ReferenceAsset` vault.
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

  const updatedOk = await sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(submission.project_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!project) return false
    const nextMetadata = applyPromotedSubmissionToProjectMetadata(
      (project.metadata || {}) as Record<string, any>,
      {
        slot_id: submission.slot_id,
        slot_type: submission.slot_type,
        slot_name: submission.slot_name,
        blob_url: submission.blob_url,
        caption: submission.caption,
      }
    )
    await project.update({ metadata: nextMetadata }, { transaction })
    return true
  })

  if (!updatedOk) {
    return { ok: false, status: 404, error: 'Project not found' }
  }

  // Also refresh active Continuity session slot preview image if present
  try {
    const active = await CollabSession.findByPk(submission.collab_session_id)
    if (active && isContinuityPayload(active.payload as Record<string, unknown>)) {
      const p = active.payload as unknown as ContinuitySessionPayload
      const nextSlots = p.slots.map((s) =>
        s.slotId === submission.slot_id
          ? { ...s, referenceImageUrl: submission.blob_url, needsClientPhoto: false }
          : s
      )
      await active.update({
        payload: { ...p, slots: nextSlots } as unknown as Record<string, unknown>,
      })
    }
  } catch {
    // Non-fatal preview sync
  }

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
          : submission.slot_type === 'wardrobe'
            ? 'wardrobe'
            : submission.slot_type === 'location' || submission.slot_type === 'location_version'
              ? 'location'
              : 'prop'
      const createdAsset = await createReferenceAsset({
        userId: input.ownerUserId,
        kind: assetKind,
        name: submission.slot_name,
        description: submission.caption || `Uploaded by ${submission.customer_name}`,
        referenceImageUrl: submission.blob_url,
        tags: [`client:${slug || 'client'}`, 'client-upload'],
        originProjectId: submission.project_id,
        attributes: {
          sourceSubmissionId: submission.id,
          customerName: submission.customer_name,
        } as any,
      })
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
