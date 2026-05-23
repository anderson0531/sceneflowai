import { NextRequest, NextResponse } from 'next/server'
import { uploadFileToGCS } from '@/lib/storage/gcsAssets'
import { uploadAudioToBlob, useGcsForAudioUpload } from '@/lib/storage/uploadAudioToBlob'
import { moderateUpload, createUploadBlockedResponse, getUserModerationContext } from '@/lib/moderation'

export const runtime = 'nodejs'

/**
 * Audio Upload API
 *
 * Default (ASSET_AUDIO_STORAGE unset or vercel-blob): Vercel Blob via shared helper.
 * Legacy (ASSET_AUDIO_STORAGE=gcs): Google Cloud Storage + Hive moderation.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = (formData.get('userId') as string) || 'anonymous'
    const projectId = (formData.get('projectId') as string) || 'default'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!useGcsForAudioUpload()) {
      console.log('[Audio Upload] Using Vercel Blob (ASSET_AUDIO_STORAGE != gcs)')
      const result = await uploadAudioToBlob(file, projectId)
      return NextResponse.json({
        success: true,
        url: result.url,
        audioUrl: result.audioUrl,
      })
    }

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a']
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed types: audio files` },
        { status: 400 }
      )
    }

    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 25MB` },
        { status: 400 }
      )
    }

    const result = await uploadFileToGCS(file, {
      projectId,
      category: 'audio',
      subcategory: 'sfx',
    })

    const moderationContext = await getUserModerationContext(userId, projectId)
    const moderationResult = await moderateUpload(result.url, file.type, moderationContext)

    if (!moderationResult.allowed) {
      console.log('[Audio Upload] Content blocked, deleting from GCS:', result.gcsPath)
      return createUploadBlockedResponse(moderationResult.result)
    }

    console.log('[Audio Upload] Uploaded and moderated (GCS):', result.url)

    return NextResponse.json({
      success: true,
      url: result.url,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    console.error('[Audio Upload] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
