import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const projectId = formData.get('projectId')?.toString() || 'unknown'
    const language = formData.get('language')?.toString() || 'unknown'

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const fileName = `publish/mla/${projectId}/${language}-${Date.now()}.mp3`
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: 'audio/mpeg',
    })

    return NextResponse.json({ success: true, url: blob.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[Audio Upload]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
