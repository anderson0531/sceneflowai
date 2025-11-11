import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ExportJobService } from '@/services/export/ExportJobService'

function assertWorkerAuthorized(request: NextRequest): boolean {
  const expected = process.env.EXPORT_WORKER_TOKEN
  if (!expected) return false
  const provided = request.headers.get('x-export-worker-token')
  return provided === expected
}

const CompleteSchema = z.object({
  resultUrl: z.string().url(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  if (!assertWorkerAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = CompleteSchema.parse(await request.json())
    const job = await ExportJobService.markCompleted(params.jobId, payload.resultUrl, payload.metadata)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ExportComplete] Failed to complete job', params.jobId, error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to complete job' }, { status: 500 })
  }
}
