'use server'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CollabSession, CollabParticipant } from '../../../../../../models'

const RegisterSchema = z.object({ name: z.string().min(2).max(120), email: z.string().email() })

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json()
    const { name, email } = RegisterSchema.parse(body)
    const session = await CollabSession.findOne({ where: { token: params.token, status: 'active' } })
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let participant = await CollabParticipant.findOne({ where: { session_id: (session as any).id, email } })
    if (!participant) {
      participant = await CollabParticipant.create({ session_id: (session as any).id, name, email, role: 'collaborator' })
    }

    return NextResponse.json({ success: true, participantId: (participant as any).id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad Request' }, { status: 400 })
  }
}


