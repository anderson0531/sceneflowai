import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { uploadImageToGCS } from '@/lib/storage/gcs'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const characterName = formData.get('characterName') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    if (!projectId || !characterName) {
      return NextResponse.json({ error: 'Missing projectId or characterName' }, { status: 400 })
    }
    
    // Convert file to buffer for GCS upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log('[Upload Reference] Starting dual upload for', characterName)
    
    // Upload to both storage systems in parallel
    const [blobResult, gcsUrl] = await Promise.all([
      // 1. Upload to Vercel Blob (for UI display/thumbnails)
      put(
        `character-refs/${projectId}/${characterName}-${Date.now()}.${file.name.split('.').pop()}`,
        file,
        { access: 'public' }
      ),
      // 2. Upload to Google Cloud Storage (for Imagen API)
      uploadImageToGCS(buffer, characterName)
    ])
    
    console.log('[Upload Reference] Vercel Blob URL:', blobResult.url)
    console.log('[Upload Reference] GCS URL:', gcsUrl)
    
    return NextResponse.json({ 
      success: true, 
      url: blobResult.url,  // Vercel Blob URL for UI
      gcsUrl: gcsUrl  // GCS URL for Imagen API
    })
  } catch (error: any) {
    console.error('[Upload Reference] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

