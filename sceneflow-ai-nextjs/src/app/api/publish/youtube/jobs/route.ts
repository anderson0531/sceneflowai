import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listPublishJobs } from '@/lib/premiere/publishJobs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = (request.nextUrl.searchParams.get('projectId') || '').trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const jobs = await listPublishJobs(projectId)
    return NextResponse.json({
      success: true,
      items: jobs.map((j) => ({
        id: j.id,
        status: j.status,
        platform: j.platform,
        title: j.title,
        platformUrl: j.platformUrl,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list publish jobs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
