import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { createUploadSignedUrl } from '@/services/export/ExportStorageService'

const UploadSchema = z.object({
  stage: z.enum(['raw', 'output']).default('raw'),
  filename: z.string().min(1),
  contentType: z.string().default('application/octet-stream'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const payload = UploadSchema.parse(body)

    const signed = await createUploadSignedUrl(payload.stage, payload.filename, payload.contentType)
    return NextResponse.json(signed)
  } catch (error) {
    console.error('[ExportUploadUrl] Failed to create signed URL', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
