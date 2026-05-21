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
    await runShareSectionAudioGeneration(sessionId)

    const updated = await CollabSession.findByPk(sessionId)
    const payload = updated ? getPayload(updated) : null

    return NextResponse.json({
      success: true,
      sectionAudioStatus: payload?.sectionAudioStatus,
      sectionAudio: payload?.sectionAudio,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to generate audio'
    console.error('[blueprint/share/audio/generate]', e)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
