import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { resolveUserId } from '@/lib/userHelper'
import {
  getScriptARPayload,
  resolveScriptARSessionByToken,
} from '@/lib/script/audienceResonance/shareSession'
import { runScriptARShareAudioGeneration } from '@/lib/script/audienceResonance/generateShareAudio'

export const runtime = 'nodejs'
export const maxDuration = 300

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const ownerUserId = await getAuthenticatedUserId(req)
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()
    const session = await resolveScriptARSessionByToken(token)
    if (!session || !getScriptARPayload(session)) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    const sessionOwner = (session as { owner_user_id?: string }).owner_user_id
    if (sessionOwner) {
      let resolved = sessionOwner
      try {
        resolved = await resolveUserId(sessionOwner)
      } catch {
        /* keep raw */
      }
      if (resolved !== ownerUserId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await req.json().catch(() => ({}))
    const result = await runScriptARShareAudioGeneration(session.id, {
      language: typeof body.language === 'string' ? body.language : undefined,
      voiceId: typeof body.voiceId === 'string' ? body.voiceId : undefined,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
