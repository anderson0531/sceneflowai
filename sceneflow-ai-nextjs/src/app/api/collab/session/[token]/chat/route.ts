'use server'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CollabSession, CollabParticipant, CollabChatMessage } from '../../../../../../models'

const ChatSchema = z.object({ participantId: z.string().uuid(), content: z.string().min(1).max(5000) })

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json()
    const { participantId, content } = ChatSchema.parse(body)
    const session = await CollabSession.findOne({ where: { token: params.token, status: 'active' } })
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const participant = await CollabParticipant.findOne({ where: { id: participantId, session_id: (session as any).id } })
    if (!participant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rec = await CollabChatMessage.create({ session_id: (session as any).id, participant_id: participantId, content })
    return NextResponse.json({ success: true, id: (rec as any).id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad Request' }, { status: 400 })
  }
}


