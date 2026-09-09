import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import {
  getReferenceAssetById,
  updateReferenceAsset,
  deleteReferenceAsset,
} from '@/lib/referenceLibrary/assetRepository'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ assetId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assetId } = await params
  const asset = await getReferenceAssetById(assetId, session.user.id)
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, asset })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assetId } = await params
  const body = await request.json()

  const asset = await updateReferenceAsset(assetId, session.user.id, {
    name: body.name,
    description: body.description,
    referenceImageUrl: body.referenceImageUrl,
    attributes: body.attributes,
    tags: body.tags,
    archivedAt: body.archived === true ? new Date() : body.archived === false ? null : undefined,
  })

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, asset })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assetId } = await params
  const deleted = await deleteReferenceAsset(assetId, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
