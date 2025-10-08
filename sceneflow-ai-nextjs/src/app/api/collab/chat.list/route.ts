import { NextRequest, NextResponse } from 'next/server'
import { listMessages } from '@/lib/collab/store'
import { kvAvailable, listChatMessagesKV } from '@/lib/collab/kv'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId') || ''
  const channel = (searchParams.get('channel') as any) || 'general'
  const scopeId = searchParams.get('scopeId') || undefined
  const since = Number(searchParams.get('since') || '') || undefined
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || '') || 200))
  if (!sessionId) return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })

  let messages: any[] = []
  if (kvAvailable()) {
    try {
      messages = await listChatMessagesKV(sessionId, channel, since, limit) as any
    } catch {
      messages = []
    }
  }
  if (messages.length === 0) {
    // Fallback to in-memory store
    messages = listMessages(sessionId, channel, scopeId)
  }
  // Ensure ascending order, string coercions, and de-dupe strictly by message id
  const dedupMap: Record<string, any> = {}
  messages = (messages || []).map((m: any) => ({
    ...m,
    alias: String(m?.alias || ''),
    text: String(m?.text || ''),
  }))
  for (const m of messages) dedupMap[String(m.id)] = m
  messages = Object.values(dedupMap)
  messages.sort((a: any, b: any)=> new Date(a.createdAt||0).getTime() - new Date(b.createdAt||0).getTime())
  const nextCursor = messages.length ? Math.max(...messages.map((m:any)=> Number(m.seq || new Date(m.createdAt||0).getTime()))) : (since || 0)
  return NextResponse.json({ success: true, messages, nextCursor })
}


