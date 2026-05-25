import { NextRequest, NextResponse } from 'next/server'
import {
  uploadReferenceLibraryBuffer,
  useGcsForReferenceLibraryImages,
} from '@/lib/storage/referenceLibraryStorage'
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
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `${characterName.replace(/\s+/g, '-')}-${Date.now()}.${extension}`
    const contentType = file.type || 'image/jpeg'
    
    const url = await uploadReferenceLibraryBuffer(
      buffer,
      filename,
      contentType,
      projectId
    )
    
    console.log('[Upload Reference] Storage URL:', url)
    
    let gcsUrl: string | undefined
    if (useGcsForReferenceLibraryImages()) {
      gcsUrl = await uploadImageToGCS(buffer, characterName)
      console.log('[Upload Reference] GCS URI:', gcsUrl)
    }
    
    let visionDescription = null
    try {
      visionDescription = await analyzeCharacterImage(url, characterName)
      console.log('[Upload Reference] Auto-analyzed with Gemini Vision')
    } catch (error) {
      console.error('[Upload Reference] Vision analysis failed:', error)
    }
    
    return NextResponse.json({ 
      success: true, 
      url,
      gcsUrl,
      visionDescription
    })
  } catch (error: any) {
    console.error('[Upload Reference] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
