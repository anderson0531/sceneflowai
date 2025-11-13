import { NextRequest, NextResponse } from 'next/server'
import { creationHubVideoQueue } from '@/services/CreationHubVideoQueue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 })
    }

    const job = creationHubVideoQueue.getJob(id)
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('[CreationHub Video Jobs] GET /:id error', error)
    return NextResponse.json({ success: false, error: 'Failed to load job' }, { status: 500 })
  }
}
