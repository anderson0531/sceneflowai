import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import CollabParticipant from '@/models/CollabParticipant'
import { getAuthenticatedUserId, assertProjectAccess } from '@/lib/projectAccess'
import type { BlueprintSessionPayload, BlueprintShareCreateBody } from '@/lib/blueprint/shareTypes'
import { getPayload } from '@/lib/blueprint/shareSession'

export const runtime = 'nodejs'
export const maxDuration = 300

function buildSharePayload(
  body: BlueprintShareCreateBody,
  ownerName: string,
  expiresAt: Date
): BlueprintSessionPayload {
  return {
    type: 'blueprint',
    projectId: body.projectId,
    variantId: body.variantId,
    treatment: body.treatment,
    heroImageUrl: body.heroImageUrl,
    audienceDefinition: body.audienceDefinition ?? null,
    shareSettings: {
      expiresAt: expiresAt.toISOString(),
      allowTts: true,
      collectEmail: false,
    },
    ownerDisplayName: ownerName,
    sectionAudioStatus: process.env.ELEVENLABS_API_KEY ? 'pending' : 'skipped',
  }
}

async function findActiveBlueprintSession(projectId: string, ownerUserId: string) {
  const candidates = await CollabSession.findAll({
    where: {
      project_id: projectId,
      owner_user_id: ownerUserId,
      status: 'active',
    },
    order: [['created_at', 'DESC']],
    limit: 10,
  })
  for (const s of candidates) {
    const expiresAt = (s as { expires_at?: Date | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date()) continue
    if (getPayload(s)) return s
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const authSession = await getServerSession(authOptions as any).catch(() => null)
    const ownerUserId = await getAuthenticatedUserId(req)
    const ownerName = (authSession?.user as { name?: string })?.name || 'Owner'
    const ownerEmail = (authSession?.user as { email?: string })?.email || null
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as BlueprintShareCreateBody & { legacyOwnerId?: string }
    const {
      projectId,
      variantId,
      treatment,
      heroImageUrl,
      audienceDefinition,
      expiresInDays = 14,
      legacyOwnerId,
      forceNew = false,
    } = body

    if (!projectId || !variantId || !treatment) {
      return NextResponse.json({ success: false, error: 'Missing projectId, variantId, or treatment' }, { status: 400 })
    }

    const access = await assertProjectAccess(projectId, ownerUserId, legacyOwnerId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    await sequelize.authenticate()

    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    await CollabSession.sync({ alter: false })
    await CollabParticipant.sync({ alter: false })

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    if (!forceNew) {
      const existing = await findActiveBlueprintSession(projectId, ownerUserId)
      if (existing) {
        const prev = getPayload(existing)!
        const nextPayload: BlueprintSessionPayload = {
          ...prev,
          variantId,
          treatment,
          heroImageUrl,
          audienceDefinition: audienceDefinition ?? null,
          ownerDisplayName: ownerName,
          shareSettings: {
            ...prev.shareSettings,
            expiresAt: expiresAt.toISOString(),
            allowTts: true,
          },
        }
        await existing.update({
          expires_at: expiresAt,
          payload: nextPayload,
        })

        const tokenStr = (existing as { token?: string }).token
        if (!tokenStr) {
          return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          token: tokenStr,
          sessionId: existing.id,
          url: `${origin}/blueprint/share/${tokenStr}`,
          reused: true,
        })
      }
    }

    const tokenStr = crypto.randomBytes(24).toString('base64url')
    const payload = buildSharePayload(
      { projectId, variantId, treatment, heroImageUrl, audienceDefinition, expiresInDays },
      ownerName,
      expiresAt
    )

    const t = await sequelize.transaction()
    try {
      const collabSession = await CollabSession.create(
        {
          project_id: projectId,
          owner_user_id: ownerUserId,
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
          email: ownerEmail || '',
          role: 'owner',
        },
        { transaction: t }
      )

      await t.commit()

      return NextResponse.json({
        success: true,
        token: tokenStr,
        sessionId: collabSession.id,
        url: `${origin}/blueprint/share/${tokenStr}`,
        reused: false,
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
