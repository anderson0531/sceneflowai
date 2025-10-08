import { NextRequest, NextResponse } from 'next/server'
import { CollabSession, CollaborationSpaceKey, CollabSessionOptions, createSession, setReviewItems } from '@/lib/collab/store'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const spaceKey = body?.spaceKey as CollaborationSpaceKey
    if (!spaceKey?.projectId || !spaceKey?.scopeType) {
      return NextResponse.json({ success: false, error: 'Missing spaceKey' }, { status: 400 })
    }
    const options: CollabSessionOptions = body?.options || {}
    const session: CollabSession = {
      id: crypto.randomUUID(),
      spaceKey,
      round: 1,
      status: 'open',
      options,
      createdAt: new Date().toISOString(),
    }
    createSession(session)
    const items = Array.isArray((body as any)?.items) ? (body as any).items.map((i: any)=> ({
      id: String(i.id),
      title: String(i.title||''),
      logline: i.logline ? String(i.logline) : undefined,
      synopsis: i.synopsis ? String(i.synopsis) : undefined,
      details: i.details ? {
        genre: i.details.genre,
        duration: i.details.duration,
        targetAudience: i.details.targetAudience,
        tone: i.details.tone,
        structure: i.narrative_structure || i.details.structure
      } : undefined,
      characters: Array.isArray(i.characters) ? i.characters.map((c:any)=> ({ name: String(c.name||c.role||''), role: c.role, description: c.description })) : undefined,
      beats: Array.isArray(i.beat_outline) ? i.beat_outline.map((b:any, idx:number)=> ({ beat_number: b.beat_number || (idx+1), beat_title: b.beat_title || b.title, beat_description: b.beat_description || b.description, duration_estimate: b.duration_estimate })) : undefined,
    })) : []
    if (items.length) setReviewItems(session.id, items)
    return NextResponse.json({ success: true, sessionId: session.id, items })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}


