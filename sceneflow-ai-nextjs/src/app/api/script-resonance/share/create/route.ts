import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import CollabParticipant from '@/models/CollabParticipant'
import { getAuthenticatedUserId, assertProjectAccess } from '@/lib/projectAccess'
import { sanitizeScriptARReview } from '@/lib/script/audienceResonance/sanitizeShareReview'
import { findActiveScriptARSession } from '@/lib/script/audienceResonance/shareSession'
import type { ScriptARSessionPayload } from '@/lib/script/audienceResonance/shareTypes'
import { DEFAULT_SHARE_AUDIO_LANGUAGE } from '@/lib/blueprint/shareAudioPayload'
import {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  isGeminiTtsConfigured,
} from '@/lib/tts/geminiFlashTts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const authSession = await getServerSession(authOptions as any).catch(() => null)
    const ownerUserId = await getAuthenticatedUserId(req)
    const ownerName = (authSession?.user as { name?: string })?.name || 'Owner'
    const ownerEmail = (authSession?.user as { email?: string })?.email || null
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, forceNew = false, language, voiceId } = body || {}
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })
    }

    const access = await assertProjectAccess(projectId, ownerUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const metadata = (access.project.metadata || {}) as Record<string, any>
    const review = sanitizeScriptARReview(metadata.visionPhase?.reviews?.audience)
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'No Script Audience Resonance analysis to share' },
        { status: 400 }
      )
    }

    await sequelize.authenticate()
    await CollabSession.sync({ alter: false })
    await CollabParticipant.sync({ alter: false })

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    if (!forceNew) {
      const existing = await findActiveScriptARSession(projectId, ownerUserId)
      if (existing) {
        const prev = existing.payload as ScriptARSessionPayload
        const next: ScriptARSessionPayload = {
          ...prev,
          review,
          projectTitle: access.project.title,
          ownerDisplayName: ownerName,
          shareSettings: { allowFeedback: false, neverExpires: true, allowTts: true },
        }
        await existing.update({ payload: next, expires_at: null })
        const tokenStr = (existing as { token?: string }).token
        if (!tokenStr) {
          return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 500 })
        }
        return NextResponse.json({
          success: true,
          token: tokenStr,
          sessionId: existing.id,
          url: `${origin}/share/script-resonance/${tokenStr}`,
          reused: true,
        })
      }
    }

    const tokenStr = crypto.randomBytes(24).toString('base64url')
    const payload: ScriptARSessionPayload = {
      type: 'script-resonance',
      projectId,
      projectTitle: access.project.title,
      review,
      shareSettings: { allowFeedback: false, neverExpires: true, allowTts: true },
      ownerDisplayName: ownerName,
      sectionAudioStatus: isGeminiTtsConfigured() ? 'idle' : 'skipped',
      sectionAudioLanguage: language || DEFAULT_SHARE_AUDIO_LANGUAGE,
      sectionAudioVoiceId: voiceId || DEFAULT_BLUEPRINT_GEMINI_VOICE,
      sectionAudioByLanguage: {},
    }

    const t = await sequelize.transaction()
    try {
      const collabSession = await CollabSession.create(
        {
          project_id: projectId,
          owner_user_id: ownerUserId,
          token: tokenStr,
          status: 'active',
          expires_at: null,
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
        url: `${origin}/share/script-resonance/${tokenStr}`,
        reused: false,
      })
    } catch (e) {
      await t.rollback()
      throw e
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create share'
    console.error('[script-resonance/share/create]', e)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
