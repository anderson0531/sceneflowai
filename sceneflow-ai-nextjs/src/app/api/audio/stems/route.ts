import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { enqueueStemSeparationJob, getStemJobStatus } from '@/lib/audio/stemJobs'
import { computeSourceHash } from '@/lib/audio/stemJobs'

export const runtime = 'nodejs'

interface CreateStemJobRequest {
  projectId: string
  sceneId: string
  segmentId: string
  sourceAudioUrl: string
  sourceHash?: string
  takeId?: string
  model?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as CreateStemJobRequest
    if (!body.projectId || !body.sceneId || !body.segmentId || !body.sourceAudioUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, sceneId, segmentId, sourceAudioUrl' },
        { status: 400 }
      )
    }

    const sourceHash = body.sourceHash || computeSourceHash(body.sourceAudioUrl)
    const result = await enqueueStemSeparationJob({
      projectId: body.projectId,
      sceneId: body.sceneId,
      segmentId: body.segmentId,
      sourceAudioUrl: body.sourceAudioUrl,
      sourceHash,
      takeId: body.takeId,
      userId: String(userId),
      model: body.model,
    })

    return NextResponse.json({
      success: true,
      provider: 'demucs',
      jobId: result.jobId,
      sourceHash,
      status: result.status.toUpperCase(),
    })
  } catch (error) {
    console.error('[Stem API] Failed to create separation job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create stem job' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'jobId query parameter is required' }, { status: 400 })
    }

    const status = await getStemJobStatus(jobId)
    if (!status) {
      return NextResponse.json({
        success: false,
        jobId,
        status: 'NOT_FOUND',
      })
    }

    return NextResponse.json({
      success: true,
      jobId,
      ...status,
    })
  } catch (error) {
    console.error('[Stem API] Failed to fetch job status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stem job status' },
      { status: 500 }
    )
  }
}
