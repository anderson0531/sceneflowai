import { NextRequest, NextResponse } from 'next/server'
import CollabChatMessage from '@/models/CollabChatMessage'
import { sequelize } from '@/config/database'
import { Op } from 'sequelize'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId') || ''
    const channel = searchParams.get('channel') || 'general'
    const since = Number(searchParams.get('since') || '0')
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || '200')))

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
    }

    // Ensure database connection
    await sequelize.authenticate()

        // Query messages from database
        const messages = await CollabChatMessage.findAll({
          where: {
            sessionId: sessionId,  // Changed from session_id (underscored: true handles mapping)
            channel,
            ...(since > 0 ? { seq: { [Op.gt]: since } } : {}),
          },
          order: [['seq', 'ASC']],
          limit,
        })

        // Map to response (properties are already camelCase)
        const formattedMessages = messages.map(m => ({
          id: m.id,
          sessionId: m.sessionId,        // Already camelCase
          channel: m.channel,
          scopeId: m.scopeId,            // Already camelCase
          authorRole: m.authorRole,      // Already camelCase
          alias: m.alias,
          text: m.text,
          createdAt: m.createdAt.toISOString(),
          seq: m.seq,
        }))

    const nextCursor = messages.length > 0 
      ? Math.max(...messages.map(m => m.seq)) 
      : since

    return NextResponse.json({ 
      success: true, 
      messages: formattedMessages, 
      nextCursor 
    })
  } catch (e: any) {
    console.error('[Chat LIST] Error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}


