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
    const consent = await getLatestCustomerConsent(session.id)
    if (!consent) {
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
    const slotTypeRaw = String(formData.get('slotType') || 'character').trim()
    const slotName = String(formData.get('slotName') || 'Reference').trim().slice(0, 200)
    const caption = formData.get('caption') ? String(formData.get('caption')).slice(0, 1000) : null

    if (!file || !slotId) {
      return NextResponse.json(
        { success: false, error: 'file and slotId are required' },
        { status: 400 }
      )
    }

    const slotType: ContinuitySlotType =
      slotTypeRaw === 'location' || slotTypeRaw === 'prop' ? slotTypeRaw : 'character'

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

    const blobKey = `projects/${session.project_id}/client-continuity/${slotId}-${Date.now()}.jpg`
    const blob = await put(blobKey, sanitized.sanitizedBuffer, {
      access: 'public',
      contentType: sanitized.outputMimeType,
    })

    const submission = await ClientAssetSubmission.create({
      collab_session_id: session.id,
      project_id: session.project_id,
      owner_user_id: session.owner_user_id,
      slot_id: slotId,
      slot_type: slotType,
      slot_name: slotName,
      customer_name: consent.customer_name,
      customer_email: consent.customer_email,
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
      await project.update({
        metadata: {
          ...md,
          clientOrder: {
            ...co,
            isClientProject: true,
            stage: 'continuity_uploads_received',
            actionState: 'action_required',
          },
        },
      })
    }

    try {
      await notifyUser({
        userId: session.owner_user_id,
        projectId: session.project_id,
        type: 'client_assets_uploaded',
        title: `Client Photo Uploaded: ${slotName}`,
        message: `${consent.customer_name} uploaded a photo for "${slotName}". Review and promote to Continuity Library.`,
        sendEmail: false,
        metadata: {
          projectId: session.project_id,
          submissionId: submission.id,
          slotId,
          brandName: payload.brandProfileSnapshot.brandName,
          openPath: `/dashboard/settings/producer`,
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
