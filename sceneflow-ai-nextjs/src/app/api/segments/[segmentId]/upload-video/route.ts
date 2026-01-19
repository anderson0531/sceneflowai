import { NextRequest, NextResponse } from 'next/server'
import { uploadVideoLocally, getFileSizeLimits } from '@/lib/storage/localAssets'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * Upload a video segment for demo mode.
 * Stores locally in public/demo-assets/videos/
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

    // Check file size before reading
    if (file.size > MAX_VIDEO_SIZE) {
      const sizeMB = Math.round(file.size / 1024 / 1024)
      const limitMB = MAX_VIDEO_SIZE / 1024 / 1024
      return NextResponse.json(
        { error: `Video size ${sizeMB}MB exceeds limit of ${limitMB}MB. Please compress or trim your video.` },
        { status: 413 }
      )
    }

    console.log(`[Upload Video] Uploading ${file.name} (${Math.round(file.size / 1024 / 1024)}MB) for segment ${segmentId}`)

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to local storage
    const result = await uploadVideoLocally(buffer, {
      filename: file.name,
      segmentId,
      prefix: `segment-${segmentId}`,
    })

    console.log(`[Upload Video] Success: ${result.url}`)

    return NextResponse.json({
      success: true,
      url: result.url,
      assetUrl: result.url,
      assetType: 'video',
      status: 'UPLOADED',
      size: result.size,
      filename: result.filename,
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
  const limits = getFileSizeLimits()
  return NextResponse.json({
    maxVideoSize: limits.video,
    maxVideoSizeMB: limits.video / 1024 / 1024,
    supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime'],
  })
}
