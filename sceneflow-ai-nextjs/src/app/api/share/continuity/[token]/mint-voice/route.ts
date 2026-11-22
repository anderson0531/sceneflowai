import { NextRequest, NextResponse } from 'next/server'
import ClientAssetSubmission, {
  type ClientAssetSubmissionMetadata,
} from '@/models/ClientAssetSubmission'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { tryMintGoogleVoiceCloningKey } from '@/lib/continuity/voiceDnaService'
import { promoteCustomerSubmissionToContinuity } from '@/lib/continuity/continuityPortalService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Producer-only 1-click retry to mint a stateless Google Chirp 3 `voiceCloningKey`
 * from an already-uploaded customer voice sample + spoken consent recording.
 * If the submission was already promoted, automatically updates the project character too.
 */
export async function POST(req: NextRequest) {
  try {
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await ensureProducerPlatformSchema()
    const body = (await req.json().catch(() => ({}))) as { submissionId?: string }
    const submissionId = String(body.submissionId || '').trim()
    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'submissionId is required' },
        { status: 400 }
      )
    }

    const submission = await ClientAssetSubmission.findByPk(submissionId)
    if (!submission) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 })
    }

    const access = await assertProjectAccess(submission.project_id, actorUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const meta = { ...((submission.metadata || {}) as ClientAssetSubmissionMetadata) }
    const refUrl = meta.referenceSliceWavUrl || meta.extractedAudioUrl || submission.blob_url
    const consentUrl = meta.consentAudioBlobUrl

    if (!consentUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No spoken consent recording was attached to this voice sample. Acoustic Voice DNA (Tier 2) remains active.',
        },
        { status: 422 }
      )
    }

    const [refRes, consentRes] = await Promise.all([fetch(refUrl), fetch(consentUrl)])
    if (!refRes.ok || !consentRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Could not download saved audio files for voice cloning' },
        { status: 502 }
      )
    }

    const [refBuf, consentBuf] = await Promise.all([
      refRes.arrayBuffer().then((b) => Buffer.from(b)),
      consentRes.arrayBuffer().then((b) => Buffer.from(b)),
    ])

    const result = await tryMintGoogleVoiceCloningKey({
      referenceWavBuffer: refBuf,
      consentAudioBuffer: consentBuf,
      localeOrLanguageCode: meta.languageCode || 'en-US',
    })

    if (result.status !== 'minted') {
      meta.voiceCloneStatus = 'tier2_dna_ready'
      meta.voiceCloneNote = result.detail.slice(0, 240)
      await submission.update({ metadata: meta })
      return NextResponse.json(
        {
          success: false,
          reason: result.reason,
          error: result.detail,
          metadata: meta,
        },
        { status: result.httpStatus >= 400 ? result.httpStatus : 502 }
      )
    }

    meta.googleVoiceCloningKey = result.voiceCloningKey
    meta.voiceCloneStatus = 'minted'
    meta.voiceCloneNote = 'Google Chirp 3 Instant Custom Voice active (0 saved slots)'
    await submission.update({ metadata: meta })

    // If already promoted into project continuity, re-sync the newly minted voiceCloningKey onto the character
    if (submission.approval_status === 'promoted') {
      await promoteCustomerSubmissionToContinuity({
        submissionId: submission.id,
        ownerUserId: submission.owner_user_id,
        saveToReusableVault: false,
      })
    }

    return NextResponse.json({
      success: true,
      voiceCloningKey: result.voiceCloningKey,
      metadata: meta,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to mint Google voice clone key'
    console.error('[continuity mint-voice] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
