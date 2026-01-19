import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

/**
 * Upload a frame/image for demo mode.
 * Supports both multipart form data and base64 JSON.
 * Stores in Vercel Blob (bypassing GCS).
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    
    let buffer: Buffer
    let filename: string
    let subcategory: string = 'frames'
    let prefix: string | undefined
    let mimeType: string = 'image/jpeg'

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

      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      filename = file.name
      subcategory = category || 'frames'
      prefix = segmentId ? `${segmentId}-${frameType || 'frame'}` : undefined
      mimeType = file.type

    } else {
      // Handle JSON with base64 image
      const body = await req.json()
      const { image, filename: providedFilename, segmentId, frameType, subcategory: cat } = body

      if (!image) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
      }

      // Parse base64 data URL
      const matches = image.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        buffer = Buffer.from(matches[2], 'base64')
      } else {
        buffer = Buffer.from(image, 'base64')
      }
      
      filename = providedFilename || 'frame.jpg'
      subcategory = cat || 'frames'
      prefix = segmentId ? `${segmentId}-${frameType || 'frame'}` : undefined
    }

    // Build blob path
    const ext = mimeType.split('/')[1] || 'jpg'
    const blobPath = prefix 
      ? `${subcategory}/${prefix}-${Date.now()}.${ext}`
      : `${subcategory}/${Date.now()}.${ext}`

    // Upload to Vercel Blob
    const blob = await put(blobPath, buffer, {
      access: 'public',
      contentType: mimeType,
    })

    console.log(`[Upload Image] Uploaded to Vercel Blob: ${blob.url}`)

    return NextResponse.json({
      success: true,
      url: blob.url,
      size: buffer.length,
      filename: filename,
    })
  } catch (error: any) {
    console.error('[Upload Image] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
