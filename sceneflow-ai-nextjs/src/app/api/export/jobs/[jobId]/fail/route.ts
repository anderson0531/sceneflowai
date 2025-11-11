import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ExportJobService } from '@/services/export/ExportJobService'

function assertWorkerAuthorized(request: NextRequest): boolean {
  const expected = process.env.EXPORT_WORKER_TOKEN
  if (!expected) return false
  const provided = request.headers.get('x-export-worker-token')
  return provided === expected
}

const FailSchema = z.object({
  errorMessage: z.string().min(1),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  if (!assertWorkerAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = FailSchema.parse(await request.json())
    const job = await ExportJobService.markFailed(params.jobId, payload.errorMessage, payload.metadata)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ExportFail] Failed to mark job failed', params.jobId, error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to mark job failed' }, { status: 500 })
  }
}
