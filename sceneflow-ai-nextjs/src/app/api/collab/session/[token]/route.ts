'use server'

import { NextRequest, NextResponse } from 'next/server'
import { CollabSession, CollabParticipant } from '../../../../../models'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token
  const session = await CollabSession.findOne({ where: { token, status: 'active' } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const participants = await CollabParticipant.findAll({ where: { session_id: (session as any).id } })
  return NextResponse.json({
    success: true,
    session: {
      id: (session as any).id,
      project_id: (session as any).project_id,
      status: (session as any).status,
      expires_at: (session as any).expires_at,
      payload: (session as any).payload || null,
    },
    participants: participants.map((p: any) => ({ id: p.id, name: p.name, email: p.email, role: p.role })),
  })
}


