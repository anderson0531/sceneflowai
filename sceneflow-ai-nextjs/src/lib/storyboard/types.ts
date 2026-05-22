/**
 * Storyboard frame types and helpers for dialogue-line visual cuts.
 *
 * Establishing frame: scene.imageUrl (narration/description)
 * Dialogue frames: scene.dialogue[i].storyboardImageUrl
 */

/** Storyboard image fields stored on each dialogue line object. */
export interface DialogueStoryboardFrame {
  storyboardImageUrl?: string
  storyboardImagePrompt?: string
  storyboardImageGcsPath?: string
}

export type StoryboardFrameType = 'establishing' | 'dialogue'

/** A single visual frame in playback order, aligned to an audio clip window. */
export interface StoryboardVisualFrame {
  clipId: string
  frameType: StoryboardFrameType
  dialogueIndex?: number
  imageUrl?: string
  startTime: number
  duration: number
  label?: string
  character?: string
  line?: string
}

/** Flat frame entry for exports and reports. */
export interface FlatStoryboardFrame {
  sceneNumber: number
  frameType: StoryboardFrameType
  dialogueIndex?: number
  imageUrl?: string
  visualDescription?: string
  shotType?: string
  cameraAngle?: string
  lighting?: string
  duration?: number
  character?: string
  line?: string
}

/** Minimal audio clip shape used to build the visual timeline. */
export interface StoryboardAudioClip {
  id: string
  startTime: number
  duration: number
  type: 'narration' | 'dialogue' | 'description' | 'music' | 'sfx'
  label?: string
}

function getDialogueLineText(d: Record<string, unknown> | null | undefined): string {
  if (!d) return ''
  return String(d.line ?? d.text ?? '')
}

function getDialogueLineCharacter(d: Record<string, unknown> | null | undefined): string {
  if (!d) return ''
  return String(d.character ?? '')
}

/** Parse dialogue index from clip id like "dialogue-0". */
export function parseDialogueIndexFromClipId(clipId: string): number | undefined {
  const match = /^dialogue-(\d+)$/.exec(clipId)
  if (!match) return undefined
  const idx = parseInt(match[1], 10)
  return Number.isFinite(idx) ? idx : undefined
}

/** Establishing frame URL for narration/description. */
export function getEstablishingFrameUrl(scene: Record<string, unknown> | null | undefined): string | undefined {
  const url = scene?.imageUrl
  return typeof url === 'string' && url.trim() ? url : undefined
}

/** Per-dialogue frame URL with fallback to establishing. */
export function getDialogueFrameUrl(
  scene: Record<string, unknown> | null | undefined,
  dialogueIndex: number
): string | undefined {
  const dialogue = Array.isArray(scene?.dialogue) ? scene!.dialogue : []
  const entry = dialogue[dialogueIndex] as Record<string, unknown> | undefined
  const url = entry?.storyboardImageUrl
  if (typeof url === 'string' && url.trim()) return url
  return getEstablishingFrameUrl(scene)
}

/**
 * Map audio clips to visual frames. Non-voice clips (description/narration) use
 * establishing; dialogue clips use per-line images with fallback.
 */
export function buildStoryboardVisualTimeline(
  scene: Record<string, unknown> | null | undefined,
  audioClips: StoryboardAudioClip[]
): StoryboardVisualFrame[] {
  if (!scene || audioClips.length === 0) return []

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const establishingUrl = getEstablishingFrameUrl(scene)
  const frames: StoryboardVisualFrame[] = []

  for (const clip of audioClips) {
    if (clip.type === 'music' || clip.type === 'sfx') continue

    if (clip.type === 'dialogue') {
      const dialogueIndex = parseDialogueIndexFromClipId(clip.id)
      const d =
        typeof dialogueIndex === 'number'
          ? (dialogue[dialogueIndex] as Record<string, unknown> | undefined)
          : undefined
      frames.push({
        clipId: clip.id,
        frameType: 'dialogue',
        dialogueIndex,
        imageUrl:
          typeof dialogueIndex === 'number'
            ? getDialogueFrameUrl(scene, dialogueIndex)
            : establishingUrl,
        startTime: clip.startTime,
        duration: clip.duration,
        label: clip.label,
        character: getDialogueLineCharacter(d),
        line: getDialogueLineText(d),
      })
    } else {
      // description / narration → establishing
      frames.push({
        clipId: clip.id,
        frameType: 'establishing',
        imageUrl: establishingUrl,
        startTime: clip.startTime,
        duration: clip.duration,
        label: clip.label,
      })
    }
  }

  return frames
}

/** Resolve the active visual frame at a given playhead time (holds previous frame in inter-clip gaps). */
export function getCurrentStoryboardVisualFrame(
  frames: StoryboardVisualFrame[],
  currentTime: number
): StoryboardVisualFrame | undefined {
  if (frames.length === 0) return undefined

  for (const frame of frames) {
    if (currentTime >= frame.startTime && currentTime < frame.startTime + frame.duration) {
      return frame
    }
  }

  // Buffer gap between clips: hold the last frame that has started
  let held: StoryboardVisualFrame | undefined
  for (const frame of frames) {
    if (currentTime >= frame.startTime) {
      held = frame
    } else {
      break
    }
  }
  return held ?? frames[0]
}

/**
 * Flatten a scene into export/report frames: establishing + one per dialogue line.
 */
export function flattenSceneToStoryboardFrames(
  scene: Record<string, unknown>,
  sceneNumber: number
): FlatStoryboardFrame[] {
  const result: FlatStoryboardFrame[] = []
  const establishingUrl = getEstablishingFrameUrl(scene)
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []

  if (establishingUrl || !dialogue.length) {
    result.push({
      sceneNumber,
      frameType: 'establishing',
      imageUrl: establishingUrl,
      visualDescription: String(
        scene.visualDescription ?? scene.action ?? scene.summary ?? ''
      ),
      shotType: scene.shotType as string | undefined,
      cameraAngle: scene.cameraAngle as string | undefined,
      lighting: scene.lighting as string | undefined,
      duration: scene.duration as number | undefined,
    })
  }

  dialogue.forEach((raw, idx) => {
    const d = raw as Record<string, unknown>
    const imageUrl = getDialogueFrameUrl(scene, idx)
    result.push({
      sceneNumber,
      frameType: 'dialogue',
      dialogueIndex: idx,
      imageUrl,
      visualDescription: getDialogueLineText(d),
      character: getDialogueLineCharacter(d),
      line: getDialogueLineText(d),
      shotType: scene.shotType as string | undefined,
      cameraAngle: scene.cameraAngle as string | undefined,
      lighting: scene.lighting as string | undefined,
    })
  })

  return result
}
