import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  buildFreesoundCreditLine,
  freesoundGetSound,
  freesoundFetchPreviewMp3,
  getFreesoundApiKey,
} from '@/lib/freesound/server'
import { uploadToGCS } from '@/lib/storage/gcsAssets'
import { moderateUpload, createUploadBlockedResponse, getUserModerationContext } from '@/lib/moderation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!getFreesoundApiKey()) {
      return NextResponse.json(
        { error: 'Freesound is not configured (missing FREESOUND_API_KEY).' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const soundId = typeof body.soundId === 'number' ? body.soundId : parseInt(String(body.soundId), 10)
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''

    if (!Number.isFinite(soundId) || soundId < 1) {
      return NextResponse.json({ error: 'Invalid soundId' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const detail = await freesoundGetSound(soundId)
    const { buffer } = await freesoundFetchPreviewMp3(soundId)

    const filename = `freesound-${soundId}-${Date.now()}.mp3`
    const result = await uploadToGCS(buffer, {
      projectId,
      category: 'audio',
      subcategory: 'sfx',
      filename,
      contentType: 'audio/mpeg',
      metadata: {
        source: 'freesound',
        freesoundId: String(soundId),
      },
    })

    const moderationContext = await getUserModerationContext(userId, projectId)
    const moderationResult = await moderateUpload(result.url, 'audio/mpeg', moderationContext)
    if (!moderationResult.allowed) {
      return createUploadBlockedResponse(moderationResult.result)
    }

    const creditLine = buildFreesoundCreditLine(detail)
    const attribution = {
      provider: 'freesound' as const,
      soundId: detail.id,
      name: detail.name,
      username: detail.username,
      license: detail.license,
      creditLine,
    }

    return NextResponse.json({
      url: result.url,
      duration: typeof detail.duration === 'number' ? detail.duration : undefined,
      attribution,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Import failed'
    console.error('[freesound/import]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
