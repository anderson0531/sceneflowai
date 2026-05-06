import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runExpress } from '@/lib/sceneGeneration/expressOrchestrator'
import type { ExpressEvent, ExpressOptions } from '@/lib/sceneGeneration/types'

export const runtime = 'nodejs'
export const maxDuration = 600

interface ExpressRequest {
  projectId: string
  language?: string
  includeMusic?: boolean
  includeSFX?: boolean
  regenerate?: boolean
  imageQuality?: string
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
    includeMusic = false,
    includeSFX = false,
    regenerate = false,
    imageQuality,
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

  const protocol = req.headers.get('x-forwarded-proto') || 'http'
  const host = req.headers.get('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`
  const authCookie = req.headers.get('cookie') || ''

  const options: ExpressOptions = {
    projectId,
    language,
    includeMusic,
    includeSFX,
    regenerate,
    imageQuality,
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
        })

        // Single atomic DB write at the end
        const freshProject = await Project.findByPk(projectId)
        if (freshProject) {
          const freshMetadata = freshProject.metadata || {}
          const freshVisionPhase = freshMetadata.visionPhase || {}
          const nested = !!freshVisionPhase?.script?.script?.scenes?.length
          const orchestratedScenes =
            project.metadata?.visionPhase?.script?.script?.scenes ||
            project.metadata?.visionPhase?.script?.scenes ||
            []

          await freshProject.update({
            metadata: {
              ...freshMetadata,
              visionPhase: {
                ...freshVisionPhase,
                script: nested
                  ? {
                      ...freshVisionPhase.script,
                      script: {
                        ...freshVisionPhase.script?.script,
                        scenes: orchestratedScenes,
                      },
                    }
                  : {
                      ...freshVisionPhase.script,
                      scenes: orchestratedScenes,
                    },
              },
            },
          })

          console.log(
            `[Express] Atomic DB update complete (success=${result.successScenes}, failed=${result.failedScenes})`
          )
        }
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
