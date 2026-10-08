import { toast } from 'sonner'
import type { AudioSlotSavedPayload } from '@/lib/audio/cleanupAudio'

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
  const provider = input.provider || 'google'
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
