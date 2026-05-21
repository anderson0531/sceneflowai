import { after, NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import CollabParticipant from '@/models/CollabParticipant'
import { getAuthenticatedUserId, assertProjectAccess } from '@/lib/projectAccess'
import type { BlueprintSessionPayload, BlueprintShareCreateBody } from '@/lib/blueprint/shareTypes'
import { runShareSectionAudioGeneration } from '@/lib/blueprint/generateShareSectionAudio'

export const runtime = 'nodejs'
export const maxDuration = 300

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
    } = body

    if (!projectId || !variantId || !treatment) {
      return NextResponse.json({ success: false, error: 'Missing projectId, variantId, or treatment' }, { status: 400 })
    }

    const access = await assertProjectAccess(projectId, ownerUserId, legacyOwnerId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
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
      sectionAudioStatus: process.env.ELEVENLABS_API_KEY ? 'pending' : 'skipped',
    }

    // Ensure tables exist (dev / first deploy without manual migration)
    await CollabSession.sync({ alter: false })
    await CollabParticipant.sync({ alter: false })

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

      if (process.env.ELEVENLABS_API_KEY) {
        const sessionId = collabSession.id
        after(async () => {
          try {
            await runShareSectionAudioGeneration(sessionId)
          } catch (err) {
            console.error('[blueprint/share/create] section audio generation failed:', err)
          }
        })
      }

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
