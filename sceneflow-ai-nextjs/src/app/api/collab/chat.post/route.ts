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
          sessionId: sessionId,  // Changed from session_id
          channel,
          scopeId: scopeId,      // Changed from scope_id
          authorRole: authorRole === 'owner' ? 'owner' : 'collaborator',  // Changed from author_role
          alias: alias || 'Reviewer',
          text: String(text).slice(0, 2000),
          clientId: clientId,    // Changed from client_id
          seq: Date.now(),
        })

        // Response automatically has camelCase properties
        return NextResponse.json({ 
          success: true, 
          message: {
            id: message.id,
            sessionId: message.sessionId,      // Already camelCase
            channel: message.channel,
            authorRole: message.authorRole,    // Already camelCase
            alias: message.alias,
            text: message.text,
            createdAt: message.createdAt.toISOString(),
            seq: message.seq,
          }
        })
  } catch (e: any) {
    console.error('[Chat POST] Error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}


