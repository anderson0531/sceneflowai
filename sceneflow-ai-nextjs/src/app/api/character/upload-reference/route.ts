import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

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
    
    // Upload to Vercel Blob
    const blob = await put(
      `character-refs/${projectId}/${characterName}-${Date.now()}.${file.name.split('.').pop()}`,
      file,
      { access: 'public' }
    )
    
    console.log('[Upload Reference] Uploaded:', blob.url)
    
    return NextResponse.json({ 
      success: true, 
      url: blob.url 
    })
  } catch (error: any) {
    console.error('[Upload Reference] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

