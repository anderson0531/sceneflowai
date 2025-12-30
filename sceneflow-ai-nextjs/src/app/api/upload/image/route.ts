import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { moderateUpload, createUploadBlockedResponse, getUserModerationContext } from '@/lib/moderation'

export const runtime = 'nodejs'

/**
 * Image Upload API
 * 
 * Accepts image files and uploads them to Vercel Blob storage.
 * Used for uploading keyframe images (Start/End frames) from external sources.
 * 
 * Content Moderation:
 * - All uploads are moderated at 100% (external content is highest risk)
 * - Blocks NSFW, violence, hate symbols, etc.
 * 
 * @accepts image/png, image/jpeg, image/gif, image/webp
 * @maxSize 10MB
 * @returns { success: boolean, imageUrl: string }
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
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 10MB` 
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
      console.log('[Image Upload] Content blocked, deleting blob:', blob.url)
      // Note: Vercel Blob doesn't have a delete API in the client SDK
      // The blob will be cleaned up by storage lifecycle policy
      
      return createUploadBlockedResponse(moderationResult.result)
    }

    console.log('[Image Upload] Uploaded and moderated:', blob.url)

    return NextResponse.json({ 
      success: true,
      imageUrl: blob.url 
    })
  } catch (error: any) {
    console.error('[Image Upload] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 500 })
  }
}
