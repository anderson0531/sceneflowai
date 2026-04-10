import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { trackCost } from '@/lib/credits/costTracking'
import { licenseEpidemicSfx } from '@/lib/audio/epidemicClient'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EPIDEMIC_SFX_CREDITS = AUDIO_CREDITS.SOUND_EFFECT || 15

async function persistSfxAudio(
  projectId: string,
  sceneIndex: number,
  sfxIndex: number,
  audioUrl: string
) {
  await sequelize.authenticate()
  const project = await Project.findByPk(projectId)
  if (!project) throw new Error('Project not found')

  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  const script = visionPhase.script || {}
  const scenes = script.script?.scenes || script.scenes || []

  const updatedScenes = scenes.map((scene: any, idx: number) => {
    if (idx !== sceneIndex) return scene
    const nextScene = { ...scene }
    const sfxAudio = Array.isArray(nextScene.sfxAudio) ? [...nextScene.sfxAudio] : []
    sfxAudio[sfxIndex] = audioUrl
    nextScene.sfxAudio = sfxAudio

    if (Array.isArray(nextScene.sfx) && nextScene.sfx[sfxIndex] && typeof nextScene.sfx[sfxIndex] === 'object') {
      nextScene.sfx = nextScene.sfx.map((entry: any, entryIdx: number) =>
        entryIdx === sfxIndex ? { ...entry, url: audioUrl } : entry
      )
    }
    return nextScene
  })

  const updatedScript = script.script?.scenes
    ? { ...script, script: { ...script.script, scenes: updatedScenes } }
    : { ...script, scenes: updatedScenes }

  await project.update({
    metadata: {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        script: updatedScript,
      },
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { assetId, projectId, sceneIndex, sfxIndex, commit = false } = await req.json()
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 })
    }

    let userId: string | undefined
    if (commit) {
      const session = await getServerSession(authOptions)
      userId = session?.user?.id
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (commit) {
      const hasCredits = await CreditService.ensureCredits(userId!, EPIDEMIC_SFX_CREDITS)
      if (!hasCredits) {
        return NextResponse.json(
          { error: 'Insufficient credits', required: EPIDEMIC_SFX_CREDITS, operation: 'epidemic_sfx' },
          { status: 402 }
        )
      }
    }

    const licensedUrl = await licenseEpidemicSfx(assetId, projectId)

    if (commit) {
      try {
        await CreditService.charge(userId!, EPIDEMIC_SFX_CREDITS, 'ai_usage', projectId || null, {
          operation: 'epidemic_sfx',
          assetId,
          sceneIndex,
          sfxIndex,
        })
        await trackCost(userId!, 'epidemic_sfx', EPIDEMIC_SFX_CREDITS, {
          projectId,
          sceneId: sceneIndex !== undefined ? `scene-${sceneIndex}` : undefined,
        })
      } catch (chargeErr) {
        console.error('[Epidemic Select] Credit charge failed:', chargeErr)
      }
    }

    if (
      commit &&
      projectId &&
      Number.isInteger(sceneIndex) &&
      Number.isInteger(sfxIndex)
    ) {
      await persistSfxAudio(projectId, sceneIndex, sfxIndex, licensedUrl)
    }

    return NextResponse.json({
      success: true,
      url: licensedUrl,
      chargedCredits: commit ? EPIDEMIC_SFX_CREDITS : 0,
    })
  } catch (error: any) {
    console.error('[Epidemic Select] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to select Epidemic SFX' },
      { status: 500 }
    )
  }
}
