import { put } from '@vercel/blob'
import CollabSession from '@/models/CollabSession'
import { synthesizeElevenLabsMp3 } from '@/lib/elevenlabs/textToSpeech'
import { SCENEFLOW_CREATOR_VOICE_ID } from '@/lib/tts/voices'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type {
  BlueprintSectionAudioEntry,
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

/** Mark pending jobs older than this as failed (stale after() / serverless cutoff). */
export const STALE_PENDING_MS = 15 * 60 * 1000

export type SectionNarrationPlanItem = {
  section: BlueprintFixSection
  text: string
  textHash: string
}

export function computeSectionNarrationPlan(
  treatment: Record<string, unknown>
): SectionNarrationPlanItem[] {
  const plan: SectionNarrationPlanItem[] = []
  for (const section of BLUEPRINT_SECTION_ORDER) {
    const text = buildBlueprintSectionNarrationText(treatment, section)
    if (!text.trim()) continue
    plan.push({ section, text, textHash: hashSectionNarrationText(text) })
  }
  return plan
}

export function isShareSectionAudioCurrent(
  existing: BlueprintSectionAudioMap | undefined,
  status: BlueprintSectionAudioStatus | undefined,
  plan: SectionNarrationPlanItem[]
): boolean {
  if (status !== 'ready' && status !== 'partial') return false
  if (plan.length === 0) return true
  for (const { section, textHash } of plan) {
    const entry = existing?.[section]
    if (!entry?.url || entry.textHash !== textHash) return false
  }
  return true
}

export async function recoverStaleSectionAudioIfNeeded(
  sessionId: string,
  payload: BlueprintSessionPayload
): Promise<BlueprintSessionPayload> {
  if (payload.sectionAudioStatus !== 'pending') return payload

  const startedAt = payload.sectionAudioStartedAt
  if (!startedAt) return payload

  const ageMs = Date.now() - new Date(startedAt).getTime()
  if (ageMs < STALE_PENDING_MS) return payload

  const readyCount = Object.keys(payload.sectionAudio || {}).length
  console.warn(
    `[generateShareSectionAudio] stale pending session=${sessionId} ageMs=${ageMs} readySections=${readyCount}`
  )
  await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'failed' })
  return { ...payload, sectionAudioStatus: 'failed' }
}

async function synthesizeSectionMp3(text: string, voiceId: string): Promise<Buffer> {
  const chunks = chunkNarrationText(text)
  if (chunks.length === 0) return Buffer.alloc(0)
  const buffers: Buffer[] = []
  for (let i = 0; i < chunks.length; i++) {
    const t0 = Date.now()
    const buf = await synthesizeElevenLabsMp3({
      text: chunks[i]!,
      voiceId,
      delivery: 'storytelling',
      prependDeliveryTag: i === 0,
    })
    console.info(
      `[generateShareSectionAudio] chunk ${i + 1}/${chunks.length} ms=${Date.now() - t0}`
    )
    buffers.push(buf)
  }
  return buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)
}

export type GenerateShareSectionAudioParams = {
  sessionId: string
  projectId: string
  treatment: Record<string, unknown>
  voiceId?: string
  existingAudio?: BlueprintSectionAudioMap
  onSectionSaved?: (sectionAudio: BlueprintSectionAudioMap) => Promise<void>
}

export type GenerateShareSectionAudioResult = {
  sectionAudio: BlueprintSectionAudioMap
  status: BlueprintSectionAudioStatus
  attempted: number
  succeeded: number
}

export async function generateShareSectionAudio(
  params: GenerateShareSectionAudioParams
): Promise<GenerateShareSectionAudioResult> {
  const voiceId = params.voiceId || SCENEFLOW_CREATOR_VOICE_ID
  const plan = computeSectionNarrationPlan(params.treatment)
  const sectionAudio: BlueprintSectionAudioMap = { ...(params.existingAudio || {}) }
  let attempted = 0
  let succeeded = 0

  for (const { section, text, textHash } of plan) {
    attempted++
    const existing = sectionAudio[section]
    if (existing?.url && existing.textHash === textHash) {
      succeeded++
      continue
    }

    const t0 = Date.now()
    console.info(`[generateShareSectionAudio] start section=${section} session=${params.sessionId}`)

    try {
      const buffer = await synthesizeSectionMp3(text, voiceId)
      if (!buffer.length) continue

      const tBlob = Date.now()
      const filename = `audio/blueprint-share/${params.projectId}/${params.sessionId}/${section}.mp3`
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'audio/mpeg',
        addRandomSuffix: false,
      })
      console.info(
        `[generateShareSectionAudio] done section=${section} tts+blobMs=${Date.now() - t0} blobMs=${Date.now() - tBlob}`
      )

      sectionAudio[section] = {
        url: blob.url,
        textHash,
        durationMs: undefined,
      }
      succeeded++

      if (params.onSectionSaved) {
        await params.onSectionSaved({ ...sectionAudio })
      }
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

  return { sectionAudio, status, attempted, succeeded }
}

