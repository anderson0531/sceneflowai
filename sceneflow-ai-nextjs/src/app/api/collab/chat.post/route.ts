import { NextRequest, NextResponse } from 'next/server'
import CollabChatMessage from '@/models/CollabChatMessage'
import { sequelize } from '@/config/database'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, channel, scopeId, text, authorRole, alias, clientId } = body || {}
    
    if (!sessionId || !channel || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
    }

    // Ensure database connection
    await sequelize.authenticate()

    // Create message in database
    const message = await CollabChatMessage.create({
      id: crypto.randomUUID(),
      session_id: sessionId,
      channel,
      scope_id: scopeId,
      author_role: authorRole === 'owner' ? 'owner' : 'collaborator',
      alias: alias || 'Reviewer',
      text: String(text).slice(0, 2000),
      client_id: clientId,
      seq: Date.now(),
    })

    return NextResponse.json({ 
      success: true, 
      message: {
        id: message.id,
        sessionId: message.session_id,
        channel: message.channel,
        authorRole: message.author_role,
        alias: message.alias,
        text: message.text,
        createdAt: message.created_at.toISOString(),
        seq: message.seq,
      }
    })
  } catch (e: any) {
    console.error('[Chat POST] Error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}


