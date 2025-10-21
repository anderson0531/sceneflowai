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
    
    console.log('[Upload Reference] Starting sequential upload for', characterName)
    
    // Step 1: Upload to Vercel Blob first (for UI display/thumbnails)
    const blobResult = await put(
      `character-refs/${projectId}/${characterName}-${Date.now()}.${file.name.split('.').pop()}`,
      file,
      { access: 'public' }
    )
    
    console.log('[Upload Reference] Vercel Blob URL:', blobResult.url)
    
    // Step 2: Fetch from Vercel Blob and upload to GCS (for Imagen API)
    // This avoids hitting Vercel's function payload limit by splitting the operations
    const imageResponse = await fetch(blobResult.url)
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image from Vercel Blob')
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const gcsUrl = await uploadImageToGCS(imageBuffer, characterName)
    
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

