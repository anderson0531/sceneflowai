import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = ((formData.get('projectId') as string | null) || '').trim()

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: MP4, WEBM, MOV, M4V.' },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2GB.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4'
    const filename = `premiere/uploads/${projectId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({
      success: true,
      projectId,
      url: blob.url,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    })
  } catch (error: any) {
    console.error('[Premiere Upload] Error:', error?.message || String(error))
    return NextResponse.json(
      { error: error?.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
