import { NextRequest, NextResponse } from 'next/server'
import { uploadBase64ImageToGCS } from '@/lib/storage/gcsAssets'

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
    const { image, filename, projectId } = body

    if (!image || !filename) {
      console.error('[Upload Frame] Missing required fields:', { hasImage: !!image, hasFilename: !!filename })
      return NextResponse.json({ error: 'Missing required fields: image and filename' }, { status: 400 })
    }

    // Parse base64 image - handle both with and without data URL prefix
    let base64Data = image
    
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        base64Data = matches[2]
      } else {
        console.error('[Upload Frame] Invalid data URL format')
        return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 })
      }
    }

    // Validate base64 data
    const buffer = Buffer.from(base64Data, 'base64')
    if (buffer.length === 0) {
      console.error('[Upload Frame] Empty buffer after base64 decode')
      return NextResponse.json({ error: 'Invalid image data - empty buffer' }, { status: 400 })
    }

    console.log(`[Upload Frame] Uploading frame: ${filename}, size: ${Math.round(buffer.length / 1024)}KB`)

    // Upload to GCS - extract segment info from filename
    const result = await uploadBase64ImageToGCS(image, {
      projectId: projectId || 'default',
      category: 'images',
      subcategory: 'frames',
      filename: `${filename.replace(/\//g, '-')}-${Date.now()}.jpg`,
    })

    console.log(`[Upload Frame] Upload successful: ${result.url.substring(0, 60)}...`)

    return NextResponse.json({ 
      success: true, 
      url: result.url 
    })
  } catch (error: any) {
    console.error('[Upload Frame] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: error.message || 'Upload failed' }, 
      { status: 500 }
    )
  }
}
