import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import {
  getScriptARPayload,
  resolveScriptARSessionByToken,
} from '@/lib/script/audienceResonance/shareSession'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    await sequelize.authenticate()
    const session = await resolveScriptARSessionByToken(token)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not found or expired' }, { status: 404 })
    }
    const payload = getScriptARPayload(session)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid session type' }, { status: 400 })
    }
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      token,
      payload: {
        projectTitle: payload.projectTitle,
        review: payload.review,
        shareSettings: payload.shareSettings,
        ownerDisplayName: payload.ownerDisplayName,
        sectionAudioByLanguage: payload.sectionAudioByLanguage || {},
        sectionTranslations: payload.sectionTranslations || {},
        sectionAudioLanguage: payload.sectionAudioLanguage || 'en',
        sectionAudioStatus: payload.sectionAudioStatus,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
