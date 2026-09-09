import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import { createReferenceAssetLink } from '@/lib/referenceLibrary/assetRepository'
import Project from '@/models/Project'
import { Series } from '@/models/Series'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { assetId, projectId, seriesId, addedBy } = body

  if (!assetId) {
    return NextResponse.json({ error: 'assetId is required' }, { status: 400 })
  }
  if (!projectId && !seriesId) {
    return NextResponse.json({ error: 'projectId or seriesId is required' }, { status: 400 })
  }

  if (projectId) {
    const project = await Project.findByPk(projectId)
    if (!project || project.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
  }

  if (seriesId) {
    const series = await Series.findByPk(seriesId)
    if (!series || series.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }
  }

  const link = await createReferenceAssetLink({
    assetId,
    userId: session.user.id,
    projectId,
    seriesId,
    addedBy,
  })

  if (!link) {
    return NextResponse.json({ error: 'Asset not found or link failed' }, { status: 404 })
  }

  return NextResponse.json({ success: true, linkId: link.id })
}
