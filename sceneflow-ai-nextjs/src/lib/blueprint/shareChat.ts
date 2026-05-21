import { Op } from 'sequelize'
import CollabChatMessage from '@/models/CollabChatMessage'
import { buildDmScopeId } from './shareSession'

export async function listChatMessages(opts: {
  sessionId: string
  channel: string
  scopeId?: string | null
  since?: number
  limit?: number
}) {
  const { sessionId, channel, scopeId, since = 0, limit = 200 } = opts
  const where: Record<string, unknown> = { sessionId, channel }
  if (channel === 'dm') {
    if (!scopeId) return []
    where.scopeId = scopeId
  } else if (scopeId !== undefined && scopeId !== null) {
    where.scopeId = scopeId
  } else {
    where.scopeId = { [Op.or]: [{ [Op.is]: null }, ''] }
  }
  if (since > 0) where.seq = { [Op.gt]: since }

  const messages = await CollabChatMessage.findAll({
    where,
    order: [['seq', 'ASC']],
    limit: Math.min(500, limit),
  })

  return messages.map((m) => ({
    id: m.id,
    sessionId: m.sessionId,
    channel: m.channel,
    scopeId: m.scopeId,
    authorRole: m.authorRole,
    alias: m.alias,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    seq: m.seq,
  }))
}

export async function postChatMessage(opts: {
  sessionId: string
  channel: string
  scopeId?: string | null
  text: string
  authorRole: 'owner' | 'collaborator'
  alias: string
  clientId?: string
}) {
  const message = await CollabChatMessage.create({
    id: crypto.randomUUID(),
    sessionId: opts.sessionId,
    channel: opts.channel,
    scopeId: opts.scopeId ?? undefined,
    authorRole: opts.authorRole,
    alias: opts.alias.slice(0, 255),
    text: String(opts.text).slice(0, 2000),
    clientId: opts.clientId,
    seq: Date.now(),
  })
  return {
    id: message.id,
    sessionId: message.sessionId,
    channel: message.channel,
    scopeId: message.scopeId,
    authorRole: message.authorRole,
    alias: message.alias,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
    seq: message.seq,
  }
}

export function dmScopeForParticipant(participantId: string): string {
  return buildDmScopeId(participantId)
}
