import { NextRequest, NextResponse } from 'next/server'

// Reuse the in-memory jobs map from the start route module via Node's module cache
// eslint-disable-next-line @typescript-eslint/no-var-requires
const startModule = require('../route')

export const maxDuration = 60
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId') || ''
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
  const jobs = (startModule as any).jobs as Record<string, any> | undefined
  if (!jobs || !jobs[jobId]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const job = jobs[jobId]
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


