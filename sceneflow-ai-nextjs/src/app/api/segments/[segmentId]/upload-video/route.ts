import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

/**
 * Upload a video segment for demo mode.
 * Stores in Vercel Blob storage (bypassing GCS).
 * No file size limits.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const { segmentId } = await params
    
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      )
    }

    console.log(`[Upload Video] Uploading ${file.name} (${Math.round(file.size / 1024 / 1024)}MB) for segment ${segmentId}`)

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine file extension from content type
    const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4'
    const filename = `segments/${segmentId}/video-${Date.now()}.${ext}`

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: file.type,
    })

    console.log(`[Upload Video] Success: ${blob.url}`)

    return NextResponse.json({
      success: true,
      url: blob.url,
      assetUrl: blob.url,
      assetType: 'video',
      status: 'UPLOADED',
      size: file.size,
      filename: file.name,
    })
  } catch (error: any) {
    console.error('[Upload Video] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    maxVideoSize: 'unlimited',
    supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime'],
  })
}
