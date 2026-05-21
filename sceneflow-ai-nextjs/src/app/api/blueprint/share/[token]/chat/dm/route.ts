import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import { resolveSessionByToken, getPayload } from '@/lib/blueprint/shareSession'
import { requireOwnerForSession, validateParticipant, sessionDbId } from '@/lib/blueprint/shareAuth'
import { listChatMessages, postChatMessage, dmScopeForParticipant } from '@/lib/blueprint/shareChat'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

async function resolveSession(token: string) {
  await sequelize.authenticate()
  const session = await resolveSessionByToken(token)
  if (!session || !getPayload(session)) return null
  return session
}

function resolveDmScope(
  role: 'owner' | 'collaborator',
  participantId: string | undefined,
  targetParticipantId: string | undefined
): string | null {
  if (role === 'owner') {
    if (!targetParticipantId) return null
    return dmScopeForParticipant(targetParticipantId)
  }
  if (!participantId) return null
  return dmScopeForParticipant(participantId)
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const session = await resolveSession(token)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const url = new URL(req.url)
    const since = Number(url.searchParams.get('since') || '0')
    const participantId = url.searchParams.get('participantId') || undefined
    const targetParticipantId = url.searchParams.get('targetParticipantId') || undefined

    const ownerAuth = await requireOwnerForSession(token)
    let scopeId: string | null = null

    if (ownerAuth.ok) {
      scopeId = resolveDmScope('owner', undefined, targetParticipantId || participantId)
    } else if (participantId) {
      const v = await validateParticipant(sessionDbId(session), participantId)
      if (!v.ok) {
        return NextResponse.json({ success: false, error: v.error }, { status: 403 })
      }
      scopeId = resolveDmScope('collaborator', participantId, undefined)
    } else {
      return NextResponse.json({ success: false, error: 'participantId required' }, { status: 400 })
    }

    if (!scopeId) {
      return NextResponse.json({ success: false, error: 'targetParticipantId required' }, { status: 400 })
    }

    const messages = await listChatMessages({
      sessionId: sessionDbId(session),
      channel: 'dm',
      scopeId,
      since,
    })
    const nextCursor = messages.length ? Math.max(...messages.map((m) => m.seq)) : since

    return NextResponse.json({ success: true, messages, nextCursor, scopeId })
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
    const { text, authorRole, alias, clientId, participantId, targetParticipantId } = body || {}
    if (!text?.trim()) {
      return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
    }

    const sessionId = sessionDbId(session)
    const ownerAuth = await requireOwnerForSession(token)
    let scopeId: string | null = null
    let role: 'owner' | 'collaborator' = 'collaborator'
    let displayAlias = String(alias || 'Reviewer').slice(0, 255)

    if (ownerAuth.ok && authorRole === 'owner') {
      role = 'owner'
      scopeId = resolveDmScope('owner', undefined, targetParticipantId || participantId)
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
      scopeId = resolveDmScope('collaborator', participantId, undefined)
      displayAlias = v.participant.name
    }

    if (!scopeId) {
      return NextResponse.json({ success: false, error: 'Invalid DM target' }, { status: 400 })
    }

    const message = await postChatMessage({
      sessionId,
      channel: 'dm',
      scopeId,
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
