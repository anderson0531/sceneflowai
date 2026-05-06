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
