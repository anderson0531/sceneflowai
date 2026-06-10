/**
 * Thin (no DB writes) wrapper around `[api/scene/generate-image/route.ts]`.
 *
 * The existing image route does NOT write to the project metadata; it
 * generates the image, uploads to Blob, and returns the resulting URL.
 * That makes it safe to call from the Storyboard Express orchestrator in
 * parallel for multiple scenes — each call only mutates an in-memory
 * scene copy that the orchestrator will atomically persist at the end.
 */

import type { SceneImageResult } from './types'

export interface GenerateSceneImageParams {
  projectId: string
  sceneIndex: number
  baseUrl: string
  authCookie?: string
  /** Image quality tier ('auto' | 'max'); passed through to Imagen/Gemini. */
  quality?: string
  /** Storyboard quality tier — maps to modelTier + resolution. */
  storyboardQuality?: 'draft' | 'final'
  /** Optional explicit person-generation policy. */
  personGeneration?: 'allow_adult' | 'dont_allow' | 'allow_all'
  /** Pass-through prompt builder fields. */
  customPrompt?: string
  artStyle?: string
  shotType?: string
  cameraAngle?: string
  lighting?: string
  /** Force re-detection of selected characters from the scene text. */
  characterSelectionExplicit?: boolean
  /** Pre-computed character selection. */
  selectedCharacters?: Array<string | { id?: string; name?: string }>
  /** Per-scene wardrobe overrides. */
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>
  /** Skip auto-detection of object references when true. */
  skipObjectAutoDetection?: boolean
  /** Whether to use Gemini intelligence for prompt generation. */
  useAIPrompt?: boolean
  /** Allow title typography on this beat frame (title_reveal / credit beats). */
  allowTypography?: boolean
  /** Storyboard frame type: establishing, dialogue line, beat, or user custom cut. */
  frameType?: 'establishing' | 'dialogue' | 'custom' | 'beat'
  /** Index into scene.dialogue when frameType is 'dialogue'. */
  dialogueIndex?: number
  /** Index into scene.beats when frameType is 'beat'. */
  beatIndex?: number
  /** Id of scene.storyboardFrames entry when frameType is 'custom'. */
  customFrameId?: string
  /** In-memory scene from Express orchestrator (merged over DB scene at sceneIndex). */
  sceneOverride?: Record<string, unknown>
  /** Vertex image tier — Express uses `eco` for reliability. */
  modelTier?: 'eco' | 'designer' | 'director'
  /** Skip post-generation likeness validation (Express batch). */
  skipLikenessValidation?: boolean
}

export class SceneImageGenerationError extends Error {
  status: number
  code?: string
  payload?: any
  constructor(message: string, status: number, payload?: any) {
    super(message)
    this.status = status
    this.payload = payload
    this.code = payload?.code
  }
}

export async function generateSceneImage(
  params: GenerateSceneImageParams
): Promise<SceneImageResult> {
  const {
    projectId,
    sceneIndex,
    baseUrl,
    authCookie,
    quality = 'auto',
    storyboardQuality,
    personGeneration,
    customPrompt,
    artStyle,
    shotType,
    cameraAngle,
    lighting,
    characterSelectionExplicit,
    selectedCharacters,
    characterWardrobes,
    skipObjectAutoDetection,
    useAIPrompt,
    allowTypography,
    frameType,
    dialogueIndex,
    beatIndex,
    customFrameId,
    sceneOverride,
    modelTier,
    skipLikenessValidation,
  } = params

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authCookie ? { Cookie: authCookie } : {}),
  }

  const res = await fetch(`${baseUrl}/api/scene/generate-image`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      projectId,
      sceneIndex,
      quality,
      ...(storyboardQuality ? { storyboardQuality } : {}),
      ...(personGeneration ? { personGeneration } : {}),
      ...(customPrompt ? { customPrompt } : {}),
      ...(artStyle ? { artStyle } : {}),
      ...(shotType ? { shotType } : {}),
      ...(cameraAngle ? { cameraAngle } : {}),
      ...(lighting ? { lighting } : {}),
      ...(typeof characterSelectionExplicit === 'boolean'
        ? { characterSelectionExplicit }
        : {}),
      ...(selectedCharacters ? { selectedCharacters } : {}),
      ...(characterWardrobes ? { characterWardrobes } : {}),
      ...(typeof skipObjectAutoDetection === 'boolean'
        ? { skipObjectAutoDetection }
        : {}),
      ...(typeof useAIPrompt === 'boolean' ? { useAIPrompt } : {}),
      ...(typeof allowTypography === 'boolean' ? { allowTypography } : {}),
      ...(frameType ? { frameType } : {}),
      ...(typeof dialogueIndex === 'number' ? { dialogueIndex } : {}),
      ...(typeof beatIndex === 'number' ? { beatIndex } : {}),
      ...(customFrameId ? { customFrameId } : {}),
      ...(sceneOverride ? { sceneOverride } : {}),
      ...(modelTier ? { modelTier } : {}),
      ...(skipLikenessValidation ? { skipLikenessValidation: true } : {}),
    }),
  })

  let payload: any = null
  try {
    payload = await res.json()
  } catch {
    /* swallow — fall through to status check */
  }

  if (!res.ok || !payload?.success || !payload?.imageUrl) {
    throw new SceneImageGenerationError(
      payload?.error ||
        `Scene image generation failed (HTTP ${res.status})`,
      res.status,
      payload
    )
  }

  return {
    imageUrl: payload.imageUrl as string,
    gcsPath: payload.gcsPath ?? null,
    imagePrompt: payload.prompt ?? null,
  }
}
