import { NextRequest, NextResponse } from 'next/server'
import { setJobStatus, updateJobStatus } from '@/lib/render/jobStatusStore'
import { getSignedDownloadUrl } from '@/lib/gcs/renderStorage'
import { inngest } from '@/inngest/client'

interface StitchCallbackPayload {
  jobId: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  outputUrl?: string
  error?: string
}

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const payload: StitchCallbackPayload = await request.json()

    if (!payload.jobId || !payload.status) {
      return NextResponse.json({ error: 'jobId and status are required' }, { status: 400 })
    }

    let downloadUrl = payload.outputUrl
    if (downloadUrl?.startsWith('gs://')) {
      try {
        const signedUrl = await getSignedDownloadUrl(payload.jobId)
        if (signedUrl) downloadUrl = signedUrl
      } catch (e) {
        console.warn('[KlingStitchCallback] Signed URL failed:', e)
      }
    }

    const existing = updateJobStatus(payload.jobId, {
      status: payload.status,
      progress: payload.progress,
      downloadUrl,
      error: payload.error,
    })

    if (!existing) {
      setJobStatus(payload.jobId, {
        status: payload.status,
        progress: payload.progress,
        downloadUrl,
        error: payload.error,
        createdAt: new Date().toISOString(),
      })
    }

    if (payload.status === 'COMPLETED' && downloadUrl) {
      try {
        await inngest.send({
          name: 'render/stitch.completed',
          data: {
            jobId: payload.jobId,
            outputUrl: downloadUrl,
            status: 'COMPLETED',
          },
        })
      } catch (e) {
        console.warn('[KlingStitchCallback] Inngest emit failed:', e)
      }
    } else if (payload.status === 'FAILED') {
      try {
        await inngest.send({
          name: 'render/stitch.completed',
          data: {
            jobId: payload.jobId,
            status: 'FAILED',
            error: payload.error,
          },
        })
      } catch (e) {
        console.warn('[KlingStitchCallback] Inngest emit failed:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[KlingStitchCallback] Error:', error)
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', handler: 'kling-stitch-callback' })
}
