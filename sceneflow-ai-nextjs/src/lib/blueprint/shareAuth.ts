import { NextRequest } from 'next/server'
import CollabParticipant from '@/models/CollabParticipant'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import { resolveUserId } from '@/lib/userHelper'
import { resolveSessionByToken, getPayload } from './shareSession'

export async function getOwnerUserId(req?: NextRequest): Promise<string | null> {
  return getAuthenticatedUserId(req)
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
  if (sessionOwner) {
    let sessionOwnerResolved = sessionOwner
    try {
      sessionOwnerResolved = await resolveUserId(sessionOwner)
    } catch {
      /* keep raw */
    }
    if (sessionOwnerResolved !== ownerUserId) {
      return { ok: false, status: 403, error: 'Forbidden' }
    }
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
