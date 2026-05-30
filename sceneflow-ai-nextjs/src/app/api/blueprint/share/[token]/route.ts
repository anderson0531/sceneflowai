import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import { recoverStaleSectionAudioIfNeeded } from '@/lib/blueprint/generateShareSectionAudio'
import { getPayload, resolveSessionByToken } from '@/lib/blueprint/shareSession'
import {
  getSectionAudioForLanguage,
  getSectionTranslationsForLanguage,
  getShareAudioLanguage,
  normalizeShareAudioPayload,
} from '@/lib/blueprint/shareAudioPayload'
import { requireOwnerForSession } from '@/lib/blueprint/shareAuth'
import { resolveBlueprintHeroImageUrl } from '@/lib/blueprint/resolveBlueprintHeroImage'
import { mirrorBlueprintHeroToBlob } from '@/lib/blueprint/shareHeroImage'
import type { BlueprintSessionPayload } from '@/lib/blueprint/shareTypes'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    await sequelize.authenticate()

    const session = await resolveSessionByToken(token)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not found or expired' }, { status: 404 })
    }

    let payload = getPayload(session)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid session type' }, { status: 400 })
    }

    payload = await recoverStaleSectionAudioIfNeeded(session.id, payload)
    payload = normalizeShareAudioPayload(payload)
    const lang = getShareAudioLanguage(payload)

    let heroImageUrl =
      resolveBlueprintHeroImageUrl(payload) ??
      resolveBlueprintHeroImageUrl(payload.treatment as Record<string, unknown>)

    if (heroImageUrl && payload.projectId) {
      const mirrored = await mirrorBlueprintHeroToBlob(heroImageUrl, payload.projectId)
      if (mirrored !== heroImageUrl || payload.heroImageUrl !== mirrored) {
        const nextPayload: BlueprintSessionPayload = { ...payload, heroImageUrl: mirrored }
        payload = nextPayload
        await CollabSession.update({ payload: nextPayload }, { where: { id: session.id } })
        heroImageUrl = mirrored
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      token,
      status: (session as { status?: string }).status,
      expiresAt: (session as { expires_at?: Date | null }).expires_at,
      payload: {
        treatment: payload.treatment,
        heroImageUrl,
        variantId: payload.variantId,
        projectId: payload.projectId,
        shareSettings: payload.shareSettings,
        ownerDisplayName: payload.ownerDisplayName,
        sectionAudio: getSectionAudioForLanguage(payload, lang),
        sectionAudioByLanguage: payload.sectionAudioByLanguage,
        sectionTranslations: payload.sectionTranslations,
        sectionAudioLanguage: lang,
        sectionAudioStatus: payload.sectionAudioStatus,
        sectionAudioVoiceId: payload.sectionAudioVoiceId,
        sectionAudioDirectorNotes: payload.sectionAudioDirectorNotes,
        sectionAudioStartedAt: payload.sectionAudioStartedAt,
        sectionAudioGeneratedAt: payload.sectionAudioGeneratedAt,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const auth = await requireOwnerForSession(token)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json().catch(() => ({}))
    const session = auth.session!
    const updates: Record<string, unknown> = {}

    if (body.revoke === true) {
      updates.status = 'closed'
    }
    if (typeof body.expiresInDays === 'number') {
      const days = Math.min(60, Math.max(1, body.expiresInDays))
      updates.expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      const payload = getPayload(session)
      if (payload) {
        payload.shareSettings = {
          ...payload.shareSettings,
          expiresAt: (updates.expires_at as Date).toISOString(),
        }
        updates.payload = payload
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No updates' }, { status: 400 })
    }

    await CollabSession.update(updates, { where: { id: session!.id } })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
