import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { beatSheet } = await req.json()
    if (!Array.isArray(beatSheet) || beatSheet.length === 0) {
      return NextResponse.json({ success: false, error: 'Valid beatSheet is required' }, { status: 400 })
    }

    const scenesText = beatSheet.map((b: any, i: number) => `SCENE ${i+1}: ${b.slugline}\nSUMMARY: ${b.summary || ''}`).join('\n\n')
    const prompt = `You are a screenwriter. Using this scene outline, write a complete screenplay in Fountain format. Do not include explanations.\n---\n${scenesText}\n---`

    // Use existing Cue endpoint to generate - build absolute URL from request origin
    const origin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || ''
    const base = String(origin).replace(/^https?:\/\//, '').replace(/\/$/, '')
    const url = `https://${base}/api/cue/respond`
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      return NextResponse.json({ success: false, error: err?.error || 'Cue service error' }, { status: 500 })
    }
    const json = await resp.json().catch(() => ({}))
    let script = ''
    try { const inner = JSON.parse(json.response); script = inner.script || inner.response || json.response } catch { script = json.response }
    return NextResponse.json({ success: true, script })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}


