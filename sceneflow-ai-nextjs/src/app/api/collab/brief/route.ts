import { NextRequest, NextResponse } from 'next/server'
import { listFeedback } from '@/lib/collab/store'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, scopeIds } = body || {}
    if (!sessionId) return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
    const all = listFeedback(sessionId)
    const ids: string[] = Array.isArray(scopeIds) && scopeIds.length ? scopeIds : Array.from(new Set(all.map(f=>f.scopeId).filter(Boolean) as string[]))
    const briefs: Record<string,string> = {}
    for (const id of ids) {
      const list = all.filter(f => f.scopeId === id)
      if (!list.length) { briefs[id] = 'No feedback yet.'; continue }
      const avg = list.reduce((s,f)=> s + Number(f.score||0), 0) / list.length
      const tags = Array.from(new Set(list.flatMap(f=> (f.tags||[]).map(t=>String(t))))).slice(0,10)
      const comments = list.map(f=> (f.comment||'').trim()).filter(Boolean).slice(0,6)
      const brief = [
        `Average score: ${avg.toFixed(2)} from ${list.length} responses.`,
        tags.length ? `Key tags: ${tags.join(', ')}.` : '',
        comments.length ? `Representative comments: ${comments.join(' | ')}` : ''
      ].filter(Boolean).join(' ')
      briefs[id] = brief || 'Feedback captured.'
    }
    return NextResponse.json({ success: true, briefs })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}


