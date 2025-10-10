'use server'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { CollabSession, CollabParticipant, Project } from '../../../../models'
import { sequelize } from '../../../../config/database'
import { AuthService } from '../../../../services/AuthService'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'

const CreateSchema = z.object({
  projectId: z.string().uuid(),
  // Optional snapshot payload (variants etc.)
  payload: z.any().optional(),
  expiresInDays: z.number().int().min(1).max(60).default(14),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, payload, expiresInDays } = CreateSchema.parse(body)

    // Identify owner via NextAuth session first, fallback to Bearer token
    let ownerUserId: string | null = null
    let ownerEmail: string | null = null
    let ownerName: string | null = null

    try {
      const session: any = await getServerSession(authOptions as any)
      if (session && session.user) {
        ownerUserId = session.user.id || null
        ownerEmail = session.user.email || null
        ownerName = session.user.name || null
      }
    } catch {}

    if (!ownerUserId) {
      const auth = req.headers.get('authorization') || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (token) {
        const vr = await AuthService.verifyToken(token)
        if (vr.success && vr.user) {
          ownerUserId = vr.user.id
          ownerEmail = vr.user.email
          ownerName = (vr.user as any).username || vr.user.email
        }
      }
    }

    if (!ownerUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Confirm project exists and belongs to owner
    const proj = await Project.findByPk(projectId)
    if (!proj) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if ((proj as any).user_id && (proj as any).user_id !== ownerUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const t = await sequelize.transaction()
    try {
      const tokenStr = crypto.randomBytes(24).toString('base64url')
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      const session = await CollabSession.create({
        project_id: projectId,
        owner_user_id: ownerUserId,
        token: tokenStr,
        status: 'active',
        expires_at: expiresAt,
        payload: payload || null,
      }, { transaction: t })

      await CollabParticipant.create({
        session_id: session.id,
        name: ownerName || 'Owner',
        email: ownerEmail || 'owner@example.com',
        role: 'owner',
      }, { transaction: t })

      await t.commit()
      return NextResponse.json({ success: true, token: tokenStr })
    } catch (e) {
      await t.rollback()
      throw e
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad Request' }, { status: 400 })
  }
}


