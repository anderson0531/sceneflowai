import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sequelize } from '@/config/database'
import CollabParticipant from '@/models/CollabParticipant'
import { resolveBlueprintShareByToken } from '@/lib/blueprint/shareSession'
import { isBlueprintFeedbackAllowed } from '@/lib/blueprint/shareSettings'
import { resolveDemoBlueprintToken } from '@/lib/blueprint/demoBlueprintShare'

export const runtime = 'nodejs'

const RegisterSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal('')),
})

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const body = RegisterSchema.parse(await req.json())

    if (resolveDemoBlueprintToken(token)) {
      return NextResponse.json({
        success: true,
        participantId: `demo-reviewer-${Date.now()}`,
        name: body.name.trim(),
        demoSandbox: true,
      })
    }

    await sequelize.authenticate()

    const resolved = await resolveBlueprintShareByToken(token)
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }
    const { session, payload } = resolved
    if (!isBlueprintFeedbackAllowed(payload.shareSettings)) {
      return NextResponse.json(
        { success: false, error: 'Feedback is disabled for this share' },
        { status: 403 }
      )
    }

    const email = body.email?.trim() || null
    let participant = email
      ? await CollabParticipant.findOne({
          where: { session_id: session.id, email },
        })
      : null

    if (!participant) {
      participant = await CollabParticipant.create({
        session_id: session.id,
        name: body.name.trim(),
        email: email || '',
        role: 'collaborator',
      })
    } else if (participant.name !== body.name.trim()) {
      await participant.update({ name: body.name.trim() })
    }

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      name: participant.name,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Bad request'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
