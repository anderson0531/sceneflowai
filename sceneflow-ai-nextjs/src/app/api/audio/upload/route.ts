import { NextRequest, NextResponse } from 'next/server'
import { uploadToGCS } from '@/lib/storage/gcsAssets'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string || 'default'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type', 
        details: `Allowed types: mp3, wav, ogg, webm. Received: ${file.type}` 
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large', 
        details: `Maximum size: 10MB. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
      }, { status: 400 })
    }

    console.log('[Audio Upload] Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop() || 'mp3'
    const filename = `${timestamp}-${randomId}.${extension}`

    // Upload to GCS
    const result = await uploadToGCS(buffer, {
      projectId,
      category: 'audio',
      subcategory: 'sfx',
      filename,
      contentType: file.type,
    })

    console.log('[Audio Upload] File uploaded successfully:', result.url)

    return NextResponse.json({ 
      success: true, 
      audioUrl: result.url,
      filename: file.name,
      size: file.size
    })
  } catch (error: any) {
    console.error('[Audio Upload] Error:', error?.message || String(error))
    return NextResponse.json({ 
      error: 'Audio upload failed', 
      details: error?.message || String(error) 
    }, { status: 500 })
  }
}

