import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { resolveActiveContinuitySession } from '@/lib/continuity/continuityPortalService'
import { getLatestCustomerConsent } from '@/lib/producer/producerProfileService'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'

export const runtime = 'nodejs'
export const maxDuration = 30

type RouteCtx = { params: Promise<{ token: string }> }

const ALLOWED_MEDIA_CONTENT_TYPES = [
  // Audio formats (browser MediaRecorder + mobile voice memos + studio files)
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/webm',
  'audio/ogg',
  // Video formats (iPhone MOV, Android MP4, webcam WebM, MKV)
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/x-m4v',
]

/**
 * Generates signed Vercel Blob direct-upload tokens for Continuity client
 * voice samples, spoken consent recordings, live video intros, and audio stories.
 * Bypasses Vercel's 4.5MB serverless body limit (supports up to 500MB video clips).
 */
export async function POST(req: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  try {
    const { token } = await ctx.params
    await ensureProducerPlatformSchema()

    const resolved = await resolveActiveContinuitySession(token)
    if (!resolved) {
      return NextResponse.json(
        { error: 'Continuity link not found or expired' },
        { status: 404 }
      )
    }

    const { session, payload } = resolved
    const allowVoice = payload.allowVoiceCapture !== false
    const allowVideo = Boolean(payload.allowVideoClips)
    if (!allowVoice && !allowVideo) {
      return NextResponse.json(
        { error: 'Voice and video uploads are disabled on this continuity link' },
        { status: 403 }
      )
    }

    const consent = await getLatestCustomerConsent(session.id)
    if (payload.clientMode && !consent) {
      return NextResponse.json(
        { error: 'CONSENT_REQUIRED: Customer media rights consent is required before uploading media' },
        { status: 403 }
      )
    }

    const body = (await req.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let kind: 'audio' | 'video' = 'audio'
        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload) as { mediaKind?: string }
            if (parsed.mediaKind === 'video') kind = 'video'
          } catch {
            // default to audio
          }
        }
        if (kind === 'video' && !allowVideo) {
          throw new Error('Live video uploads are disabled on this continuity link')
        }
        if (kind === 'audio' && !allowVoice && !allowVideo) {
          throw new Error('Audio uploads are disabled on this continuity link')
        }

        const safePath = pathname.replace(/[^a-zA-Z0-9._/-]/g, '-')
        console.log('[Continuity Media Upload URL] Signing token for:', safePath, 'kind:', kind)

        return {
          allowedContentTypes: ALLOWED_MEDIA_CONTENT_TYPES,
          maximumSizeInBytes: kind === 'video' ? 500 * 1024 * 1024 : 100 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            sessionId: session.id,
            projectId: session.project_id,
            mediaKind: kind,
          }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log(
          '[Continuity Media Upload URL] Completed:',
          blob.url,
          'contentType:',
          blob.contentType
        )
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Media upload authorization failed'
    console.error('[Continuity Media Upload URL] Error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
