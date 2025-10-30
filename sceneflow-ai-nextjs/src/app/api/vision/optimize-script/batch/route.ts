import { NextRequest, NextResponse } from 'next/server'
import { runBatchOptimize } from '../../../../../lib/script/batchOptimizer'

export const maxDuration = 120
export const runtime = 'nodejs'

type JobState = {
  total: number
  completed: number
  currentScene: number
  lastMessage: string
  result?: any
  error?: string
}

const getJobs = (): Record<string, JobState> => {
  const g = globalThis as any
  if (!g.SF_BATCH_JOBS) g.SF_BATCH_JOBS = {}
  return g.SF_BATCH_JOBS as Record<string, JobState>
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script, characters, pass } = await req.json()
    if (!projectId || !script) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const jobs = getJobs()
    jobs[jobId] = { total: script.scenes?.length || 0, completed: 0, currentScene: 0, lastMessage: 'Queued' }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY as string
    if (!apiKey) throw new Error('Google API key not configured')

    // Fire-and-forget
    ;(async () => {
      try {
        const fetchImpl = (input: string, init?: any) => fetch(input, init)
        const result = await runBatchOptimize({
          apiKey,
          fetchImpl,
          script,
          characters,
          pass,
          onProgress: ({ total, index, message }) => {
            const jobs = getJobs()
            jobs[jobId].total = total
            jobs[jobId].currentScene = index
            jobs[jobId].completed = index
            jobs[jobId].lastMessage = message
          }
        })
        const jobs = getJobs()
        jobs[jobId].result = result
        jobs[jobId].completed = jobs[jobId].total
        jobs[jobId].lastMessage = 'Completed'
      } catch (e: any) {
        const jobs = getJobs()
        jobs[jobId].error = e?.message || 'Batch failed'
        jobs[jobId].lastMessage = 'Failed'
      }
    })()

    return NextResponse.json({ jobId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to start batch' }, { status: 500 })
  }
}


