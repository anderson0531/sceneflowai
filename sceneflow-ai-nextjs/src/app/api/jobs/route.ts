import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { listJobsForUser } from '@/lib/jobs/jobService'
import { createGenerationJob } from '@/lib/jobs/jobService'
import { resolveUserId } from '@/lib/userHelper'
import type { GenerationJobType } from '@/models/GenerationJob'
import { inngest } from '@/inngest/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    const projectId = req.nextUrl.searchParams.get('projectId') || undefined
    if (!userIdParam) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    const userId = await resolveUserId(userIdParam)
    const jobs = await listJobsForUser(userId, projectId)
    return NextResponse.json({ jobs })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId: userIdParam,
      projectId,
      jobType,
      payload,
      batch,
    } = body as {
      userId: string
      projectId: string
      jobType: GenerationJobType
      payload?: Record<string, unknown>
      batch?: Record<string, unknown>[]
    }

    if (!userIdParam || !projectId || !jobType) {
      return NextResponse.json({ error: 'userId, projectId, jobType required' }, { status: 400 })
    }

    const userId = await resolveUserId(userIdParam)

    if (batch && Array.isArray(batch) && batch.length > 0) {
      const job = await createGenerationJob({
        userId,
        projectId,
        jobType,
        payload: { batchSize: batch.length },
      })
      await inngest.send({
        name: 'generation/batch.queued',
        data: { jobId: job.id, userId, projectId, jobType, items: batch },
      })
      return NextResponse.json({ jobId: job.id, status: 'queued' })
    }

    const job = await createGenerationJob({
      userId,
      projectId,
      jobType,
      payload: payload || {},
    })
    return NextResponse.json({ jobId: job.id, status: 'queued' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
