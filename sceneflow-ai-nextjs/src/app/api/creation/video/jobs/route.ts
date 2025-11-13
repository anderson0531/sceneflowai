import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { creationHubVideoQueue } from '@/services/CreationHubVideoQueue'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
  }

  const jobs = creationHubVideoQueue.getJobsForProject(projectId)
  return NextResponse.json({ success: true, jobs })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { projectId, sceneId, prompt, durationSec, modelKey, characterIds } = body || {}

    if (!projectId || !sceneId || !prompt || !durationSec || !modelKey) {
      return NextResponse.json({ success: false, error: 'projectId, sceneId, prompt, durationSec, and modelKey are required' }, { status: 400 })
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const job = creationHubVideoQueue.submitJob({
      projectId,
      sceneId,
      userId: project.user_id,
      prompt,
      durationSec,
      modelKey,
      characterIds,
      markupPercent: typeof body.markupPercent === 'number' ? body.markupPercent : 0.25,
      fixedFeePerClip: typeof body.fixedFeePerClip === 'number' ? body.fixedFeePerClip : 0.75,
    })

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('[CreationHub Video Jobs] POST error', error)
    return NextResponse.json({ success: false, error: 'Failed to create generation job' }, { status: 500 })
  }
}
