import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import CollabParticipant from '@/models/CollabParticipant'
import Project from '@/models/Project'
import type { BlueprintSessionPayload, BlueprintShareCreateBody } from '@/lib/blueprint/shareTypes'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as { id?: string })?.id
    const ownerName = (session?.user as { name?: string })?.name || 'Owner'
    const ownerEmail = (session?.user as { email?: string })?.email || null
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as BlueprintShareCreateBody
    const { projectId, variantId, treatment, heroImageUrl, audienceDefinition, expiresInDays = 14 } = body

    if (!projectId || !variantId || !treatment) {
      return NextResponse.json({ success: false, error: 'Missing projectId, variantId, or treatment' }, { status: 400 })
    }

    const proj = await Project.findByPk(projectId)
    if (!proj) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }
    if ((proj as { user_id?: string }).user_id && (proj as { user_id?: string }).user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await sequelize.authenticate()

    const tokenStr = crypto.randomBytes(24).toString('base64url')
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    const payload: BlueprintSessionPayload = {
      type: 'blueprint',
      projectId,
      variantId,
      treatment,
      heroImageUrl,
      audienceDefinition: audienceDefinition ?? null,
      shareSettings: {
        expiresAt: expiresAt.toISOString(),
        allowTts: true,
        collectEmail: false,
      },
      ownerDisplayName: ownerName,
    }

    const t = await sequelize.transaction()
    try {
      const collabSession = await CollabSession.create(
        {
          project_id: projectId,
          owner_user_id: userId,
          token: tokenStr,
          status: 'active',
          expires_at: expiresAt,
          payload,
        },
        { transaction: t }
      )

      await CollabParticipant.create(
        {
          session_id: collabSession.id,
          name: ownerName,
          email: ownerEmail,
          role: 'owner',
        },
        { transaction: t }
      )

      await t.commit()

      const origin = req.headers.get('x-forwarded-host')
        ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
        : new URL(req.url).origin
      const url = `${origin}/blueprint/share/${tokenStr}`

      return NextResponse.json({
        success: true,
        token: tokenStr,
        sessionId: collabSession.id,
        url,
      })
    } catch (e) {
      await t.rollback()
      throw e
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create share'
    console.error('[blueprint/share/create]', e)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
