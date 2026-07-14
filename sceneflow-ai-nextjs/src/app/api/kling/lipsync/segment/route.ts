import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runKlingLipSync } from '@/lib/kling/klingDirectClient'
import { moderateKlingVideoBuffer } from '@/lib/moderation/klingSafetyGuard'
import { uploadToGCS, uploadVideo as uploadVideoToGCS } from '@/lib/storage/gcsAssets'
import { CreditService } from '@/services/CreditService'
import { getKlingCreditsForGeneration } from '@/lib/credits/creditCosts'
import { KLING_LIPSYNC_MAX_SEC, KLING_SINGLE_CLIP_MAX_SEC } from '@/lib/kling/types'
import { buildStitchJobSpec } from '@/lib/kling/buildStitchJobSpec'
import { triggerStitchRenderJob } from '@/lib/kling/triggerStitchRender'
import { getJobStatusAsync } from '@/lib/render/jobStatusStore'
import { getSignedDownloadUrl } from '@/lib/gcs/renderStorage'
import {
  cleanupTempPaths,
  downloadToTemp,
  splitAudioFileToChunks,
} from '@/lib/kling/lipsyncChunk'
import { readFile } from 'fs/promises'

export const runtime = 'nodejs'
export const maxDuration = 300

const SINGLE_LIPSYNC_MAX =
  Number(process.env.KLING_LIPSYNC_CHUNK_SEC) || KLING_SINGLE_CLIP_MAX_SEC

interface SegmentLipSyncRequest {
  videoUrl: string
  audioUrl: string
  projectId?: string
  sceneId?: string
  segmentId?: string
  language?: string
  audioDurationSeconds?: number
}

async function pollStitchJob(jobId: string, sceneId: string): Promise<string> {
  const maxAttempts = 120
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const status = await getJobStatusAsync(jobId)
    if (!status) continue
    if (status.status === 'COMPLETED' && status.downloadUrl) {
      let url = status.downloadUrl
      if (url.startsWith('gs://')) {
        const signed = await getSignedDownloadUrl(jobId)
        if (signed) url = signed
      }
      return url
    }
    if (status.status === 'FAILED') {
      throw new Error(status.error || 'Lip-sync stitch failed')
    }
  }
  throw new Error('Lip-sync stitch timed out')
}

async function lipsyncAndUpload(
  videoUrl: string,
  audioUrl: string,
  meta: {
    projectId?: string
    sceneId?: string
    segmentId?: string
    language?: string
    durationSeconds: number
    userId: string
    suffix: string
  }
): Promise<string> {
  const videoBuffer = await runKlingLipSync(videoUrl, audioUrl)
  await moderateKlingVideoBuffer(videoBuffer, {
    userId: meta.userId,
    projectId: meta.projectId,
    sceneId: meta.sceneId,
    segmentId: meta.segmentId,
  })
  const assetUrl = await uploadVideoToGCS(
    videoBuffer,
    `lipsync/${meta.segmentId || 'clip'}-${meta.language || 'lang'}-${meta.suffix}-${Date.now()}.mp4`,
    meta.projectId || 'default'
  )
  const credits = getKlingCreditsForGeneration({
    durationSeconds: meta.durationSeconds,
    quality: 'pro',
    operation: 'lipsync',
  })
  await CreditService.charge(meta.userId, credits, 'ai_usage', meta.projectId, {
    operation: 'kling_lipsync_segment',
    segmentId: meta.segmentId,
    language: meta.language,
  })
  return assetUrl
}

export async function POST(req: NextRequest) {
  const tempPaths: string[] = []
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as SegmentLipSyncRequest
    const {
      videoUrl,
      audioUrl,
      projectId,
      sceneId,
      segmentId,
      language,
      audioDurationSeconds,
    } = body

    if (!videoUrl?.trim() || !audioUrl?.trim()) {
      return NextResponse.json(
        { error: 'videoUrl and audioUrl are required' },
        { status: 400 }
      )
    }

    const duration = Math.max(
      1,
      audioDurationSeconds ?? SINGLE_LIPSYNC_MAX
    )
    const userId = String(session.user.id)
    const callbackBase =
      process.env.KLING_WEBHOOK_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://sceneflowai.studio'

    if (duration <= SINGLE_LIPSYNC_MAX) {
      const assetUrl = await lipsyncAndUpload(videoUrl.trim(), audioUrl.trim(), {
        projectId,
        sceneId,
        segmentId,
        language,
        durationSeconds: duration,
        userId,
        suffix: 'single',
      })
      return NextResponse.json({ success: true, assetUrl, segmentId, language, chunked: false })
    }

    if (duration > KLING_LIPSYNC_MAX_SEC) {
      return NextResponse.json(
        {
          error: `Dialogue exceeds ${KLING_LIPSYNC_MAX_SEC}s Kling lip-sync limit for this beat`,
        },
        { status: 400 }
      )
    }

    const audioPath = await downloadToTemp(audioUrl.trim(), 'mp3')
    tempPaths.push(audioPath)
    const chunkPaths = await splitAudioFileToChunks(audioPath, SINGLE_LIPSYNC_MAX)
    tempPaths.push(...chunkPaths)

    const clipUrls: string[] = []
    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkPath = chunkPaths[i]!
      const chunkBuf = await readFile(chunkPath)
      const chunkUpload = await uploadToGCS(chunkBuf, {
        projectId: projectId || 'default',
        category: 'audio',
        subcategory: 'lipsync-chunks',
        filename: `${segmentId || 'seg'}-chunk-${i}-${Date.now()}.mp3`,
        contentType: 'audio/mpeg',
      })
      const chunkAudioUrl = chunkUpload.url
      const chunkDur = Math.min(SINGLE_LIPSYNC_MAX, duration - i * SINGLE_LIPSYNC_MAX)
      const url = await lipsyncAndUpload(videoUrl.trim(), chunkAudioUrl, {
        projectId,
        sceneId,
        segmentId,
        language,
        durationSeconds: chunkDur,
        userId,
        suffix: `chunk-${i}`,
      })
      clipUrls.push(url)
    }

    if (clipUrls.length === 1) {
      return NextResponse.json({
        success: true,
        assetUrl: clipUrls[0],
        segmentId,
        language,
        chunked: true,
      })
    }

    const stitchSceneId = sceneId || segmentId || 'lipsync'
    const jobSpec = buildStitchJobSpec({
      projectId: projectId || 'default',
      sceneId: stitchSceneId,
      clipUrls,
      callbackUrl: `${callbackBase}/api/kling/stitch/callback`,
    })
    await triggerStitchRenderJob(jobSpec)
    const stitchedUrl = await pollStitchJob(jobSpec.jobId, stitchSceneId)

    return NextResponse.json({
      success: true,
      assetUrl: stitchedUrl,
      segmentId,
      language,
      chunked: true,
      stitchJobId: jobSpec.jobId,
    })
  } catch (error) {
    console.error('[Kling LipSync Segment] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Segment lip-sync failed' },
      { status: 500 }
    )
  } finally {
    await cleanupTempPaths(tempPaths)
  }
}
