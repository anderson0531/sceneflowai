import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import {
  applyPolicyComplianceToPrompt,
  fallbackReferenceStillPrompt,
  isReferenceStillKind,
  type DirectReferenceStillRequest,
  type ReferenceStillDirectorMode,
} from '@/lib/intelligence/reference-still-director-fallback'
import { directReferenceStill } from '@/lib/intelligence/reference-still-director'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const kind = body.kind
    const mode = body.mode as ReferenceStillDirectorMode
    const currentPrompt = typeof body.currentPrompt === 'string' ? body.currentPrompt : ''
    const enteredUserDirection =
      typeof body.userDirection === 'string' ? body.userDirection : undefined
    const policyCompliance = body.policyCompliance === true
    const context =
      body.context && typeof body.context === 'object'
        ? (body.context as DirectReferenceStillRequest['context'])
        : undefined

    if (!projectId || !currentPrompt.trim()) {
      return NextResponse.json(
        { error: 'projectId and currentPrompt are required' },
        { status: 400 }
      )
    }
    if (!isReferenceStillKind(kind)) {
      return NextResponse.json({ error: 'kind is required' }, { status: 400 })
    }
    if (mode !== 'optimize' && mode !== 'rewrite') {
      return NextResponse.json({ error: 'mode must be optimize or rewrite' }, { status: 400 })
    }

    try {
      await sequelize.authenticate()
    } catch {
      // Project lookup still attempted; some environments lazy-connect.
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { storyLocale, properNouns } = await resolveRequestStoryLocale(req, { projectId })
    const userDirection = enteredUserDirection
      ? await englishForModel(enteredUserDirection, storyLocale, properNouns)
      : undefined

    const request: DirectReferenceStillRequest = {
      kind,
      mode,
      currentPrompt,
      userDirection,
      policyCompliance,
      context,
    }

    try {
      const result = await directReferenceStill(request)
      let prompt = result.prompt
      if (!prompt) {
        prompt = fallbackReferenceStillPrompt(request)
      }
      if (policyCompliance) {
        prompt = applyPolicyComplianceToPrompt(prompt)
      }
      return NextResponse.json({
        success: true,
        usedAI: result.usedAI && Boolean(result.prompt),
        fallbackReason: result.fallbackReason,
        prompt,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[direct-reference-still] Gemini failed: ${message}`)
      const prompt = fallbackReferenceStillPrompt(request)
      return NextResponse.json({
        success: true,
        usedAI: false,
        fallbackReason: message,
        prompt,
      })
    }
  } catch (error: unknown) {
    console.error('[direct-reference-still] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
