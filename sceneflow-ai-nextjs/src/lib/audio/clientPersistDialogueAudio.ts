import { toast } from 'sonner'
import { audioSourceFingerprintForSpoken } from '@/lib/audio/beatAudioStale'
import type { AudioSlotSavedPayload } from '@/lib/audio/cleanupAudio'
import { dispatchGenerateVeoSfx } from '@/lib/sfx/clientGenerateVeoSfx'

export interface PersistDialogueAudioInput {
  projectId: string
  sceneIndex: number
  audioUrl: string
  language: string
  dialogueIndex: number
  characterName: string
  lineId?: string
  duration?: number
  provider?: string
  sourceFingerprint?: string
  lineKind?: 'narration' | 'dialogue'
  characterId?: string
}

/** Write one dialogue clip through the locked project audio update. */
export async function persistDialogueAudioSlot(
  input: PersistDialogueAudioInput
): Promise<AudioSlotSavedPayload> {
  const provider = input.provider || 'veo'
  const response = await fetch(`/api/projects/${input.projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      atomicAudioUpdate: {
        sceneIndex: input.sceneIndex,
        audioType: 'dialogue',
        audioUrl: input.audioUrl,
        language: input.language,
        dialogueIndex: input.dialogueIndex,
        characterName: input.characterName,
        lineId: input.lineId,
        duration: input.duration,
        provider,
        sourceFingerprint: input.sourceFingerprint,
        lineKind: input.lineKind ?? 'dialogue',
        characterId: input.characterId,
      },
    }),
  })

  if (!response.ok) {
    let message = `Failed to save dialogue audio (HTTP ${response.status})`
    try {
      const payload = await response.json()
      if (typeof payload?.error === 'string' && payload.error.trim()) message = payload.error
    } catch {
      // Keep the HTTP status message.
    }
    toast.error(message)
    throw new Error(message)
  }

  return {
    sceneIndex: input.sceneIndex,
    audioType: 'dialogue',
    audioUrl: input.audioUrl,
    language: input.language,
    dialogueIndex: input.dialogueIndex,
    characterName: input.characterName,
    lineId: input.lineId,
    duration: input.duration,
    provider,
    sourceFingerprint: input.sourceFingerprint,
    lineKind: input.lineKind ?? 'dialogue',
    characterId: input.characterId,
  }
}

export async function generateAndPersistHifiDialogue(params: {
  projectId: string
  sceneIndex: number
  language: string
  dialogueIndex: number
  characterName: string
  line: string
  lineId?: string
  voiceDirection?: string
  segmentDurationSeconds?: number
  hasExistingAudio?: boolean
  characterId?: string
}): Promise<AudioSlotSavedPayload> {
  const result = await dispatchGenerateVeoSfx({
    projectId: params.projectId,
    text: params.line,
    sfxIndex: params.dialogueIndex,
    sfxId: params.lineId,
    segmentDurationSeconds: params.segmentDurationSeconds,
    promptMode: 'dialogue',
    voiceDirection: params.voiceDirection,
    hasExistingAudio: params.hasExistingAudio,
  })

  return persistDialogueAudioSlot({
    projectId: params.projectId,
    sceneIndex: params.sceneIndex,
    audioUrl: result.url,
    language: params.language,
    dialogueIndex: params.dialogueIndex,
    characterName: params.characterName,
    lineId: params.lineId,
    duration: result.clipDurationSeconds,
    provider: 'veo',
    sourceFingerprint: audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: params.characterName,
      line: params.line,
      voiceDirection: params.voiceDirection,
    }),
    lineKind: 'dialogue',
    characterId: params.characterId,
  })
}
