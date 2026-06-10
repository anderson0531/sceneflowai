import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sequelize } from '@/config/database'
import Project from '@/models/Project'
import { resolveStoryboardScenes } from '@/lib/storyboard/resolveStoryboardScenes'
import { runExpressVeoSfx } from '@/lib/sfx/expressVeoSfxOrchestrator'
import type { ExpressVeoSfxEvent } from '@/lib/sfx/expressVeoSfxTypes'
import {
  resolveVeoSfxClipDuration,
  type VeoSfxClipDuration,
} from '@/lib/sfx/veoSfxDuration'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 600

interface ExpressVeoSfxRequestBody {
  projectId?: string
  sceneIndex?: number
  beatIds?: string[]
  durationSeconds?: number
  durationOverride?: SfxDurationOverride
  regenerate?: boolean
}

function toClipDuration(
  durationSeconds: number | undefined,
  durationOverride: SfxDurationOverride | undefined
): VeoSfxClipDuration {
  if (durationSeconds === 4 || durationSeconds === 6 || durationSeconds === 8) {
    return durationSeconds
  }
  if (durationOverride && durationOverride !== 'auto') {
    return resolveVeoSfxClipDuration(
      durationOverride === 'short' ? 4 : durationOverride === 'medium' ? 8 : 8
    )
  }
  return resolveVeoSfxClipDuration(durationSeconds ?? 8)
}

function injectResolvedScenesIntoProject(project: any, resolvedScenes: any[]): void {
  if (!resolvedScenes.length) return
  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  const nested = !!visionPhase?.script?.script?.scenes?.length

  if (!metadata.visionPhase) metadata.visionPhase = visionPhase
  if (!metadata.visionPhase.script) metadata.visionPhase.script = visionPhase.script || {}

  if (nested) {
    if (!metadata.visionPhase.script.script) metadata.visionPhase.script.script = {}
    metadata.visionPhase.script.script.scenes = resolvedScenes
  } else {
    metadata.visionPhase.script.scenes = resolvedScenes
  }

  project.metadata = metadata
}

export async function POST(req: NextRequest) {
  let body: ExpressVeoSfxRequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const projectId = body.projectId?.trim()
  const sceneIndex = body.sceneIndex
  const beatIds = Array.isArray(body.beatIds)
    ? body.beatIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : []

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }
  if (sceneIndex === undefined || sceneIndex < 0) {
    return NextResponse.json({ error: 'sceneIndex is required' }, { status: 400 })
  }
  if (beatIds.length === 0) {
    return NextResponse.json({ error: 'beatIds must be a non-empty array' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await sequelize.authenticate()
  const project = await Project.findByPk(projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const visionPhase = project.metadata?.visionPhase || {}
  const resolvedScenes = resolveStoryboardScenes({
    script: visionPhase.script,
    visionPhaseScenes: visionPhase.scenes,
  })
  if (resolvedScenes.length > 0) {
    injectResolvedScenesIntoProject(project, resolvedScenes)
  }

  const clipDurationSeconds = toClipDuration(body.durationSeconds, body.durationOverride)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ExpressVeoSfxEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (err) {
          console.error('[Express Veo SFX] Failed to enqueue SSE event:', err)
        }
      }

      try {
        await runExpressVeoSfx(
          project,
          {
            projectId,
            sceneIndex,
            beatIds,
            clipDurationSeconds,
            regenerate: !!body.regenerate,
            userId,
          },
          send
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[Express Veo SFX] Orchestrator error:', message)
        send({ type: 'error', error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
