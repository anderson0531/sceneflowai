import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExportJobService } from '@/services/export/ExportJobService'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions as any)
  const userId = session?.user?.id ?? null

  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
  }

  const job = await ExportJobService.getJob(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.user_id && job.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      resultUrl: job.result_url,
      errorMessage: job.error_message,
      metadata: job.metadata,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    },
  })
}
