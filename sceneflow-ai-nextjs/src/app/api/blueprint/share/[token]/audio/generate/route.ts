import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerForSession } from '@/lib/blueprint/shareAuth'
import { runShareSectionAudioGeneration } from '@/lib/blueprint/generateShareSectionAudio'
import { getPayload } from '@/lib/blueprint/shareSession'
import CollabSession from '@/models/CollabSession'

export const runtime = 'nodejs'
export const maxDuration = 300

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const auth = await requireOwnerForSession(token)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const session = auth.session!
    const sessionId = (session as { id: string }).id
    const body = await _req.json().catch(() => ({}))
    const language =
      typeof body?.language === 'string' && body.language.trim()
        ? body.language.trim()
        : undefined
    const voiceId =
      typeof body?.voiceId === 'string' && body.voiceId.trim()
        ? body.voiceId.trim()
        : undefined
    const directorNotes =
      typeof body?.directorNotes === 'string' ? body.directorNotes : undefined

    const result = await runShareSectionAudioGeneration(sessionId, {
      language,
      voiceId,
      directorNotes,
    })

    const updated = await CollabSession.findByPk(sessionId)
    const payload = updated ? getPayload(updated) : null
    const lang = result.language || payload?.sectionAudioLanguage

    return NextResponse.json({
      success: true,
      skipped: result.skipped,
      language: lang,
      sectionAudioStatus: payload?.sectionAudioStatus ?? result.status,
      sectionAudio: result.sectionAudio,
      sectionAudioByLanguage: payload?.sectionAudioByLanguage,
      sectionAudioGeneratedAt: payload?.sectionAudioGeneratedAt,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to generate audio'
    console.error('[blueprint/share/audio/generate]', e)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
