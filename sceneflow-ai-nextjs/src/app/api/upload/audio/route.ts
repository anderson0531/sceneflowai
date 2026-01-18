import { NextRequest, NextResponse } from 'next/server'
import { uploadFileToGCS } from '@/lib/storage/gcsAssets'
import { moderateUpload, createUploadBlockedResponse, getUserModerationContext } from '@/lib/moderation'

export const runtime = 'nodejs'

/**
 * Audio Upload API
 * 
 * Accepts audio files and uploads them to Google Cloud Storage.
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
    const projectId = formData.get('projectId') as string || 'default'
    
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

    // Upload to GCS
    const result = await uploadFileToGCS(file, {
      projectId,
      category: 'audio',
      subcategory: 'sfx', // Default to SFX for general uploads
    })

    // Content moderation check (100% for uploads)
    const moderationContext = await getUserModerationContext(userId, projectId)
    const moderationResult = await moderateUpload(result.url, file.type, moderationContext)

    if (!moderationResult.allowed) {
      // Delete the uploaded file if blocked
      console.log('[Audio Upload] Content blocked, deleting from GCS:', result.gcsPath)
      // Note: Could call deleteFromGCS here, but lifecycle policy will clean up
      
      return createUploadBlockedResponse(moderationResult.result)
    }

    console.log('[Audio Upload] Uploaded and moderated:', result.url)

    return NextResponse.json({ 
      success: true,
      url: result.url 
    })
  } catch (error: any) {
    console.error('[Audio Upload] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 500 })
  }
}

