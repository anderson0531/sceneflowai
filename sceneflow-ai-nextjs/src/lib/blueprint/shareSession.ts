import CollabSession from '@/models/CollabSession'
import type { BlueprintSessionPayload } from './shareTypes'

export function buildDmScopeId(participantId: string): string {
  return `dm:owner:${participantId}`
}

export function isBlueprintPayload(
  payload: Record<string, unknown> | null | undefined
): payload is BlueprintSessionPayload {
  return payload?.type === 'blueprint'
}

export async function resolveSessionByToken(token: string) {
  const session = await CollabSession.findOne({
    where: { token, status: 'active' },
  })
  if (!session) return null
  const expiresAt = (session as { expires_at?: Date | null }).expires_at
  if (expiresAt && new Date(expiresAt) < new Date()) return null
  return session
}

export function getPayload(session: { payload?: Record<string, unknown> | null }): BlueprintSessionPayload | null {
  const p = session.payload
  if (!isBlueprintPayload(p)) return null
  return p
}

export function treatmentFromPayload(payload: BlueprintSessionPayload): Record<string, unknown> {
  return payload.treatment || {}
}
