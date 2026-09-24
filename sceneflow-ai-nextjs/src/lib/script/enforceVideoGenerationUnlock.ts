import { NextResponse } from 'next/server'
import {
  isBeatFirstPipelineEnabled,
  stampApprovedIfVideoUnlocked,
} from '@/lib/script/beatMigration'
import {
  assignVisionScriptScenes,
  findSceneById,
  getVisionScriptScenes,
} from '@/lib/script/resolveSceneById'

export const STORYBOARD_NOT_APPROVED_ERROR = {
  error: 'Pre-vis must be approved before video generation',
  code: 'STORYBOARD_NOT_APPROVED' as const,
}

export function storyboardNotApprovedResponse(): NextResponse {
  return NextResponse.json(STORYBOARD_NOT_APPROVED_ERROR, { status: 403 })
}

interface ProjectLike {
  metadata?: unknown
  update: (values: { metadata: unknown }) => Promise<unknown>
}

/**
 * Beat-first video routes look up the scene and stamp bookends that already
 * have every frame. Pre-Vis approval is not required to generate a clip.
 */
export async function enforceVideoGenerationUnlock(
  project: ProjectLike | null | undefined,
  sceneId: string
): Promise<
  | { ok: true; scene: Record<string, unknown> | null }
  | { ok: false; response: NextResponse }
> {
  const metadata = { ...((project?.metadata || {}) as Record<string, unknown>) }
  const visionPhase = { ...((metadata.visionPhase || {}) as Record<string, unknown>) }
  const scenes = [...getVisionScriptScenes(visionPhase)]
  const { scene, index } = findSceneById(scenes, sceneId)

  if (!isBeatFirstPipelineEnabled()) {
    return { ok: true, scene }
  }
  if (!scene || !project || index < 0) {
    return { ok: true, scene }
  }

  const { scene: next, stamped } = stampApprovedIfVideoUnlocked(scene)
  if (!stamped) return { ok: true, scene }

  scenes[index] = next
  await project.update({
    metadata: { ...metadata, visionPhase: assignVisionScriptScenes(visionPhase, scenes) },
  })
  return { ok: true, scene: next }
}
