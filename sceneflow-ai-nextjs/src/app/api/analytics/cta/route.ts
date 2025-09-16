import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Minimal server-side logging; can be replaced with a real analytics sink
    console.log('[analytics][cta]', {
      ...body,
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      ua: req.headers.get('user-agent') || 'unknown',
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}


