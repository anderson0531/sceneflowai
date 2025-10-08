import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { input, briefs } = body || {}
    if (!input || !briefs) return NextResponse.json({ success: false, error: 'Missing input or briefs' }, { status: 400 })
    // Combine input with concise refinement briefs
    const enriched = `${input}\n\nRefinement Briefs (by concept):\n${Object.entries(briefs as Record<string,string>).map(([k,v])=>`- ${k}: ${v}`).join('\n')}`
    const origin = (()=>{ const u = new URL(req.url); return `${u.protocol}//${u.host}` })()
    const resp = await fetch(`${origin}/api/v3/blueprint/analyze`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ input: enriched, variants: 3 }) })
    const data = await resp.json().catch(()=>null)
    if (!resp.ok || !data?.success) return NextResponse.json({ success: false, error: data?.error || 'Generation failed' }, { status: 400 })
    return NextResponse.json({ success: true, data: data.data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}


