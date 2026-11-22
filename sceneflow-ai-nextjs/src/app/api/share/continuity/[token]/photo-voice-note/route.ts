import { NextRequest, NextResponse } from 'next/server'
import ClientAssetSubmission, {
  type ClientAssetSubmissionMetadata,
} from '@/models/ClientAssetSubmission'
import { resolveActiveContinuitySession } from '@/lib/continuity/continuityPortalService'
import { getLatestCustomerConsent } from '@/lib/producer/producerProfileService'
import { evaluateCustomerTextQuarantine } from '@/lib/producer/quarantineCheck'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { transcribePhotoVoiceNote } from '@/lib/continuity/voiceDnaService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteCtx = { params: Promise<{ token: string }> }

function isAllowedVercelBlobUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    return (
      u.protocol === 'https:' &&
      (u.hostname.endsWith('.public.blob.vercel-storage.com') ||
        u.hostname.endsWith('.blob.vercel-storage.com'))
    )
  } catch {
    return false
  }
}

/**
 * Attaches a "Tell the story behind this photo" audio recording + verbatim Gemini
 * transcript directly onto an existing Continuity photo submission.
 */
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
    if (payload.clientMode && !consent) {
      return NextResponse.json(
        { success: false, error: 'CONSENT_REQUIRED: Customer consent is required' },
        { status: 403 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      submissionId?: string
      audioBlobUrl?: string
      mimeType?: string
      durationSeconds?: number
    }

    const submissionId = String(body.submissionId || '').trim()
    const audioBlobUrl = String(body.audioBlobUrl || '').trim()
    const mimeType = String(body.mimeType || 'audio/webm').trim().slice(0, 64)
    const durationSeconds = Number.isFinite(Number(body.durationSeconds))
      ? Math.max(1, Math.round(Number(body.durationSeconds)))
      : null

    if (!submissionId || !audioBlobUrl || !isAllowedVercelBlobUrl(audioBlobUrl)) {
      return NextResponse.json(
        { success: false, error: 'Valid submissionId and audioBlobUrl are required' },
        { status: 400 }
      )
    }

    const submission = await ClientAssetSubmission.findByPk(submissionId)
    if (!submission || submission.collab_session_id !== session.id) {
      return NextResponse.json(
        { success: false, error: 'Photo submission not found for this link' },
        { status: 404 }
      )
    }

    let transcript: string | null = null
    try {
      const audioRes = await fetch(audioBlobUrl)
      if (audioRes.ok) {
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
        if (audioBuffer.length > 0) {
          const text = await transcribePhotoVoiceNote({
            audioBuffer,
            mimeType,
            slotName: submission.slot_name,
          })
          if (text) {
            const q = evaluateCustomerTextQuarantine(text)
            if (q.status !== 'flagged') {
              transcript = text
            }
          }
        }
      }
    } catch (txErr) {
      console.warn(
        '[continuity photo-voice-note] Transcription skipped (audio still saved):',
        txErr instanceof Error ? txErr.message : txErr
      )
    }

    const nextMeta: ClientAssetSubmissionMetadata = {
      ...((submission.metadata || {}) as ClientAssetSubmissionMetadata),
      photoVoiceNoteUrl: audioBlobUrl,
      photoVoiceNoteTranscript: transcript,
      photoVoiceNoteDurationSec: durationSeconds,
    }

    const nextCaption = submission.caption?.trim()
      ? submission.caption
      : transcript
        ? transcript.slice(0, 950)
        : submission.caption

    await submission.update({
      metadata: nextMeta,
      caption: nextCaption,
    })

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        slotId: submission.slot_id,
        slotType: submission.slot_type,
        slotName: submission.slot_name,
        customerName: submission.customer_name,
        blobUrl: submission.blob_url,
        mimeType: submission.mime_type,
        caption: nextCaption,
        metadata: nextMeta,
        approvalStatus: submission.approval_status,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save photo voice note'
    console.error('[continuity photo-voice-note] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
