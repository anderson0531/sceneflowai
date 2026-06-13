import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runExpress } from '@/lib/sceneGeneration/expressOrchestrator'
import type { ExpressEvent, ExpressOptions } from '@/lib/sceneGeneration/types'
import {
  auditStoryboardSceneMedia,
  mergeExpressOrchestratedScenes,
} from '@/lib/storyboard/mergeSceneMedia'
import { resolveStoryboardScenes } from '@/lib/storyboard/resolveStoryboardScenes'

export const runtime = 'nodejs'
export const maxDuration = 600

interface ExpressRequest {
  projectId: string
  language?: string
  artStyle?: string
  includeMusic?: boolean
  includeEndFrames?: boolean
  missingFramesOnly?: boolean
  includeSFX?: boolean
  regenerate?: boolean
  imageQuality?: string
  storyboardQuality?: 'draft' | 'final'
  finalizeOnly?: boolean
  mode?: 'batch' | 'scene'
  sceneIndices?: number[]
  dialogueOnly?: boolean
  framesOnly?: boolean
  selectedFrameKeys?: string[]
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

function getOrchestratedScenes(project: any): any[] {
  const visionPhase = project.metadata?.visionPhase || {}
  return (
    visionPhase?.script?.script?.scenes ||
    visionPhase?.script?.scenes ||
    []
  )
}

function getFreshDbScenes(freshVisionPhase: any): any[] {
  return (
    freshVisionPhase?.script?.script?.scenes ||
    freshVisionPhase?.script?.scenes ||
    []
  )
}

async function persistExpressScenes(
  projectId: string,
  orchestratedProject: any,
  options: ExpressOptions,
  auditLabel?: string
): Promise<void> {
  const freshProject = await Project.findByPk(projectId)
  if (!freshProject) return

  const freshMetadata = freshProject.metadata || {}
  const freshVisionPhase = freshMetadata.visionPhase || {}
  const orchestratedVisionPhase = orchestratedProject?.metadata?.visionPhase || {}
  const nested = !!freshVisionPhase?.script?.script?.scenes?.length

  const freshDbScenes = getFreshDbScenes(freshVisionPhase)
  const orchestratedScenes = getOrchestratedScenes(orchestratedProject)

  if (auditLabel) {
    console.log(`[Express] Storyboard audit ${auditLabel}:`, {
      freshDb: auditStoryboardSceneMedia(freshDbScenes),
      orchestrated: auditStoryboardSceneMedia(orchestratedScenes),
    })
  }

  const mergedScenes = mergeExpressOrchestratedScenes(
    orchestratedScenes,
    freshDbScenes
  )

  if (auditLabel) {
    console.log(`[Express] Storyboard audit after merge ${auditLabel}:`, {
      merged: auditStoryboardSceneMedia(mergedScenes),
    })
  }

  await freshProject.update({
    metadata: {
      ...freshMetadata,
      visionPhase: {
        ...freshVisionPhase,
        ...(orchestratedVisionPhase.translations
          ? { translations: orchestratedVisionPhase.translations }
          : {}),
        ...(orchestratedVisionPhase.playerLabels
          ? { playerLabels: orchestratedVisionPhase.playerLabels }
          : {}),
        artStyle: options.artStyle || freshVisionPhase.artStyle || 'photorealistic',
        scenes: mergedScenes,
        script: nested
          ? {
              ...freshVisionPhase.script,
              script: {
                ...freshVisionPhase.script?.script,
                scenes: mergedScenes,
              },
            }
          : {
              ...freshVisionPhase.script,
              scenes: mergedScenes,
            },
      },
    },
  })
}

export async function POST(req: NextRequest) {
  let body: ExpressRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const {
    projectId,
    language = 'en',
    artStyle = 'photorealistic',
    includeMusic = false,
    includeSFX = false,
    includeEndFrames = false,
    missingFramesOnly = false,
    regenerate = false,
    imageQuality,
    storyboardQuality,
    finalizeOnly = false,
    mode = 'batch',
    sceneIndices,
    dialogueOnly = false,
    framesOnly = false,
    selectedFrameKeys,
  } = body || {}

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  // Auth check
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || session?.user?.email
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  await sequelize.authenticate()
  const project = await Project.findByPk(projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Merge fragmented storyboard storage before orchestrator reads scenes
  const visionPhase = project.metadata?.visionPhase || {}
  const resolvedScenes = resolveStoryboardScenes({
    script: visionPhase.script,
    visionPhaseScenes: visionPhase.scenes,
  })
  if (resolvedScenes.length > 0) {
    injectResolvedScenesIntoProject(project, resolvedScenes)
  }

  const protocol = req.headers.get('x-forwarded-proto') || 'http'
  const host = req.headers.get('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`
  const authCookie = req.headers.get('cookie') || ''

  const options: ExpressOptions = {
    projectId,
    language,
    artStyle,
    includeMusic,
    includeSFX,
    includeEndFrames: !!includeEndFrames,
    missingFramesOnly: !!missingFramesOnly,
    regenerate,
    imageQuality,
    storyboardQuality,
    finalizeOnly: !!finalizeOnly,
    dialogueOnly: !!dialogueOnly,
    framesOnly: !!framesOnly,
    ...(Array.isArray(selectedFrameKeys) && selectedFrameKeys.length > 0
      ? { selectedFrameKeys }
      : {}),
    mode: mode === 'scene' ? 'scene' : 'batch',
    ...(Array.isArray(sceneIndices) && sceneIndices.length > 0
      ? { sceneIndices }
      : {}),
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ExpressEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        } catch (err) {
          console.error('[Express] Failed to enqueue SSE event:', err)
        }
      }

      try {
        const result = await runExpress({
          project,
          options,
          baseUrl,
          authCookie,
          emit: send,
          onSceneComplete: async (sceneIndex, summary) => {
            if (!summary.ok) return
            try {
              await persistExpressScenes(projectId, project, options)
              send({
                type: 'scene-persisted',
                sceneIndex,
                sceneNumber: sceneIndex + 1,
              })
            } catch (persistErr: any) {
              console.error(
                `[Express] Checkpoint persist failed for scene ${sceneIndex + 1}:`,
                persistErr?.message || persistErr
              )
            }
          },
        })

        // Final atomic DB write — orchestrated scenes are canonical
        await persistExpressScenes(
          projectId,
          project,
          options,
          'before final save'
        )

        console.log(
          `[Express] Atomic DB update complete (mode=${options.mode}, success=${result.successScenes}, failed=${result.failedScenes})`
        )
      } catch (error: any) {
        console.error('[Express] Orchestrator error:', error)
        send({ type: 'error', error: error?.message || String(error) })
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
