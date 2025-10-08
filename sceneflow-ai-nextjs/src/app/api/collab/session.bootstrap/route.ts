import { NextRequest, NextResponse } from 'next/server'
import { CollabSession, CollaborationSpaceKey, CollabSessionOptions, createSession, getSession, setReviewItems } from '@/lib/collab/store'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>null)
    const sessionId = body?.sessionId as string
    const items = Array.isArray(body?.items) ? body.items : []
    if (!sessionId || !items.length) {
      return NextResponse.json({ success: false, error: 'Missing sessionId or items' }, { status: 400 })
    }
    let session = getSession(sessionId)
    if (!session) {
      const spaceKey: CollaborationSpaceKey = body?.spaceKey || { projectId: 'public', scopeType: 'concepts' }
      const options: CollabSessionOptions = body?.options || {}
      const s: CollabSession = {
        id: sessionId,
        spaceKey,
        round: 1,
        status: 'open',
        options,
        createdAt: new Date().toISOString(),
      }
      createSession(s)
      session = s
    }
    setReviewItems(sessionId, items)
    return NextResponse.json({ success: true })
  } catch (e:any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}

 

