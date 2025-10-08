import { NextRequest, NextResponse } from 'next/server'
import { listFeedback } from '@/lib/collab/store'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId') || ''
  const scopeId = searchParams.get('scopeId') || ''
  if (!sessionId) return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
  let feedback = listFeedback(sessionId)
  const totalsByScopeId: Record<string, { count: number; avg: number }> = {}
  for (const f of feedback) {
    const id = f.scopeId || '__all__'
    if (!totalsByScopeId[id]) totalsByScopeId[id] = { count: 0, avg: 0 }
    const bucket = totalsByScopeId[id]
    bucket.count += 1
    bucket.avg += Number(f.score || 0)
  }
  for (const k in totalsByScopeId) {
    const b = totalsByScopeId[k]
    b.avg = b.count ? b.avg / b.count : 0
  }
  if (scopeId) feedback = feedback.filter(f => f.scopeId === scopeId)
  return NextResponse.json({ success: true, feedback, totalsByScopeId })
}


