import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { getPayload } from '@/lib/blueprint/shareSession'
import { isDemoProjectId } from '@/lib/demo/uiSandboxProject'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const projectId = new URL(req.url).searchParams.get('projectId') || ''
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 })
    }

    const ownerUserId = await getAuthenticatedUserId(req)

    if (isDemoProjectId(projectId)) {
      if (!ownerUserId) {
        return NextResponse.json({ success: true, active: false, demoSandbox: true })
      }
      // If authenticated, check for an active DB session first; fall back cleanly to inactive
      try {
        await sequelize.authenticate()
        const candidates = await CollabSession.findAll({
          where: {
            project_id: projectId,
            owner_user_id: ownerUserId,
            status: 'active',
          },
          order: [['created_at', 'DESC']],
          limit: 5,
        })
        const session = candidates.find((s) => getPayload(s)) ?? null
        const token = session ? (session as { token?: string }).token : undefined
        const expiresAt = session ? (session as { expires_at?: Date | null }).expires_at : null
        if (session && token && (!expiresAt || new Date(expiresAt) >= new Date())) {
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
        }
      } catch {
        // Ignore DB errors on sandbox projects
      }
      return NextResponse.json({ success: true, active: false, demoSandbox: true })
    }

    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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
    console.warn('[blueprint/share/active] Returning inactive fallback:', e)
    return NextResponse.json({ success: true, active: false, demoFallback: true })
  }
}
