import type { SceneSegment } from '@/components/vision/scene-production/types'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { audioSourceFingerprintForSpoken, audioSourceFingerprintForSfxBeat } from '@/lib/audio/beatAudioStale'
import {
  applyAudioSlotToScene,
  type AudioSlotSavedPayload,
} from '@/lib/audio/cleanupAudio'
import { persistDialogueAudioSlot } from '@/lib/audio/clientPersistDialogueAudio'
import { resolveLanguageClipPlayback } from '@/lib/scene/languageClipVersions'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  readShotClipAudioCache,
  writeShotClipAudioCache,
} from '@/lib/storyboard/animaticAudioMode'
import { resolveLiveTake, segmentHasPlayableVideo } from '@/lib/storyboard/mediaVersions'

/**
 * Resolve the playable MP4 video clip URL for a beat from the scene's segments.
 * Returns `undefined` when the shot has no rendered video clip.
 */
export function resolveBeatVideoClipUrl(
  segments: SceneSegment[] | undefined,
  beatId: string | undefined,
  language?: string | null
): string | undefined {
  const targetBeatId = beatId?.trim()
  if (!targetBeatId || !Array.isArray(segments) || segments.length === 0) {
    return undefined
  }

  const matching = segments.filter((row) => row.beatId === targetBeatId)
  if (matching.length === 0) return undefined

  const preferred =
    matching.find(
      (seg) =>
        segmentHasPlayableVideo(seg) &&
        (!seg.videoChain ||
          seg.videoChain.partIndex === 0 ||
          seg.videoChain.chainMethod === 'initial')
    ) ??
    matching.find((seg) => segmentHasPlayableVideo(seg)) ??
    matching[0]

  if (!preferred) return undefined

  const playback = resolveLanguageClipPlayback(preferred, language)
  if (playback.url) return playback.url

  if (!segmentHasPlayableVideo(preferred)) return undefined
  return resolveLiveTake(preferred.takes, preferred.currentTakeId, preferred.activeAssetUrl)?.url
}

/**
 * Resolve the duration in seconds for a beat's segment if available.
 */
export function resolveBeatSegmentDuration(
  segments: SceneSegment[] | undefined,
  beatId: string | undefined
): number | undefined {
  const targetBeatId = beatId?.trim()
  if (!targetBeatId || !Array.isArray(segments) || segments.length === 0) {
    return undefined
  }
  const seg = segments.find((row) => row.beatId === targetBeatId)
  if (!seg) return undefined
  if (typeof seg.actualVideoDuration === 'number' && seg.actualVideoDuration > 0) {
    return seg.actualVideoDuration
  }
  const span = (seg.endTime ?? 0) - (seg.startTime ?? 0)
  return Number.isFinite(span) && span > 0 ? span : undefined
}

/**
 * Request the server to extract an MP3 audio track from a shot's video clip MP4
 * and store it in GCS, then update the client clip-audio cache.
 */
export async function requestShotClipMp3Extraction(params: {
  projectId: string
  videoUrl: string
  beatId?: string
  sceneId?: string
}): Promise<{ audioUrl: string; sourceUrl: string; beatId?: string }> {
  const projectId = params.projectId.trim()
  const videoUrl = params.videoUrl.trim()
  const beatId = params.beatId?.trim()
  if (!projectId) {
    throw new Error('Project ID is required to extract clip audio.')
  }
  if (!videoUrl) {
    throw new Error('Shot clip video URL is required to extract clip audio.')
  }

  const response = await fetch('/api/sfx/extract-clip-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      videoUrl,
      ...(beatId ? { beatId } : {}),
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || typeof payload?.url !== 'string' || !payload.url.trim()) {
    throw new Error(
      payload?.error || `Failed to extract MP3 from shot clip (HTTP ${response.status})`
    )
  }

  const audioUrl = payload.url.trim()
  if (typeof window !== 'undefined' && beatId) {
    const cache = readShotClipAudioCache()
    writeShotClipAudioCache({
      ...cache,
      [beatId]: { audioUrl, sourceUrl: videoUrl },
    })
    if (params.sceneId) {
      window.dispatchEvent(
        new CustomEvent('sceneflow:shot-clip-audio', {
          detail: {
            sceneId: params.sceneId,
            beatId,
            sourceUrl: videoUrl,
            audioUrl,
          },
        })
      )
    }
  }

  return { audioUrl, sourceUrl: videoUrl, beatId }
}

