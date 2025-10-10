'use server'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CollabSession, CollabParticipant, CollabScore } from '../../../../../../models'

const ScoreSchema = z.object({ participantId: z.string().uuid(), variantId: z.string().min(1).max(32), score: z.number().int().min(1).max(5) })

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json()
    const { participantId, variantId, score } = ScoreSchema.parse(body)
    const session = await CollabSession.findOne({ where: { token: params.token, status: 'active' } })
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const participant = await CollabParticipant.findOne({ where: { id: participantId, session_id: (session as any).id } })
    if (!participant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [rec] = await CollabScore.upsert({ session_id: (session as any).id, participant_id: participantId, variant_id: variantId, score })
    return NextResponse.json({ success: true, score: (rec as any).score })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad Request' }, { status: 400 })
  }
}


