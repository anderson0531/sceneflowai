import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import {
  buildReconcileManifest,
  applyReconcileConfirmation,
} from '@/lib/referenceLibrary/reconcile'
import type { ReferenceReconcileRequest } from '@/types/referenceLibrary'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as ReferenceReconcileRequest & {
    mode?: 'preview' | 'confirm'
  }

  if (!body.proposed?.length) {
    return NextResponse.json({ error: 'proposed assets required' }, { status: 400 })
  }

  if (body.mode === 'preview' || !body.confirmedReuseIds?.length && !body.confirmedCreateTempIds?.length) {
    const manifest = await buildReconcileManifest(session.user.id, body.proposed)
    return NextResponse.json({ success: true, manifest })
  }

  const result = await applyReconcileConfirmation(session.user.id, body)
  return NextResponse.json({ success: true, result })
}
