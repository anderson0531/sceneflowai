import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import ClientAssetSubmission, { type ContinuitySlotType } from '@/models/ClientAssetSubmission'
import Project from '@/models/Project'
import { resolveActiveContinuitySession } from '@/lib/continuity/continuityPortalService'
import { getLatestCustomerConsent } from '@/lib/producer/producerProfileService'
import { sanitizeCustomerImageUpload } from '@/lib/producer/quarantineCheck'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { notifyUser } from '@/lib/jobs/jobService'

export const runtime = 'nodejs'
export const maxDuration = 60

type RouteCtx = { params: Promise<{ token: string }> }

const VALID_SLOT_TYPES = new Set<ContinuitySlotType>([
  'character',
  'wardrobe',
  'location',
  'location_version',
  'prop',
])

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    await ensureProducerPlatformSchema()

    const resolved = await resolveActiveContinuitySession(token)
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Continuity link not found or expired' },
        { status: 404 }
      )
    }

    const { session, payload } = resolved
    if (payload.allowUploads === false) {
      return NextResponse.json(
        { success: false, error: 'Photo uploads are disabled on this continuity link' },
        { status: 403 }
      )
    }

    const consent = await getLatestCustomerConsent(session.id)
    if (payload.clientMode && !consent) {
      return NextResponse.json(
        {
          success: false,
          error: 'CONSENT_REQUIRED: Customer media rights consent is required before uploading photos',
        },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const slotId = String(formData.get('slotId') || '').trim()
    const slotTypeRaw = String(formData.get('slotType') || 'character').trim() as ContinuitySlotType
    const slotName = String(formData.get('slotName') || 'Reference').trim().slice(0, 200)
    const reviewerNameRaw = String(formData.get('reviewerName') || '').trim().slice(0, 160)
    const caption = formData.get('caption') ? String(formData.get('caption')).slice(0, 1000) : null

    if (!file || !slotId) {
      return NextResponse.json(
        { success: false, error: 'file and slotId are required' },
        { status: 400 }
      )
    }

    const slotType: ContinuitySlotType = VALID_SLOT_TYPES.has(slotTypeRaw)
      ? slotTypeRaw
      : 'character'

    const rawBuffer = Buffer.from(await file.arrayBuffer())
    const sanitized = await sanitizeCustomerImageUpload({
      buffer: rawBuffer,
      mimeType: file.type || 'image/jpeg',
      caption,
    })

    if (!sanitized.ok) {
      return NextResponse.json(
        { success: false, error: sanitized.error },
        { status: sanitized.status }
      )
    }

    if (sanitized.quarantine.status === 'flagged') {
      return NextResponse.json(
        {
          success: false,
          error: sanitized.quarantine.reason || 'Caption flagged by safety filter',
        },
        { status: 422 }
      )
    }

    const safeSlotSegment = slotId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)
    const blobKey = `projects/${session.project_id}/client-continuity/${safeSlotSegment}-${Date.now()}.jpg`
    const blob = await put(blobKey, sanitized.sanitizedBuffer, {
      access: 'public',
      contentType: sanitized.outputMimeType,
    })

    const uploaderName =
      consent?.customer_name || reviewerNameRaw || payload.lastReviewerName || 'Reviewer'

    const submission = await ClientAssetSubmission.create({
      collab_session_id: session.id,
      project_id: session.project_id,
      owner_user_id: session.owner_user_id,
      slot_id: slotId,
      slot_type: slotType,
      slot_name: slotName,
      customer_name: uploaderName,
      customer_email: consent?.customer_email || null,
      blob_url: blob.url,
      mime_type: sanitized.outputMimeType,
      file_size_bytes: sanitized.sanitizedBuffer.length,
      caption,
      quarantine_status: sanitized.quarantine.status,
      quarantine_reason: sanitized.quarantine.reason || null,
      approval_status: 'pending',
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
              stage: 'continuity_uploads_received',
              actionState: 'action_required',
            },
          },
        })
      }
    }

    try {
      await notifyUser({
        userId: session.owner_user_id,
        projectId: session.project_id,
        type: 'client_assets_uploaded',
        title: `Continuity Photo Uploaded: ${slotName}`,
        message: `${uploaderName} uploaded a photo for "${slotName}". Review and promote in Continuity Library.`,
        sendEmail: false,
        metadata: {
          projectId: session.project_id,
          submissionId: submission.id,
          slotId,
          source: 'continuity',
          brandName: payload.brandProfileSnapshot.brandName,
          openPath: `/dashboard/workflow/vision/${session.project_id}?openLibrary=1`,
        },
      })
    } catch (notifyErr) {
      console.warn('[continuity upload] notify warning:', notifyErr)
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        slotId: submission.slot_id,
        slotType: submission.slot_type,
        slotName: submission.slot_name,
        blobUrl: submission.blob_url,
        caption: submission.caption,
        approvalStatus: submission.approval_status,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Photo upload failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
