import CollabSession from '@/models/CollabSession'
import type { ScriptARSessionPayload } from './shareTypes'

export function isScriptARPayload(
  payload: Record<string, unknown> | null | undefined
): payload is ScriptARSessionPayload {
  return payload?.type === 'script-resonance'
}

export async function resolveScriptARSessionByToken(token: string) {
  const session = await CollabSession.findOne({
    where: { token, status: 'active' },
  })
  if (!session) return null
  const expiresAt = (session as { expires_at?: Date | null }).expires_at
  if (expiresAt && new Date(expiresAt) < new Date()) return null
  if (!isScriptARPayload(session.payload)) return null
  return session
}

export function getScriptARPayload(
  session: { payload?: Record<string, unknown> | null }
): ScriptARSessionPayload | null {
  const payload = session.payload
  if (!isScriptARPayload(payload)) return null
  return payload
}

export async function findActiveScriptARSession(projectId: string, ownerUserId: string) {
  const candidates = await CollabSession.findAll({
    where: {
      project_id: projectId,
      owner_user_id: ownerUserId,
      status: 'active',
    },
    order: [['created_at', 'DESC']],
    limit: 10,
  })
  for (const session of candidates) {
    const expiresAt = (session as { expires_at?: Date | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date()) continue
    if (getScriptARPayload(session)) return session
  }
  return null
}
