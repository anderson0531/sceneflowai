import { NextRequest, NextResponse } from 'next/server'
import { uploadToGCS } from '@/lib/storage/gcsAssets'
import { uploadImageToGCS } from '@/lib/storage/gcs'
import { analyzeCharacterImage } from '@/lib/imagen/visionAnalyzer'

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
    
    console.log('[Upload Reference] Starting upload for', characterName)
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extension = file.name.split('.').pop() || 'jpg'
    
    // Step 1: Upload to GCS Assets bucket (for UI display/thumbnails)
    const result = await uploadToGCS(buffer, {
      projectId,
      category: 'images',
      subcategory: 'characters',
      filename: `${characterName.replace(/\s+/g, '-')}-${Date.now()}.${extension}`,
      contentType: file.type || 'image/jpeg',
    })
    
    console.log('[Upload Reference] GCS Assets URL:', result.url)
    
    // Step 2: Also upload to character-specific bucket for Imagen API (gs:// URL needed)
    const gcsUrl = await uploadImageToGCS(buffer, characterName)
    
    console.log('[Upload Reference] GCS URI:', gcsUrl)
    
    // AUTO-ANALYZE: Extract detailed description using Gemini Vision
    let visionDescription = null
    try {
      visionDescription = await analyzeCharacterImage(result.url, characterName)
      console.log(`[Upload Reference] Auto-analyzed with Gemini Vision`)
    } catch (error) {
      console.error('[Upload Reference] Vision analysis failed:', error)
      // Continue without analysis - not critical
    }
    
    return NextResponse.json({ 
      success: true, 
      url: result.url,  // Signed URL for UI
      gcsUrl: gcsUrl,   // GCS URI for Imagen API
      visionDescription // Include in response for client to save
    })
  } catch (error: any) {
    console.error('[Upload Reference] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