export interface ExtractAndSaveSpokenBeatClipAudioInput {
  projectId: string
  sceneIndex: number
  sceneId?: string
  beatId?: string
  videoUrl: string
  language: string
  dialogueIndex: number
  characterName: string
  lineText: string
  voiceDirection?: string
  lineId?: string
  lineKind?: 'narration' | 'dialogue'
  characterId?: string
  fallbackDuration?: number
  onAudioSlotSaved?: (payload: AudioSlotSavedPayload) => void
  script?: any
  scenes?: any[]
  onScriptChange?: (script: any) => void
}

/**
 * Extract MP3 audio from a spoken shot's video clip MP4 and persist it into the
 * scene's dialogueAudio slot for that line.
 */
export async function extractAndSaveSpokenBeatClipAudio(
  input: ExtractAndSaveSpokenBeatClipAudioInput
): Promise<AudioSlotSavedPayload> {
  const extracted = await requestShotClipMp3Extraction({
    projectId: input.projectId,
    videoUrl: input.videoUrl,
    beatId: input.beatId,
    sceneId: input.sceneId,
  })

  let duration: number | undefined
  try {
    const measured = await getAudioDuration(extracted.audioUrl)
    if (Number.isFinite(measured) && measured > 0) {
      duration = Math.round(measured * 100) / 100
    }
  } catch {
    // Browser metadata probe failed (e.g. CORS); fall back to segment duration if available.
  }
  if (!duration && typeof input.fallbackDuration === 'number' && input.fallbackDuration > 0) {
    duration = Math.round(input.fallbackDuration * 100) / 100
  }

  const lineKind = input.lineKind ?? 'dialogue'
  const sourceFingerprint = audioSourceFingerprintForSpoken({
    kind: lineKind,
    character: input.characterName,
    line: input.lineText,
    voiceDirection: input.voiceDirection,
  })

  const savedSlot = await persistDialogueAudioSlot({
    projectId: input.projectId,
    sceneIndex: input.sceneIndex,
    audioUrl: extracted.audioUrl,
    language: input.language,
    dialogueIndex: input.dialogueIndex,
    characterName: input.characterName,
    lineId: input.lineId,
    duration,
    provider: 'veo',
    sourceFingerprint,
    lineKind,
    characterId: input.characterId,
  })

  if (input.onAudioSlotSaved) {
    input.onAudioSlotSaved(savedSlot)
  } else if (input.onScriptChange && input.script && Array.isArray(input.scenes)) {
    const updatedScenes = input.scenes.map((scene: any, idx: number) =>
      idx === input.sceneIndex ? applyAudioSlotToScene(scene, savedSlot) : scene
    )
    input.onScriptChange({
      ...input.script,
      script: { ...input.script.script, scenes: updatedScenes },
    })
  }

  return savedSlot
}

export interface ExtractAndSaveActionBeatClipAudioInput {
  projectId: string
  sceneIndex: number
  sceneId?: string
  beat: SceneBeat
  sfxIndex: number
  videoUrl: string
  onSaveSfxAudio?: (
    sceneIdx: number,
    audioType: 'sfx' | 'music',
    audioUrl: string,
    sfxIdx?: number,
    sfxAttribution?: Record<string, unknown> | null,
    beatContext?: { beatId: string; beatDescription: string }
  ) => Promise<void> | void
}

/**
 * Extract MP3 audio from an action shot's video clip MP4 and persist it into the
 * scene's SFX audio slot for that beat.
 */
export async function extractAndSaveActionBeatClipAudio(
  input: ExtractAndSaveActionBeatClipAudioInput
): Promise<{ audioUrl: string; sourceUrl: string; beatId?: string }> {
  const extracted = await requestShotClipMp3Extraction({
    projectId: input.projectId,
    videoUrl: input.videoUrl,
    beatId: input.beat.beatId,
    sceneId: input.sceneId,
  })

  const beatDescription =
    audioSourceFingerprintForSfxBeat(input.beat) ||
    input.beat.actionDescription?.trim() ||
    'Shot clip audio'

  await input.onSaveSfxAudio?.(
    input.sceneIndex,
    'sfx',
    extracted.audioUrl,
    input.sfxIndex,
    null,
    {
      beatId: input.beat.beatId,
      beatDescription,
    }
  )

  return extracted
}