export async function patchSessionSectionAudio(
  sessionId: string,
  patch: Pick<
    BlueprintSessionPayload,
    | 'sectionAudio'
    | 'sectionAudioStatus'
    | 'sectionAudioVoiceId'
    | 'sectionAudioGeneratedAt'
    | 'sectionAudioStartedAt'
  >,
  options?: { mergeSectionAudio?: boolean }
): Promise<void> {
  const session = await CollabSession.findByPk(sessionId)
  if (!session) return
  const raw = session.payload
  if (!isBlueprintPayload(raw)) return

  let sectionAudio = patch.sectionAudio
  if (options?.mergeSectionAudio && patch.sectionAudio) {
    sectionAudio = { ...(raw.sectionAudio || {}), ...patch.sectionAudio }
  }

  const next: BlueprintSessionPayload = {
    ...raw,
    ...patch,
    ...(sectionAudio !== undefined ? { sectionAudio } : {}),
  }
  await session.update({ payload: next })
}

export type RunShareSectionAudioResult = {
  skipped: boolean
  status?: BlueprintSectionAudioStatus
  sectionAudio?: BlueprintSectionAudioMap
}

export async function runShareSectionAudioGeneration(
  sessionId: string
): Promise<RunShareSectionAudioResult> {
  if (!process.env.ELEVENLABS_API_KEY) {
    await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'skipped' })
    return { skipped: true, status: 'skipped' }
  }

  const session = await CollabSession.findByPk(sessionId)
  if (!session) return { skipped: true }

  let payload = getPayload(session)
  if (!payload) return { skipped: true }

  payload = await recoverStaleSectionAudioIfNeeded(sessionId, payload)

  if (payload.shareSettings?.allowTts === false) {
    await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'skipped' })
    return { skipped: true, status: 'skipped' }
  }

  const plan = computeSectionNarrationPlan(payload.treatment)
  if (isShareSectionAudioCurrent(payload.sectionAudio, payload.sectionAudioStatus, plan)) {
    console.info(`[runShareSectionAudioGeneration] up-to-date session=${sessionId}`)
    return {
      skipped: true,
      status: payload.sectionAudioStatus,
      sectionAudio: payload.sectionAudio,
    }
  }

  const voiceId = payload.sectionAudioVoiceId || SCENEFLOW_CREATOR_VOICE_ID
  const startedAt = new Date().toISOString()

  await patchSessionSectionAudio(sessionId, {
    sectionAudioStatus: 'pending',
    sectionAudioStartedAt: startedAt,
    sectionAudio: payload.sectionAudio || {},
  })

  try {
    const { sectionAudio, status } = await generateShareSectionAudio({
      sessionId,
      projectId: payload.projectId,
      treatment: payload.treatment,
      voiceId,
      existingAudio: payload.sectionAudio,
      onSectionSaved: async (partial) => {
        await patchSessionSectionAudio(
          sessionId,
          {
            sectionAudio: partial,
            sectionAudioStatus: 'pending',
            sectionAudioStartedAt: startedAt,
          },
          { mergeSectionAudio: true }
        )
      },
    })

    await patchSessionSectionAudio(sessionId, {
      sectionAudio,
      sectionAudioStatus: status,
      sectionAudioVoiceId: voiceId,
      sectionAudioGeneratedAt: new Date().toISOString(),
    })

    return { skipped: false, status, sectionAudio }
  } catch (err) {
    console.error('[runShareSectionAudioGeneration]', err)
    await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'failed' })
    return { skipped: false, status: 'failed' }
  }
}

/** Alias for manual refresh routes. */
export const scheduleShareSectionAudioGeneration = runShareSectionAudioGeneration
