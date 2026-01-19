import { NextRequest, NextResponse } from 'next/server'
import { uploadVideoLocally } from '@/lib/storage/localAssets'

/**
 * Upload a video segment for demo mode.
 * Stores locally in public/demo-assets/videos/
 * No file size limits for local storage.
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
  return NextResponse.json({
    maxVideoSize: 'unlimited',
    supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime'],
  })
}
