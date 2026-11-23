import { Op, literal } from 'sequelize'
import CollabSession from '@/models/CollabSession'
import type { BlueprintSessionPayload, BlueprintShareAccessRole } from './shareTypes'

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

/**
 * Resolves either a primary Blueprint share token OR a comment-only guest share token
 * (`payload->'shareSettings'->>'guestShareToken'`).
 * Returns the canonical CollabSession, parsed Blueprint payload, and resolved access role.
 */
export async function resolveBlueprintShareByToken(token: string): Promise<{
  session: CollabSession
  payload: BlueprintSessionPayload
  accessRole: BlueprintShareAccessRole
} | null> {
  const cleanToken = (token || '').trim()
  if (!cleanToken) return null

  const primary = await resolveSessionByToken(cleanToken)
  if (primary) {
    const payload = getPayload(primary)
    if (!payload) return null
    const accessRole: BlueprintShareAccessRole = payload.shareSettings?.clientAutoReviseMode
      ? 'primary_customer'
      : 'standard'
    return { session: primary, payload, accessRole }
  }

  // Fallback lookup for comment-only family/stakeholder guest tokens
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(cleanToken)) {
    return null
  }
  try {
    const guestMatch = await CollabSession.findOne({
      where: {
        status: 'active',
        [Op.and]: [
          literal(`payload->>'type' = 'blueprint'`),
          literal(`payload->'shareSettings'->>'guestShareToken' = '${cleanToken}'`),
        ],
      } as any,
    })
    if (!guestMatch) return null
    const expiresAt = (guestMatch as { expires_at?: Date | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date()) return null
    const payload = getPayload(guestMatch)
    if (!payload || payload.shareSettings?.guestShareToken !== cleanToken) return null
    return {
      session: guestMatch,
      payload,
      accessRole: 'guest_reviewer',
    }
  } catch {
    return null
  }
}

export async function findActiveBlueprintSession(
  projectId: string,
  ownerUserId: string
) {
  const candidates = await CollabSession.findAll({
    where: {
      project_id: projectId,
      owner_user_id: ownerUserId,
      status: 'active',
    },
    order: [['created_at', 'DESC']],
    limit: 10,
  })
  for (const s of candidates) {
    const expiresAt = (s as { expires_at?: Date | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date()) continue
    if (getPayload(s)) return s
  }
  return null
}

export function getPayload(session: { payload?: Record<string, unknown> | null }): BlueprintSessionPayload | null {
  const p = session.payload
  if (!isBlueprintPayload(p)) return null
  return p
}

export function treatmentFromPayload(payload: BlueprintSessionPayload): Record<string, unknown> {
  return payload.treatment || {}
}
