import { NextRequest, NextResponse } from 'next/server'
import { getSession, postMessage, createSession } from '@/lib/collab/store'
import { kvAvailable, addChatMessageKV } from '@/lib/collab/kv'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, channel, scopeId, text, authorRole, alias } = body || {}
    if (!sessionId || !channel || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
    }
    let session = getSession(sessionId)
    // Lazily create a lightweight session if cold
    if (!session) {
      createSession({
        id: sessionId,
        spaceKey: { projectId: 'public', scopeType: 'generic' },
        round: 1,
        status: 'open',
        options: {},
        createdAt: new Date().toISOString(),
      })
      session = getSession(sessionId)
    }
    const chatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      channel,
      scopeId,
      authorRole: (authorRole === 'owner' ? 'owner' : 'collaborator') as 'owner' | 'collaborator',
      alias: alias || 'Reviewer',
      text: String(text).slice(0, 2000),
      createdAt: new Date().toISOString(),
    }
    // Persist to in-memory for current process
    postMessage(chatMessage as any)
    // Persist to KV if available
    if (kvAvailable()) {
      try { await addChatMessageKV({ ...chatMessage, clientId: String(body?.clientId || ''), seq: Date.now() } as any) } catch {}
    }
    return NextResponse.json({ success: true, message: chatMessage })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}


