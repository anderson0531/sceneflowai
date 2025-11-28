import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToGCS } from '@/lib/storage/gcs'
import { analyzeCharacterImage } from '@/lib/imagen/visionAnalyzer'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { blobUrl, characterName } = await req.json()
    
    if (!blobUrl || !characterName) {
      return NextResponse.json({ error: 'Missing blobUrl or characterName' }, { status: 400 })
    }
    
    console.log('[Process Upload] Processing upload for', characterName)
    
    // Fetch from Vercel Blob and upload to GCS (for Imagen API)
    const imageResponse = await fetch(blobUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image from Vercel Blob')
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const gcsUrl = await uploadImageToGCS(imageBuffer, characterName)
    
    console.log('[Process Upload] GCS URL:', gcsUrl)
    
    // AUTO-ANALYZE: Extract detailed description using Gemini Vision
    let visionDescription = null
    try {
      visionDescription = await analyzeCharacterImage(blobUrl, characterName)
      console.log(`[Process Upload] Auto-analyzed with Gemini Vision`)
    } catch (error) {
      console.error('[Process Upload] Vision analysis failed:', error)
      // Continue without analysis - not critical
    }
    
    return NextResponse.json({ 
      success: true,
      gcsUrl,
      visionDescription
    })
  } catch (error: any) {
    console.error('[Process Upload] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
