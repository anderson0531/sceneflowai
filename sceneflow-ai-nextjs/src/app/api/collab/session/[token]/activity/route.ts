'use server'

import { NextRequest, NextResponse } from 'next/server'
import { CollabSession, CollabParticipant, CollabScore, CollabComment, CollabRecommendation, CollabChatMessage } from '../../../../../../models'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token
  const session = await CollabSession.findOne({ where: { token, status: 'active' } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const sessionId = (session as any).id

  const [scores, comments, recs, chat] = await Promise.all([
    CollabScore.findAll({ where: { session_id: sessionId } }),
    CollabComment.findAll({ where: { session_id: sessionId } }),
    CollabRecommendation.findAll({ where: { session_id: sessionId } }),
    CollabChatMessage.findAll({ where: { session_id: sessionId }, order: [['created_at','DESC']], limit: 100 }),
  ])

  const etagSource = `${scores.length}-${comments.length}-${recs.length}-${chat.length}-${(session as any).updated_at?.getTime?.() || ''}`
  const etag = Buffer.from(etagSource).toString('base64url')
  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(undefined, { status: 304, headers: { ETag: etag } })
  }

  return NextResponse.json({
    success: true,
    etag,
    scores: scores.map((s: any) => ({ participantId: s.participant_id, variantId: s.variant_id, score: s.score })),
    comments: comments.map((c: any) => ({ id: c.id, participantId: c.participant_id, variantId: c.variant_id, section: c.section, path: c.path, content: c.content, createdAt: c.created_at })),
    recommendations: recs.map((r: any) => ({ id: r.id, participantId: r.participant_id, variantId: r.variant_id, title: r.title, details: r.details, status: r.status, createdAt: r.created_at })),
    chat: chat.map((m: any) => ({ id: m.id, participantId: m.participant_id, content: m.content, createdAt: m.created_at })),
  }, { headers: { ETag: etag } })
}


