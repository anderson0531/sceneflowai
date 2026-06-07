import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import Project from '@/models/Project'
import User from '@/models/User'
import { sequelize } from '@/config/database'
import { buildImportedVisionMetadata } from '@/lib/script/buildImportedVisionMetadata'
import type { ParsedScript } from '@/lib/script/scriptParser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/projects/from-script
 *
 * Creates a new project from an imported script (Blueprint bypass).
 * Expects pre-parsed script data; builds v2-canonical metadata server-side.
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    userId = session.user.id

    const body = await request.json()
    const parsedScript = body.parsedScript as ParsedScript | undefined
    const importCompletenessScore = body.importCompletenessScore as number | undefined
    const importGapsResolved = Boolean(body.importGapsResolved)

    console.log('[from-script] Request received for user:', userId)

    if (!parsedScript?.scenes) {
      return NextResponse.json(
        { success: false, error: 'parsedScript with scenes is required' },
        { status: 400 }
      )
    }

    console.log('[from-script] Received parsed script:', {
      title: parsedScript.title,
      sceneCount: parsedScript.scenes?.length || 0,
      characterCount: parsedScript.characters?.length || 0,
      totalDuration: parsedScript.metadata?.totalDuration,
      format: parsedScript.metadata?.format,
      importCompletenessScore,
      importGapsResolved,
    })

    await sequelize.authenticate()

    let user = await User.findByPk(userId)
    if (!user) {
      console.log('[from-script] User not found, creating user:', userId)
      user = await User.create({
        id: userId,
        email: session.user.email || `user-${userId}@temp.sceneflow.ai`,
        username: session.user.username || `user_${userId.slice(0, 8)}`,
        password_hash: 'oauth-user',
        is_active: true,
        email_verified: Boolean(session.user.email),
      })
    }

    const built = buildImportedVisionMetadata({
      parsedScript,
      importCompletenessScore,
      importGapsResolved,
    })

    const characterNames =
      parsedScript.characters?.map((c) => c.name).join(', ') || 'No characters detected'
    const description = `Imported script with ${built.sceneCount} scenes and ${built.characterCount} characters: ${characterNames}`

    const project = await Project.create({
      user_id: userId,
      title: built.projectTitle,
      description: description.slice(0, 5000),
      genre: built.genre,
      duration: built.totalDuration,
      tone: 'imported',
      current_step: 'storyboard',
      status: 'in_progress',
      metadata: built.metadata,
    })

    console.log('[from-script] Created project:', {
      id: project.id,
      title: project.title,
      duration: project.duration,
      hasVisionPhase: !!project.metadata?.visionPhase,
      sceneCount: built.sceneCount,
    })

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        duration: project.duration,
        currentStep: project.current_step,
        status: project.status,
        metadata: {
          importedScript: true,
          importSource: 'script-import',
          sceneCount: built.sceneCount,
          characterCount: built.characterCount,
        },
      },
      redirect: `/dashboard/workflow/vision/${project.id}`,
    })
  } catch (error: unknown) {
    const err = error as Error
    console.error('[from-script] CRITICAL ERROR:', {
      error: err.message,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
      hasUserId: !!userId,
    })

    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${err.message}`,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: 500 }
    )
  }
}
