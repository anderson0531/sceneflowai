import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import {
  createReferenceAsset,
  listReferenceAssets,
} from '@/lib/referenceLibrary/assetRepository'
import type { ReferenceAssetKind } from '@/types/referenceLibrary'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const kind = sp.get('kind') as ReferenceAssetKind | null
  const q = sp.get('q') || undefined
  const linkedToProjectId = sp.get('linkedToProjectId') || undefined
  const linkedToSeriesId = sp.get('linkedToSeriesId') || undefined
  const cursor = sp.get('cursor') || undefined
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined
  const tags = sp.getAll('tag')

  const result = await listReferenceAssets(session.user.id, {
    kind: kind || undefined,
    q,
    tags: tags.length ? tags : undefined,
    linkedToProjectId,
    linkedToSeriesId,
    cursor,
    limit,
  })

  return NextResponse.json({ success: true, ...result })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const asset = await createReferenceAsset({
      userId: session.user.id,
      kind: body.kind,
      name: body.name,
      description: body.description,
      referenceImageUrl: body.referenceImageUrl,
      attributes: body.attributes,
      tags: body.tags,
      parentAssetId: body.parentAssetId,
      originProjectId: body.originProjectId,
      originSeriesId: body.originSeriesId,
    })

    return NextResponse.json({ success: true, asset })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create asset'
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
