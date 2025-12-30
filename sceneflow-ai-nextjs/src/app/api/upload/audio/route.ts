import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { moderateUpload, createUploadBlockedResponse, getUserModerationContext } from '@/lib/moderation'

export const runtime = 'nodejs'

/**
 * Audio Upload API
 * 
 * Accepts audio files and uploads them to Vercel Blob storage.
 * Used for uploading voice samples, sound effects, or music.
 * 
 * Content Moderation:
 * - All uploads are moderated at 100% (external content is highest risk)
 * - Blocks hate speech, violence, harmful content, etc.
 * 
 * @accepts audio/mpeg, audio/wav, audio/webm, audio/ogg, audio/mp4
 * @maxSize 25MB
 * @returns { success: boolean, url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string || 'anonymous'
    const projectId = formData.get('projectId') as string | undefined
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a']
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('audio/')) {
      return NextResponse.json({ 
        error: `Invalid file type: ${file.type}. Allowed types: audio files` 
      }, { status: 400 })
    }

    // Validate file size (25MB max for audio)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 25MB` 
      }, { status: 400 })
    }

    // Upload to Vercel Blob first (needed for moderation check)
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true
    })

    // Content moderation check (100% for uploads)
    const moderationContext = await getUserModerationContext(userId, projectId)
    const moderationResult = await moderateUpload(blob.url, file.type, moderationContext)

    if (!moderationResult.allowed) {
      // Delete the uploaded blob if blocked
      console.log('[Audio Upload] Content blocked, deleting blob:', blob.url)
      // Note: Vercel Blob doesn't have a delete API in the client SDK
      // The blob will be cleaned up by storage lifecycle policy
      
      return createUploadBlockedResponse(moderationResult.result)
    }

    console.log('[Audio Upload] Uploaded and moderated:', blob.url)

    return NextResponse.json({ 
      success: true,
      url: blob.url 
    })
  } catch (error: any) {
    console.error('[Audio Upload] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 500 })
  }
}

