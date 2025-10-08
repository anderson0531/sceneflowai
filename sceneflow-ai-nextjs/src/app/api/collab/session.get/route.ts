import { NextRequest, NextResponse } from 'next/server'
import {
  getSession,
  getReviewItems,
  setReviewItems,
  createSession,
} from '@/lib/collab/store'

export const runtime = 'nodejs'

function decodeTokenToJson(token: string): any | null {
  try {
    const urlDecoded = decodeURIComponent(token)
    // Use Buffer for Node.js safe base64 decoding
    const utf8 = Buffer.from(urlDecoded, 'base64').toString('utf-8')
    return JSON.parse(utf8)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId') || ''
  const token = searchParams.get('t') || ''
  if (!sessionId) return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
  let session = getSession(sessionId)
  let items = getReviewItems(sessionId)

  // If the in-memory store is cold, optionally hydrate from a URL token (t)
  if ((!session || items.length === 0) && token) {
    const json = decodeTokenToJson(token)
    const arr = Array.isArray(json?.items) ? json.items : []
    if (arr.length) {
      // Lazily create a lightweight session if missing
      if (!session) {
        createSession({
          id: sessionId,
          spaceKey: { projectId: 'public', scopeType: 'concepts' },
          round: 1,
          status: 'open',
          options: {},
          createdAt: new Date().toISOString(),
        })
        session = getSession(sessionId)
      }
      setReviewItems(sessionId, arr)
      items = getReviewItems(sessionId)
    }
  }

  if (!session) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, session, items })
}


