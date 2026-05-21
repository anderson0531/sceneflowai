import { put } from '@vercel/blob'
import CollabSession from '@/models/CollabSession'
import { synthesizeElevenLabsMp3 } from '@/lib/elevenlabs/textToSpeech'
import { SCENEFLOW_CREATOR_VOICE_ID } from '@/lib/tts/voices'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type {
  BlueprintSectionAudioMap,
  BlueprintSectionAudioStatus,
  BlueprintSessionPayload,
} from './shareTypes'
import {
  BLUEPRINT_SECTION_ORDER,
  buildBlueprintSectionNarrationText,
  chunkNarrationText,
  hashSectionNarrationText,
} from './sectionNarrationText'
import { getPayload, isBlueprintPayload } from './shareSession'

async function synthesizeSectionMp3(text: string, voiceId: string): Promise<Buffer> {
  const chunks = chunkNarrationText(text)
  if (chunks.length === 0) return Buffer.alloc(0)
  const buffers: Buffer[] = []
  for (const chunk of chunks) {
    const buf = await synthesizeElevenLabsMp3({
      text: chunk,
      voiceId,
      delivery: 'storytelling',
    })
    buffers.push(buf)
  }
  return buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)
}

export type GenerateShareSectionAudioParams = {
  sessionId: string
  projectId: string
  treatment: Record<string, unknown>
  voiceId?: string
}

export type GenerateShareSectionAudioResult = {
  sectionAudio: BlueprintSectionAudioMap
  status: BlueprintSectionAudioStatus
}

export async function generateShareSectionAudio(
  params: GenerateShareSectionAudioParams
): Promise<GenerateShareSectionAudioResult> {
  const voiceId = params.voiceId || SCENEFLOW_CREATOR_VOICE_ID
  const sectionAudio: BlueprintSectionAudioMap = {}
  let attempted = 0
  let succeeded = 0

  for (const section of BLUEPRINT_SECTION_ORDER) {
    const text = buildBlueprintSectionNarrationText(params.treatment, section)
    if (!text.trim()) continue
    attempted++
    try {
      const buffer = await synthesizeSectionMp3(text, voiceId)
      if (!buffer.length) continue
      const filename = `audio/blueprint-share/${params.projectId}/${params.sessionId}/${section}.mp3`
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'audio/mpeg',
        addRandomSuffix: false,
      })
      sectionAudio[section] = {
        url: blob.url,
        textHash: hashSectionNarrationText(text),
        durationMs: undefined,
      }
      succeeded++
    } catch (err) {
      console.error(`[generateShareSectionAudio] ${section} failed:`, err)
    }
  }

  const status: BlueprintSectionAudioStatus =
    attempted === 0
      ? 'skipped'
      : succeeded === 0
        ? 'failed'
        : succeeded < attempted
          ? 'partial'
          : 'ready'

  return { sectionAudio, status }
}

export async function patchSessionSectionAudio(
  sessionId: string,
  patch: Pick<
    BlueprintSessionPayload,
    'sectionAudio' | 'sectionAudioStatus' | 'sectionAudioVoiceId' | 'sectionAudioGeneratedAt'
  >
): Promise<void> {
  const session = await CollabSession.findByPk(sessionId)
  if (!session) return
  const raw = session.payload
  if (!isBlueprintPayload(raw)) return
  const next: BlueprintSessionPayload = {
    ...raw,
    ...patch,
  }
  await session.update({ payload: next })
}

export async function runShareSectionAudioGeneration(sessionId: string): Promise<void> {
  if (!process.env.ELEVENLABS_API_KEY) {
    await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'skipped' })
    return
  }

  const session = await CollabSession.findByPk(sessionId)
  if (!session) return
  const payload = getPayload(session)
  if (!payload) return
  if (payload.shareSettings?.allowTts === false) {
    await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'skipped' })
    return
  }

  await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'pending' })

  try {
    const { sectionAudio, status } = await generateShareSectionAudio({
      sessionId,
      projectId: payload.projectId,
      treatment: payload.treatment,
      voiceId: payload.sectionAudioVoiceId,
    })
    await patchSessionSectionAudio(sessionId, {
      sectionAudio,
      sectionAudioStatus: status,
      sectionAudioVoiceId: payload.sectionAudioVoiceId || SCENEFLOW_CREATOR_VOICE_ID,
      sectionAudioGeneratedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[runShareSectionAudioGeneration]', err)
    await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'failed' })
  }
}

