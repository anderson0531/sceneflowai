import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, name, email } = body || {}
    if (!sessionId || !name || !email) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
    const reviewerId = crypto.randomUUID()
    const res = NextResponse.json({ success: true, reviewerId })
    res.cookies.set('sf_collab_reviewer', JSON.stringify({ sessionId, reviewerId, name, email }), { httpOnly: true, sameSite: 'lax', path: '/' })
    return res
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}


