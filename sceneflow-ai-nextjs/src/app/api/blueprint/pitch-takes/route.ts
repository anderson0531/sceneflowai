import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminUtils'
import { loadRecentUserCharacterNames } from '@/lib/treatment/creativeEntropy'
import { generateShowrunnerPitchTakes } from '@/lib/treatment/showrunnerPipeline'

export const maxDuration = 60

/**
 * POST /api/blueprint/pitch-takes
 *
 * Stage 1 Interactive Director's Takes endpoint: returns 3 genuinely distinct
 * 1-paragraph Showrunner pitches for a sparse creator synopsis so Studio users
 * can 1-click pick their favorite "wow" angle before compiling the full Blueprint.
 */
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null

    const body = await req.json()
    const input = typeof body?.input === 'string' ? body.input.trim() : ''
    if (!input) {
      return NextResponse.json(
        { success: false, message: 'Input synopsis is required' },
        { status: 400 }
      )
    }

    const recentProjectNames = await loadRecentUserCharacterNames(session?.user?.id)
    const { entropySeed, takes } = await generateShowrunnerPitchTakes({
      input,
      genre: typeof body?.genre === 'string' ? body.genre : undefined,
      tone: typeof body?.tone === 'string' ? body.tone : undefined,
      targetAudience: typeof body?.targetAudience === 'string' ? body.targetAudience : undefined,
      format: typeof body?.format === 'string' ? body.format : undefined,
      recentProjectNames,
      projectId: typeof body?.projectId === 'string' ? body.projectId : undefined,
      userId: session?.user?.id,
      isAdmin: Boolean(session?.user?.email && isAdminEmail(session.user.email)),
    })

    return NextResponse.json({
      success: true,
      seedId: entropySeed.seedId,
      isSparseInput: entropySeed.isSparseInput,
      takes,
    })
  } catch (err) {
    console.error('[Blueprint Pitch Takes] Error:', err)
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to generate Director Takes',
      },
      { status: 500 }
    )
  }
}
