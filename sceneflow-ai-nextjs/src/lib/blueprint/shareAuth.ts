import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import CollabParticipant from '@/models/CollabParticipant'
import { resolveSessionByToken, getPayload } from './shareSession'

export async function getOwnerUserId(_req?: NextRequest): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions as any)
    const id = (session?.user as { id?: string })?.id
    if (id) return id
  } catch {}
  return null
}

export async function requireOwnerForSession(
  token: string
): Promise<
  | { ok: true; session: Awaited<ReturnType<typeof resolveSessionByToken>>; ownerUserId: string }
  | { ok: false; status: number; error: string }
> {
  const session = await resolveSessionByToken(token)
  if (!session) return { ok: false, status: 404, error: 'Session not found or expired' }
  const payload = getPayload(session)
  if (!payload) return { ok: false, status: 400, error: 'Not a blueprint share session' }

  const ownerUserId = await getOwnerUserId()
  if (!ownerUserId) return { ok: false, status: 401, error: 'Unauthorized' }

  const sessionOwner = (session as { owner_user_id?: string }).owner_user_id
  if (sessionOwner && sessionOwner !== ownerUserId) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return { ok: true, session, ownerUserId }
}

export async function validateParticipant(
  sessionId: string,
  participantId: string
): Promise<{ ok: true; participant: CollabParticipant } | { ok: false; error: string }> {
  const participant = await CollabParticipant.findOne({
    where: { id: participantId, session_id: sessionId, role: 'collaborator' },
  })
  if (!participant) return { ok: false, error: 'Invalid participant' }
  return { ok: true, participant }
}

export function sessionDbId(session: { id?: string }): string {
  return String(session?.id || '')
}
