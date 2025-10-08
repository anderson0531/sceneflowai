import { NextRequest, NextResponse } from 'next/server'
import { addFeedback, getSession, listFeedback, setFeedback } from '@/lib/collab/store'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, score, comment, tags, scopeId, alias, reviewerId } = body || {}
    if (!sessionId || typeof score !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing sessionId or score' }, { status: 400 })
    }
    const session = getSession(sessionId)
    if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    // enforce unique per reviewer+scope
    const existing = (listFeedback(sessionId) || []).find(f => f.scopeId === scopeId && (f as any).reviewerId === reviewerId)
    const entry = {
      id: crypto.randomUUID(),
      sessionId,
      round: session.round,
      scopeId,
      score: Math.max(1, Math.min(5, Number(score))),
      comment: comment ? String(comment).slice(0, 2000) : undefined,
      tags: Array.isArray(tags) ? tags.map((t: any) => String(t).slice(0, 48)).slice(0, 12) : undefined,
      alias: alias ? String(alias).slice(0, 64) : undefined,
      reviewerId: reviewerId || undefined,
      createdAt: new Date().toISOString(),
    }
    if (!existing) {
      addFeedback(entry as any)
    } else {
      // Replace existing feedback for the same reviewer+scope
      const withoutExisting = listFeedback(sessionId).filter(f => !(f.scopeId === scopeId && (f as any).reviewerId === reviewerId)) as any
      setFeedback(sessionId, [...withoutExisting, entry as any])
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}


