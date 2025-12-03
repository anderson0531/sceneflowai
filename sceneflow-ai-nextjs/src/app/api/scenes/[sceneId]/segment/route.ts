import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import {
  generateSegmentPlan,
  generateSegmentPrompts,
  PromptContext,
  SegmentPlan,
  SegmentPrompt,
} from '@/lib/sceneProduction'
import { callLLM } from '@/services/llmGateway'

interface SegmentRequestBody {
  projectId?: string
  targetSegmentDuration?: number
  regenerate?: boolean
  preferredProvider?: 'openai' | 'gemini'
}

const DEFAULT_SEGMENT_DURATION = 8
const MIN_SEGMENT_DURATION = 4
const FALLBACK_OPENAI_MODEL = process.env.SCENE_PRODUCTION_OPENAI_MODEL ?? 'gpt-4o-mini'
const FALLBACK_GEMINI_MODEL = process.env.SCENE_PRODUCTION_GEMINI_MODEL ?? 'gemini-3-pro-preview'

export async function POST(request: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const sceneId = params.sceneId
    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'sceneId is required in route params' }, { status: 400 })
    }

    const body = (await request.json()) as SegmentRequestBody
    const projectId = body.projectId
    const targetDuration = Math.max(
      MIN_SEGMENT_DURATION,
      Number.isFinite(body.targetSegmentDuration ?? 0) ? Number(body.targetSegmentDuration) : DEFAULT_SEGMENT_DURATION
    )

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const metadata = project.metadata ?? {}
    const visionPhase = metadata.visionPhase ?? {}
    const scriptScenes =
      visionPhase?.script?.script?.scenes ??
      visionPhase?.script?.scenes ??
      visionPhase?.scenes ??
      []

    if (!Array.isArray(scriptScenes) || scriptScenes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No scenes found in project metadata' },
        { status: 400 }
      )
    }

    const { scene, index: sceneIndex } = findSceneById(scriptScenes, sceneId)
    if (!scene) {
      return NextResponse.json({ success: false, error: 'Scene not found' }, { status: 404 })
    }

    const sceneDirection = scene.sceneDirection ?? visionPhase?.sceneDirections?.[sceneId] ?? null
    const sceneScript = scene

    const plan = await generateSegmentPlan({
      sceneDirection,
      sceneScript,
      targetSegmentDuration: targetDuration,
    })

    const promptResult = await resolvePromptGeneration({
      sceneDirection,
      sceneScript,
      segmentPlan: plan,
      projectMetadata: metadata,
      preferredProvider: body.preferredProvider,
    })

    const productionData = buildProductionData(plan, promptResult, targetDuration)

    const updatedScenes = scriptScenes.map((entry: any, idx: number) => {
      if (idx !== sceneIndex) return entry
      return {
        ...entry,
        productionData,
      }
    })

    const updatedVisionPhase = {
      ...visionPhase,
      scenes: updatedScenes,
      script: visionPhase.script
        ? {
            ...visionPhase.script,
            script: {
              ...visionPhase.script.script,
              scenes: updatedScenes,
            },
          }
        : visionPhase.script,
      production: {
        lastUpdated: new Date().toISOString(),
        scenes: {
          ...(visionPhase?.production?.scenes ?? {}),
          [sceneId]: productionData,
        },
      },
    }

    const updatedMetadata = {
      ...metadata,
      visionPhase: updatedVisionPhase,
    }

    await project.update({ metadata: updatedMetadata })

    return NextResponse.json({
      success: true,
      productionData,
      segmentPlan: plan,
      prompts: promptResult.segments,
      llmProvider: promptResult.provider ?? 'fallback',
      metadata: updatedMetadata,
    })
  } catch (error) {
    console.error('[Scene Segmentation] Failed to segment scene', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    )
  }
}

function findSceneById(scenes: any[], sceneId: string): { scene: any | null; index: number } {
  const directIndex = scenes.findIndex((scene) => {
    const candidates = [scene?.sceneId, scene?.id, scene?.metadataId, scene?.slug]
    return candidates.some((value) => value && String(value) === String(sceneId))
  })
  if (directIndex >= 0) {
    return { scene: scenes[directIndex], index: directIndex }
  }

  const numericMatch = scenes.findIndex((scene) => {
    const candidates = [scene?.sceneId, scene?.id, scene?.sceneNumber]
    return candidates.some((value) => `scene-${value}` === String(sceneId))
  })

  if (numericMatch >= 0) {
    return { scene: scenes[numericMatch], index: numericMatch }
  }

  return { scene: null, index: -1 }
}

