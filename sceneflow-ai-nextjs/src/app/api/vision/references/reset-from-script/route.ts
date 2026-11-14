import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { resetContinuityFromScript } from '@/lib/vision/resetContinuityFromScript'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { projectId, preservePortraitsAndVoices } = body as {
      projectId?: string
      preservePortraitsAndVoices?: boolean
    }

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const result = await resetContinuityFromScript({
      projectId,
      userId,
      preservePortraitsAndVoices: preservePortraitsAndVoices === true,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[Reset Continuity From Script] Error:', error)
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to reset Continuity Library from script' },
      { status }
    )
  }
}
