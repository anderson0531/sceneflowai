import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

/**
 * Simple frame upload endpoint for client-side video frame extraction.
 * Unlike /api/scene/upload-image, this:
 * - Accepts base64 images from client-side canvas extraction
 * - Does NOT require database updates (frames are used for I2V continuity only)
 * - Does NOT require sharp for image processing (client already extracts as JPEG)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, filename } = body

    if (!image || !filename) {
      console.error('[Upload Frame] Missing required fields:', { hasImage: !!image, hasFilename: !!filename })
      return NextResponse.json({ error: 'Missing required fields: image and filename' }, { status: 400 })
    }

    // Parse base64 image - handle both with and without data URL prefix
    let base64Data = image
    let contentType = 'image/jpeg'
    
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        contentType = matches[1]
        base64Data = matches[2]
      } else {
        console.error('[Upload Frame] Invalid data URL format')
        return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 })
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    if (buffer.length === 0) {
      console.error('[Upload Frame] Empty buffer after base64 decode')
      return NextResponse.json({ error: 'Invalid image data - empty buffer' }, { status: 400 })
    }

    console.log(`[Upload Frame] Uploading frame: ${filename}, size: ${Math.round(buffer.length / 1024)}KB`)

    // Upload to Vercel Blob - use filename directly (should include path like segments/seg_xxx/last_frame.jpg)
    // addRandomSuffix ensures unique filenames even if the same segment frame is re-extracted
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    })

    console.log(`[Upload Frame] Upload successful: ${blob.url.substring(0, 60)}...`)

    return NextResponse.json({ 
      success: true, 
      url: blob.url 
    })
  } catch (error: any) {
    console.error('[Upload Frame] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: error.message || 'Upload failed' }, 
      { status: 500 }
    )
  }
}
