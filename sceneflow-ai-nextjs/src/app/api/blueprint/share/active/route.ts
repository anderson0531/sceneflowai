import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import { getOwnerUserId } from '@/lib/blueprint/shareAuth'
import { getPayload } from '@/lib/blueprint/shareSession'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const ownerUserId = await getOwnerUserId(req)
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = new URL(req.url).searchParams.get('projectId') || ''
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 })
    }

    await sequelize.authenticate()

    const candidates = await CollabSession.findAll({
      where: {
        project_id: projectId,
        owner_user_id: ownerUserId,
        status: 'active',
      },
      order: [['created_at', 'DESC']],
      limit: 10,
    })
    const session = candidates.find((s) => getPayload(s)) ?? null

    if (!session) {
      return NextResponse.json({ success: true, active: false })
    }

    const expiresAt = (session as { expires_at?: Date | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return NextResponse.json({ success: true, active: false })
    }

    if (!getPayload(session)) {
      return NextResponse.json({ success: true, active: false })
    }

    const token = (session as { token?: string }).token
    if (!token) {
      return NextResponse.json({ success: true, active: false })
    }

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    return NextResponse.json({
      success: true,
      active: true,
      token,
      sessionId: session.id,
      url: `${origin}/blueprint/share/${token}`,
      expiresAt: expiresAt?.toISOString?.() ?? null,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    console.error('[blueprint/share/active]', e)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
