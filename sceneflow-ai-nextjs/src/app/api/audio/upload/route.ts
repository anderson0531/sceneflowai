import { NextRequest, NextResponse } from 'next/server'
import { uploadAudioToBlob } from '@/lib/storage/uploadAudioToBlob'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = (formData.get('projectId') as string) || 'default'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[Audio Upload] Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type)

    const result = await uploadAudioToBlob(file, projectId)

    console.log('[Audio Upload] File uploaded successfully:', result.url)

    return NextResponse.json({
      success: true,
      url: result.url,
      audioUrl: result.audioUrl,
      filename: result.filename,
      size: result.size,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Audio Upload] Error:', message)
    return NextResponse.json(
      {
        error: message.includes('Invalid') || message.includes('too large') ? message : 'Audio upload failed',
        details: message,
      },
      { status: message.includes('Invalid') || message.includes('too large') ? 400 : 500 }
    )
  }
}
