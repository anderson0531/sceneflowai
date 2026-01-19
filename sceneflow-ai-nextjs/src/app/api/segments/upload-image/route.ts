import { NextRequest, NextResponse } from 'next/server'
import { uploadImageLocally, uploadBase64ImageLocally } from '@/lib/storage/localAssets'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Upload a frame/image for demo mode.
 * Supports both multipart form data and base64 JSON.
 * Stores locally in public/demo-assets/
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    
    let buffer: Buffer
    let filename: string
    let subcategory: 'scenes' | 'frames' = 'frames'
    let prefix: string | undefined

    if (contentType.includes('multipart/form-data')) {
      // Handle form data upload
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const segmentId = formData.get('segmentId') as string | null
      const frameType = formData.get('frameType') as string | null
      const category = formData.get('subcategory') as string | null

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
      }

      if (file.size > MAX_IMAGE_SIZE) {
        const sizeMB = Math.round(file.size / 1024 / 1024)
        return NextResponse.json(
          { error: `Image size ${sizeMB}MB exceeds limit of 10MB` },
          { status: 413 }
        )
      }

      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      filename = file.name
      subcategory = (category as any) || 'frames'
      prefix = segmentId ? `${segmentId}-${frameType || 'frame'}` : undefined

    } else {
      // Handle JSON with base64 image
      const body = await req.json()
      const { image, filename: providedFilename, segmentId, frameType, subcategory: cat } = body

      if (!image) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
      }

      const result = await uploadBase64ImageLocally(image, {
        filename: providedFilename || 'frame.jpg',
        subcategory: cat || 'frames',
        prefix: segmentId ? `${segmentId}-${frameType || 'frame'}` : undefined,
      })

      return NextResponse.json({
        success: true,
        url: result.url,
        size: result.size,
        filename: result.filename,
      })
    }

    // Upload buffer to local storage
    const result = await uploadImageLocally(buffer, {
      filename,
      subcategory,
      prefix,
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      size: result.size,
      filename: result.filename,
    })
  } catch (error: any) {
    console.error('[Upload Image] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
