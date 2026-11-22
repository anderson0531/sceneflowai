import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import ClientAssetSubmission, {
  type ClientAssetSubmissionMetadata,
  type ClientMediaUsageIntent,
  type ContinuitySlotType,
} from '@/models/ClientAssetSubmission'
import Project from '@/models/Project'
import { resolveActiveContinuitySession } from '@/lib/continuity/continuityPortalService'
import { getLatestCustomerConsent } from '@/lib/producer/producerProfileService'
import { evaluateCustomerTextQuarantine } from '@/lib/producer/quarantineCheck'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { notifyUser } from '@/lib/jobs/jobService'
import {
  analyzeAudioToAcousticVoiceDna,
  extractPolishedSpeechAssetsFromMedia,
  tryMintGoogleVoiceCloningKey,
} from '@/lib/continuity/voiceDnaService'
import { resolveGoogleVoiceCloneLanguageCode } from '@/lib/continuity/voiceConsentScripts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

type RouteCtx = { params: Promise<{ token: string }> }

const VALID_MEDIA_SLOT_TYPES = new Set<ContinuitySlotType>([
  'character_voice',
  'live_video',
  'story_audio',
])

const MAX_SERVER_FETCH_BYTES = 120 * 1024 * 1024 // Process up to 120MB in serverless FFmpeg safely

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
 * Finalizes a client-side Vercel Blob upload of a voice sample, live video clip,
 * or audio story on a Continuity Share Link:
 *   1. Validates token, consent, and quarantine safety
 *   2. Extracts clean loudness-normalized MP3 speech stem + 15-20s LINEAR16 24kHz WAV slice
 *   3. Runs Gemini multimodal audio analysis -> 0-slot Acoustic Voice DNA + verbatim transcript
 *   4. When spoken consent audio is supplied, attempts Tier 1 stateless Google `voiceCloningKey`
 *      and automatically falls back to Tier 2 Acoustic Voice DNA on 403/billing/allowlist gates
 *   5. Persists `ClientAssetSubmission` + notifies producer
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
        {
          success: false,
          error: 'CONSENT_REQUIRED: Customer media rights consent is required before uploading media',
        },
        { status: 403 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      slotId?: string
      slotType?: ContinuitySlotType
      slotName?: string
      blobUrl?: string
      mimeType?: string
      fileSizeBytes?: number
      usageIntent?: ClientMediaUsageIntent
      targetCharacterId?: string | null
      targetCharacterName?: string | null
      consentAudioBlobUrl?: string | null
      caption?: string | null
      reviewerName?: string | null
      languageCode?: string | null
    }

    const blobUrl = String(body.blobUrl || '').trim()
    const slotId = String(body.slotId || '').trim()
    const slotTypeRaw = String(body.slotType || 'character_voice').trim() as ContinuitySlotType
    const slotType: ContinuitySlotType = VALID_MEDIA_SLOT_TYPES.has(slotTypeRaw)
      ? slotTypeRaw
      : 'character_voice'

    if (slotType === 'character_voice' && payload.allowVoiceCapture === false) {
      return NextResponse.json(
        { success: false, error: 'Voice capture is disabled on this continuity link' },
        { status: 403 }
      )
    }
    if ((slotType === 'live_video' || slotType === 'story_audio') && !payload.allowVideoClips) {
      return NextResponse.json(
        { success: false, error: 'Live video and story audio uploads are disabled on this continuity link' },
        { status: 403 }
      )
    }

    if (!blobUrl || !slotId) {
      return NextResponse.json(
        { success: false, error: 'blobUrl and slotId are required' },
        { status: 400 }
      )
    }
    if (!isAllowedVercelBlobUrl(blobUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid media storage URL' },
        { status: 400 }
      )
    }

    const consentAudioBlobUrl = body.consentAudioBlobUrl?.trim() || null
    if (consentAudioBlobUrl && !isAllowedVercelBlobUrl(consentAudioBlobUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid consent audio storage URL' },
        { status: 400 }
      )
    }

    const caption = body.caption ? String(body.caption).trim().slice(0, 1000) : null
    if (caption) {
      const q = evaluateCustomerTextQuarantine(caption)
      if (q.status === 'flagged') {
        return NextResponse.json(
          { success: false, error: q.reason || 'Caption flagged by safety filter' },
          { status: 422 }
        )
      }
    }

    const slotName = String(body.slotName || 'Client Media').trim().slice(0, 200)
    const mimeType = String(body.mimeType || (slotType === 'live_video' ? 'video/mp4' : 'audio/webm'))
      .trim()
      .slice(0, 64)
    const fileSizeBytes = Number.isFinite(Number(body.fileSizeBytes))
      ? Math.max(0, Math.round(Number(body.fileSizeBytes)))
      : 0
    const mediaKind: 'audio' | 'video' =
      slotType === 'live_video' || mimeType.startsWith('video/') ? 'video' : 'audio'
    const usageIntent: ClientMediaUsageIntent =
      body.usageIntent ||
      (slotType === 'character_voice'
        ? 'voice_clone'
        : slotType === 'live_video'
          ? 'live_intro'
          : 'reenactment_vo')
    const languageCode = resolveGoogleVoiceCloneLanguageCode(body.languageCode || payload.locale)

    const meta: ClientAssetSubmissionMetadata = {
      mediaKind,
      usageIntent,
      targetCharacterId: body.targetCharacterId?.trim() || null,
      targetCharacterName: body.targetCharacterName?.trim() || null,
      languageCode,
      consentAudioBlobUrl,
      extractedAudioUrl: null,
      referenceSliceWavUrl: null,
      durationSeconds: null,
      aspectOrientation: null,
      transcript: null,
      acousticVoiceDna: null,
      googleVoiceCloningKey: null,
      voiceCloneStatus: consentAudioBlobUrl ? 'tier2_dna_ready' : 'pending_consent',
      voiceCloneNote: null,
    }

    // Download uploaded media to extract clean narration stem, 15s WAV slice, Voice DNA, & optional Google Clone Key
    if (fileSizeBytes === 0 || fileSizeBytes <= MAX_SERVER_FETCH_BYTES) {
      try {
        const mediaRes = await fetch(blobUrl)
        if (mediaRes.ok) {
          const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer())
          if (mediaBuffer.length > 0 && mediaBuffer.length <= MAX_SERVER_FETCH_BYTES) {
            const safeSeg = slotId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60)
            const stamp = Date.now()

            let polishedMp3Buffer: Buffer | null = null
            let referenceSliceWavBuffer: Buffer | null = null

            try {
              const extracted = await extractPolishedSpeechAssetsFromMedia(mediaBuffer, mimeType)
              polishedMp3Buffer = extracted.polishedMp3Buffer
              referenceSliceWavBuffer = extracted.referenceSliceWavBuffer
              meta.durationSeconds = extracted.durationSeconds
              meta.aspectOrientation = extracted.aspectOrientation

              // Upload cleaned narration MP3 + 24kHz mono WAV slice to Vercel Blob in parallel
              const [mp3Blob, wavBlob] = await Promise.all([
                put(
                  `projects/${session.project_id}/client-continuity/audio/${safeSeg}-${stamp}-stem.mp3`,
                  polishedMp3Buffer,
                  { access: 'public', contentType: 'audio/mpeg' }
                ),
                put(
                  `projects/${session.project_id}/client-continuity/audio/${safeSeg}-${stamp}-ref24k.wav`,
                  referenceSliceWavBuffer,
                  { access: 'public', contentType: 'audio/wav' }
                ),
              ])
              meta.extractedAudioUrl = mp3Blob.url
              meta.referenceSliceWavUrl = wavBlob.url
            } catch (ffmpegErr) {
              console.warn(
                '[continuity media-finalize] FFmpeg extraction skipped/fallback:',
                ffmpegErr instanceof Error ? ffmpegErr.message : ffmpegErr
              )
              if (mediaKind === 'audio') {
                meta.extractedAudioUrl = blobUrl
              }
            }

            // Tier 2: Multimodal Acoustic Voice DNA + Verbatim Transcript (0 saved slots!)
            const analysisAudio = polishedMp3Buffer || (mediaKind === 'audio' ? mediaBuffer : null)
            const analysisMime = polishedMp3Buffer ? 'audio/mpeg' : mimeType
            if (analysisAudio && analysisAudio.length > 0) {
              try {
                const { dna, transcript } = await analyzeAudioToAcousticVoiceDna({
                  audioBuffer: analysisAudio,
                  mimeType: analysisMime,
                  speakerName: body.targetCharacterName || slotName,
                  languageCode,
                })
                meta.acousticVoiceDna = dna
                meta.transcript = transcript || null
                if (meta.voiceCloneStatus === 'pending_consent') {
                  meta.voiceCloneStatus = 'tier2_dna_ready'
                }
              } catch (dnaErr) {
                console.warn(
                  '[continuity media-finalize] Acoustic Voice DNA analysis skipped:',
                  dnaErr instanceof Error ? dnaErr.message : dnaErr
                )
              }
            }

            // Tier 1: Stateless Google Chirp 3 Instant Custom Voice (`voiceCloningKey`, 0 saved slots!)
            if (consentAudioBlobUrl && (referenceSliceWavBuffer || mediaKind === 'audio')) {
              try {
                const consentRes = await fetch(consentAudioBlobUrl)
                if (consentRes.ok) {
                  const consentBuffer = Buffer.from(await consentRes.arrayBuffer())
                  const cloneResult = await tryMintGoogleVoiceCloningKey({
                    referenceWavBuffer: referenceSliceWavBuffer || mediaBuffer,
                    consentAudioBuffer: consentBuffer,
                    localeOrLanguageCode: languageCode,
                  })
                  if (cloneResult.status === 'minted') {
                    meta.googleVoiceCloningKey = cloneResult.voiceCloningKey
                    meta.voiceCloneStatus = 'minted'
                    meta.voiceCloneNote = 'Google Chirp 3 Instant Custom Voice active (0 saved slots)'
                  } else {
                    meta.voiceCloneStatus = 'tier2_dna_ready'
                    meta.voiceCloneNote =
                      cloneResult.reason === 'billing_disabled' ||
                      cloneResult.reason === 'not_allowlisted'
                        ? 'Acoustic Voice DNA active now; raw voice + consent saved for 1-click Google Voice Clone retry.'
                        : cloneResult.detail.slice(0, 220)
                  }
                }
              } catch (cloneErr) {
                console.warn(
                  '[continuity media-finalize] Google voice clone fallback:',
                  cloneErr instanceof Error ? cloneErr.message : cloneErr
                )
                meta.voiceCloneStatus = 'tier2_dna_ready'
                meta.voiceCloneNote =
                  'Acoustic Voice DNA active now; raw voice + consent saved for 1-click Google Voice Clone retry.'
              }
            }
          }
        }
      } catch (procErr) {
        console.warn(
          '[continuity media-finalize] Post-processing warning (raw upload preserved):',
          procErr instanceof Error ? procErr.message : procErr
        )
      }
    } else {
      meta.voiceCloneNote =
        'Large video uploaded directly to storage; audio extraction can be triggered from Studio.'
    }

    const uploaderName =
      consent?.customer_name ||
      body.reviewerName?.trim().slice(0, 160) ||
      payload.lastReviewerName ||
      'Reviewer'

    const submission = await ClientAssetSubmission.create({
      collab_session_id: session.id,
      project_id: session.project_id,
      owner_user_id: session.owner_user_id,
      slot_id: slotId,
      slot_type: slotType,
      slot_name: slotName,
      customer_name: uploaderName,
      customer_email: consent?.customer_email || null,
      blob_url: blobUrl,
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
      caption,
      metadata: meta,
      quarantine_status: 'clean',
      quarantine_reason: null,
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
      const kindLabel =
        slotType === 'character_voice'
          ? 'Voice Sample'
          : slotType === 'live_video'
            ? 'Live Video Clip'
            : 'Audio Story'
      await notifyUser({
        userId: session.owner_user_id,
        projectId: session.project_id,
        type: 'client_assets_uploaded',
        title: `Continuity ${kindLabel} Uploaded: ${slotName}`,
        message: `${uploaderName} uploaded a ${kindLabel.toLowerCase()} for "${slotName}". Review and promote in Continuity Library.`,
        sendEmail: false,
        metadata: {
          projectId: session.project_id,
          submissionId: submission.id,
          slotId,
          slotType,
          source: 'continuity',
          brandName: payload.brandProfileSnapshot.brandName,
          openPath: `/dashboard/workflow/vision/${session.project_id}?openLibrary=1`,
        },
      })
    } catch (notifyErr) {
      console.warn('[continuity media-finalize] notify warning:', notifyErr)
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        slotId: submission.slot_id,
        slotType: submission.slot_type,
        slotName: submission.slot_name,
        blobUrl: submission.blob_url,
        mimeType: submission.mime_type,
        fileSizeBytes: submission.file_size_bytes,
        caption: submission.caption,
        metadata: submission.metadata,
        approvalStatus: submission.approval_status,
        createdAt: submission.created_at,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Media processing failed'
    console.error('[continuity media-finalize] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
