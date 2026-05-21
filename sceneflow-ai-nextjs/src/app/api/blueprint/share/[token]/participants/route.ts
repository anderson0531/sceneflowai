import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import { sequelize } from '@/config/database'
import CollabParticipant from '@/models/CollabParticipant'
import CollabChatMessage from '@/models/CollabChatMessage'
import { requireOwnerForSession, sessionDbId } from '@/lib/blueprint/shareAuth'
import { dmScopeForParticipant } from '@/lib/blueprint/shareChat'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const auth = await requireOwnerForSession(token)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await sequelize.authenticate()
    const sessionId = sessionDbId(auth.session!)

    const participants = await CollabParticipant.findAll({
      where: { session_id: sessionId, role: 'collaborator' },
      order: [['joined_at', 'DESC']],
    })

    const enriched = await Promise.all(
      participants.map(async (p) => {
        const scopeId = dmScopeForParticipant(p.id)
        const last = await CollabChatMessage.findOne({
          where: { sessionId, channel: 'dm', scopeId },
          order: [['seq', 'DESC']],
        })
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          joinedAt: (p as { joined_at?: Date }).joined_at,
          lastMessage: last
            ? { text: last.text, createdAt: last.createdAt.toISOString(), alias: last.alias }
            : null,
        }
      })
    )

    const teamCount = await CollabChatMessage.count({
      where: { sessionId, channel: 'team', scopeId: { [Op.is]: null } },
    })

    return NextResponse.json({
      success: true,
      participants: enriched,
      teamMessageCount: teamCount,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
