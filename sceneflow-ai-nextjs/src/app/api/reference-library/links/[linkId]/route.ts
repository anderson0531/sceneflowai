import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import { deleteReferenceAssetLink } from '@/lib/referenceLibrary/assetRepository'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ linkId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { linkId } = await params
  const deleted = await deleteReferenceAssetLink(linkId, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
