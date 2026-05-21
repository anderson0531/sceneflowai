import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import { resolveSessionByToken, getPayload } from '@/lib/blueprint/shareSession'
import { requireOwnerForSession, validateParticipant, sessionDbId as dbSessionId } from '@/lib/blueprint/shareAuth'
import { listChatMessages, postChatMessage } from '@/lib/blueprint/shareChat'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

async function resolveSession(token: string) {
  await sequelize.authenticate()
  const session = await resolveSessionByToken(token)
  if (!session || !getPayload(session)) return null
  return session
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const session = await resolveSession(token)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const since = Number(new URL(req.url).searchParams.get('since') || '0')
    const messages = await listChatMessages({
      sessionId: dbSessionId(session),
      channel: 'team',
      scopeId: null,
      since,
    })
    const nextCursor = messages.length ? Math.max(...messages.map((m) => m.seq)) : since

    return NextResponse.json({ success: true, messages, nextCursor })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const session = await resolveSession(token)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const { text, authorRole, alias, clientId, participantId } = body || {}
    if (!text?.trim()) {
      return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
    }

    const sessionId = dbSessionId(session)
    let role: 'owner' | 'collaborator' = authorRole === 'owner' ? 'owner' : 'collaborator'
    let displayAlias = String(alias || 'Reviewer').slice(0, 255)

    if (role === 'owner') {
      const auth = await requireOwnerForSession(token)
      if (!auth.ok) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
      }
      const payload = getPayload(session)
      displayAlias = payload?.ownerDisplayName || 'Owner'
    } else {
      if (!participantId) {
        return NextResponse.json({ success: false, error: 'participantId required' }, { status: 400 })
      }
      const v = await validateParticipant(sessionId, participantId)
      if (!v.ok) {
        return NextResponse.json({ success: false, error: v.error }, { status: 403 })
      }
      displayAlias = v.participant.name
    }

    const message = await postChatMessage({
      sessionId,
      channel: 'team',
      scopeId: null,
      text,
      authorRole: role,
      alias: displayAlias,
      clientId,
    })

    return NextResponse.json({ success: true, message })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
