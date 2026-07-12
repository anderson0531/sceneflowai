import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runKlingLipSync } from '@/lib/kling/klingDirectClient'
import { moderateKlingVideoBuffer } from '@/lib/moderation/klingSafetyGuard'
import { uploadVideo as uploadVideoToGCS } from '@/lib/storage/gcsAssets'
import { CreditService } from '@/services/CreditService'
import { getKlingCreditsForGeneration } from '@/lib/credits/creditCosts'

export const runtime = 'nodejs'
export const maxDuration = 300

interface LipSyncRequest {
  videoUrl: string
  audioUrl: string
  projectId?: string
  sceneId?: string
  segmentId?: string
  language?: string
  durationSeconds?: number
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as LipSyncRequest
    const { videoUrl, audioUrl, projectId, sceneId, segmentId, language, durationSeconds } = body

    if (!videoUrl?.trim() || !audioUrl?.trim()) {
      return NextResponse.json(
        { error: 'videoUrl and audioUrl are required' },
        { status: 400 }
      )
    }

    const videoBuffer = await runKlingLipSync(videoUrl.trim(), audioUrl.trim())

    await moderateKlingVideoBuffer(videoBuffer, {
      userId: String(session.user.id),
      projectId,
      sceneId,
      segmentId,
    })

    const assetUrl = await uploadVideoToGCS(
      videoBuffer,
      `lipsync/${segmentId || 'clip'}-${language || 'lang'}-${Date.now()}.mp4`,
      projectId || 'default'
    )

    const credits = getKlingCreditsForGeneration({
      durationSeconds: durationSeconds ?? 10,
      quality: 'pro',
      operation: 'lipsync',
    })
    await CreditService.charge(String(session.user.id), credits, 'ai_usage', projectId, {
      operation: 'kling_lipsync',
      segmentId,
      language,
    })

    return NextResponse.json({
      success: true,
      assetUrl,
      language,
      segmentId,
    })
  } catch (error) {
    console.error('[Kling LipSync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lip-sync failed' },
      { status: 500 }
    )
  }
}