async function resolvePromptGeneration({
  sceneDirection,
  sceneScript,
  segmentPlan,
  projectMetadata,
  preferredProvider,
}: PromptContext & { preferredProvider?: 'openai' | 'gemini' }) {
  const context: PromptContext = {
    sceneDirection,
    sceneScript,
    segmentPlan,
    projectMetadata,
  }

  const attempts: Array<() => Promise<{ provider: string; segments: SegmentPrompt[] }>> = []

  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasGemini = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY

  const llmPrompt = buildLLMPrompt(context)

  if (preferredProvider === 'openai' && hasOpenAI) {
    attempts.push(() => generateViaLLM('openai', llmPrompt, segmentPlan))
  } else if (preferredProvider === 'gemini' && hasGemini) {
    attempts.push(() => generateViaLLM('gemini', llmPrompt, segmentPlan))
  }

  if (hasOpenAI && preferredProvider !== 'openai') {
    attempts.push(() => generateViaLLM('openai', llmPrompt, segmentPlan))
  }
  if (hasGemini && preferredProvider !== 'gemini') {
    attempts.push(() => generateViaLLM('gemini', llmPrompt, segmentPlan))
  }

  for (const attempt of attempts) {
    try {
      const result = await attempt()
      return { ...result, provider: result.provider }
    } catch (error) {
      console.warn('[Scene Segmentation] LLM prompt generation failed, falling back.', error)
    }
  }

  const fallback = await generateSegmentPrompts(context)
  return {
    provider: null,
    segments: fallback.segments,
  }
}

async function generateViaLLM(
  provider: 'openai' | 'gemini',
  prompt: string,
  plan: SegmentPlan
): Promise<{ provider: string; segments: SegmentPrompt[] }> {
  const model = provider === 'openai' ? FALLBACK_OPENAI_MODEL : FALLBACK_GEMINI_MODEL
  const response = await callLLM(
    {
      provider,
      model,
    },
    prompt
  )

  const parsed = JSON.parse(response) as Array<{
    segmentIndex?: number
    startTime?: number
    endTime?: number
    prompt?: string
    reason?: string
  }>

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('LLM returned empty prompt array')
  }

  const segments = plan.segments.map((segment, index) => {
    const fromLlm =
      parsed.find((entry) => entry.segmentIndex === index + 1) ??
      parsed[index] ??
      {}

    const promptText = fromLlm.prompt?.trim() || buildFallbackPrompt(segment, index)
    const reason = fromLlm.reason?.trim() || segment.reason

    return {
      segmentId: `segment-${index}`,
      sequenceIndex: index,
      startTime: segment.startTime,
      endTime: segment.endTime,
      reason,
      prompt: promptText,
    }
  })

  return { provider, segments }
}

function buildLLMPrompt(context: PromptContext): string {
  const { sceneDirection, sceneScript, segmentPlan } = context
  const segments = segmentPlan.segments
    .map(
      (segment, index) =>
        `${index + 1}. startTime: ${segment.startTime.toFixed(2)}, endTime: ${segment.endTime.toFixed(
          2
        )}, reason: ${segment.reason ?? 'Continuity'}`
    )
    .join('\n')

  return [
    `You are an expert film director and AI video prompt engineer.`,
    `Generate cinematic video prompts for each segment in the scene below.`,
    `Follow this exact JSON schema (array of objects):`,
    `[{ "segmentIndex": number, "startTime": number, "endTime": number, "reason": string, "prompt": string }]`,
    `Rules:`,
    `- Use the structured Task Format exactly as specified:`,
    `[TASK: ...] [VISUAL_STYLE: ...] [SCENE: ...] [CAMERA: ...] [ACTION: ...] [DIALOGUE/SFX: ...]`,
    `- Ensure prompts reference scene continuity, characters, and emotions for just this segment.`,
    `- Keep timecodes identical to the provided plan.`,
    `Segment Plan:\n${segments}`,
    `Scene Direction JSON:\n${JSON.stringify(sceneDirection ?? {}, null, 2)}`,
    `Scene Script JSON:\n${JSON.stringify(sceneScript ?? {}, null, 2)}`,
    `Respond with valid JSON only.`,
  ].join('\n\n')
}

function buildFallbackPrompt(segment: { startTime: number; endTime: number; reason?: string }, index: number) {
  return [
    `[TASK: Generate a cinematic video segment.]`,
    `[SEGMENT_INDEX: ${index + 1}]`,
    `[TIME: ${segment.startTime.toFixed(1)}s to ${segment.endTime.toFixed(1)}s]`,
    `[ACTION: Continue the scene action with consistent lighting and tone.]`,
    `[NOTE: Replace with AI generated prompt once LLM integration is configured.]`,
  ].join(' ')
}

function buildProductionData(
  plan: SegmentPlan,
  prompts: { segments: SegmentPrompt[] },
  targetSegmentDuration: number
) {
  const timestamp = new Date().toISOString()
  const segments = plan.segments.map((segment, index) => {
    const prompt = prompts.segments[index]
    return {
      segmentId: prompt?.segmentId ?? `segment-${index}`,
      sequenceIndex: index,
      startTime: segment.startTime,
      endTime: segment.endTime,
      status: 'READY' as const,
      generatedPrompt: prompt?.prompt,
      userEditedPrompt: null,
      activeAssetUrl: null,
      assetType: null,
      references: {
        startFrameUrl: null,
        endFrameUrl: null,
        characterIds: [] as string[],
        sceneRefIds: [] as string[],
        objectRefIds: [] as string[],
      },
      takes: [] as any[],
    }
  })

  return {
    isSegmented: true,
    targetSegmentDuration,
    segments,
    lastGeneratedAt: timestamp,
  }
}

