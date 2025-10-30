import { NextRequest, NextResponse } from 'next/server'

const getJobs = (): Record<string, any> => {
  const g = globalThis as any
  if (!g.SF_BATCH_JOBS) g.SF_BATCH_JOBS = {}
  return g.SF_BATCH_JOBS as Record<string, any>
}

export const maxDuration = 60
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId') || ''
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
  const jobs = getJobs()
  const job = jobs[jobId]
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    jobId,
    total: job.total,
    completed: job.completed,
    currentScene: job.currentScene,
    lastMessage: job.lastMessage,
    done: job.completed >= job.total && !!job.result,
    error: job.error || null,
    result: job.result || null
  })
}


