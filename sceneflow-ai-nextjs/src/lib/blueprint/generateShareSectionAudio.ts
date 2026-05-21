import { put } from '@vercel/blob'
import CollabSession from '@/models/CollabSession'
import { synthesizeElevenLabsMp3 } from '@/lib/elevenlabs/textToSpeech'
import { SCENEFLOW_CREATOR_VOICE_ID } from '@/lib/tts/voices'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type {
  BlueprintSectionAudioEntry,
  BlueprintSectionAudioMap,
  BlueprintSectionAudioStatus,
  BlueprintSectionTranslationsMap,
  BlueprintSessionPayload,
} from './shareTypes'
import {
  BLUEPRINT_SECTION_ORDER,
  buildBlueprintSectionNarrationText,
  chunkNarrationText,
  hashSectionNarrationText,
} from './sectionNarrationText'
import { getPayload, isBlueprintPayload } from './shareSession'
import { translateBlueprintNarration } from './translateBlueprintNarration'
import {
  DEFAULT_SHARE_AUDIO_LANGUAGE,
  PHANTOM_PENDING_MS,
  getSectionAudioForLanguage,
  hashForLanguage,
} from './shareAudioPayload'

/** Mark in-flight jobs older than this as failed (serverless cutoff). */
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

export function planWithLanguageHashes(
  plan: SectionNarrationPlanItem[],
  language: string
): SectionNarrationPlanItem[] {
  return plan.map((item) => ({
    ...item,
    textHash: hashForLanguage(item.textHash, language),
  }))
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

export function isShareAudioStaleForTreatment(
  payload: BlueprintSessionPayload,
  language: string
): boolean {
  const plan = planWithLanguageHashes(
    computeSectionNarrationPlan(payload.treatment),
    language
  )
  const audio = getSectionAudioForLanguage(payload, language)
  const status = payload.sectionAudioStatus
  if (!status || status === 'idle' || status === 'failed' || status === 'skipped') {
    return false
  }
  return !isShareSectionAudioCurrent(audio, status, plan)
}

export async function recoverStaleSectionAudioIfNeeded(
  sessionId: string,
  payload: BlueprintSessionPayload
): Promise<BlueprintSessionPayload> {
  if (payload.sectionAudioStatus !== 'pending') return payload

  const startedAt = payload.sectionAudioStartedAt
  const ageMs = startedAt
    ? Date.now() - new Date(startedAt).getTime()
    : PHANTOM_PENDING_MS + 1

  const threshold = startedAt ? STALE_PENDING_MS : PHANTOM_PENDING_MS
  if (ageMs < threshold) return payload

  const readyCount = Object.values(payload.sectionAudioByLanguage || {}).reduce(
    (n, m) => n + Object.keys(m || {}).filter((k) => m?.[k as BlueprintFixSection]?.url).length,
    0
  )
  console.warn(
    `[generateShareSectionAudio] stale pending session=${sessionId} ageMs=${ageMs} startedAt=${startedAt ?? 'none'} readySections=${readyCount}`
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
  language?: string
  voiceId?: string
  existingAudio?: BlueprintSectionAudioMap
  onSectionSaved?: (
    sectionAudio: BlueprintSectionAudioMap,
    translations: BlueprintSectionTranslationsMap
  ) => Promise<void>
}

export type GenerateShareSectionAudioResult = {
  sectionAudio: BlueprintSectionAudioMap
  sectionTranslations: BlueprintSectionTranslationsMap
  status: BlueprintSectionAudioStatus
  attempted: number
  succeeded: number
  language: string
}

export async function generateShareSectionAudio(
  params: GenerateShareSectionAudioParams
): Promise<GenerateShareSectionAudioResult> {
  const language = params.language || DEFAULT_SHARE_AUDIO_LANGUAGE
  const voiceId = params.voiceId || SCENEFLOW_CREATOR_VOICE_ID
  const plan = computeSectionNarrationPlan(params.treatment)
  const sectionAudio: BlueprintSectionAudioMap = { ...(params.existingAudio || {}) }
  const sectionTranslations: BlueprintSectionTranslationsMap = {}
  let attempted = 0
  let succeeded = 0

  for (const { section, text } of plan) {
    attempted++
    let speakableText = text
    try {
      speakableText = await translateBlueprintNarration(text, language)
    } catch (err) {
      console.error(`[generateShareSectionAudio] translate ${section}:`, err)
      if (language !== DEFAULT_SHARE_AUDIO_LANGUAGE) continue
      speakableText = text
    }

    sectionTranslations[section] = speakableText
    const textHash = hashForLanguage(hashSectionNarrationText(speakableText), language)

    const existing = sectionAudio[section]
    if (existing?.url && existing.textHash === textHash) {
      succeeded++
      continue
    }

    const t0 = Date.now()
    console.info(
      `[generateShareSectionAudio] start section=${section} lang=${language} session=${params.sessionId}`
    )

    try {
      const buffer = await synthesizeSectionMp3(speakableText, voiceId)
      if (!buffer.length) continue

      const filename = `audio/blueprint-share/${params.projectId}/${params.sessionId}/${language}/${section}.mp3`
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'audio/mpeg',
        addRandomSuffix: false,
      })
      console.info(
        `[generateShareSectionAudio] done section=${section} lang=${language} ms=${Date.now() - t0}`
      )

      sectionAudio[section] = {
        url: blob.url,
        textHash,
        durationMs: undefined,
      }
      succeeded++

      if (params.onSectionSaved) {
        await params.onSectionSaved({ ...sectionAudio }, { ...sectionTranslations })
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

  return {
    sectionAudio,
    sectionTranslations,
    status,
    attempted,
    succeeded,
    language,
  }
}

export async function patchSessionSectionAudio(
  sessionId: string,
  patch: Partial<
    Pick<
      BlueprintSessionPayload,
      | 'sectionAudio'
      | 'sectionAudioByLanguage'
      | 'sectionTranslations'
      | 'sectionAudioLanguage'
      | 'sectionAudioStatus'
      | 'sectionAudioVoiceId'
      | 'sectionAudioGeneratedAt'
      | 'sectionAudioStartedAt'
    >
  >,
  options?: { mergeSectionAudio?: boolean; language?: string }
): Promise<void> {
  const session = await CollabSession.findByPk(sessionId)
  if (!session) return
  const raw = session.payload
  if (!isBlueprintPayload(raw)) return

  const lang = options?.language || patch.sectionAudioLanguage || raw.sectionAudioLanguage || DEFAULT_SHARE_AUDIO_LANGUAGE
  let sectionAudio = patch.sectionAudio
  let byLang = { ...(raw.sectionAudioByLanguage || {}) }

  if (options?.mergeSectionAudio && patch.sectionAudio) {
    sectionAudio = { ...(byLang[lang] || {}), ...patch.sectionAudio }
    byLang[lang] = sectionAudio
  } else if (patch.sectionAudio) {
    byLang[lang] = patch.sectionAudio
  }

  let translations = { ...(raw.sectionTranslations || {}) }
  if (patch.sectionTranslations) {
    translations = { ...translations, ...patch.sectionTranslations }
  }

  const next: BlueprintSessionPayload = {
    ...raw,
    ...patch,
    sectionAudioLanguage: patch.sectionAudioLanguage ?? lang,
    sectionAudioByLanguage: patch.sectionAudioByLanguage ?? byLang,
    sectionTranslations: patch.sectionTranslations ? translations : raw.sectionTranslations,
    ...(sectionAudio && !options?.mergeSectionAudio ? { sectionAudio } : {}),
  }
  await session.update({ payload: next })
}

export type RunShareSectionAudioResult = {
  skipped: boolean
  status?: BlueprintSectionAudioStatus
  sectionAudio?: BlueprintSectionAudioMap
  language?: string
}

export type RunShareSectionAudioOptions = {
  language?: string
}

export async function runShareSectionAudioGeneration(
  sessionId: string,
  options?: RunShareSectionAudioOptions
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

  const language =
    options?.language || payload.sectionAudioLanguage || DEFAULT_SHARE_AUDIO_LANGUAGE
  const plan = planWithLanguageHashes(
    computeSectionNarrationPlan(payload.treatment),
    language
  )
  const existingAudio = getSectionAudioForLanguage(payload, language)

  if (isShareSectionAudioCurrent(existingAudio, payload.sectionAudioStatus, plan)) {
    console.info(`[runShareSectionAudioGeneration] up-to-date session=${sessionId} lang=${language}`)
    return {
      skipped: true,
      status: payload.sectionAudioStatus,
      sectionAudio: existingAudio,
      language,
    }
  }

  const voiceId = payload.sectionAudioVoiceId || SCENEFLOW_CREATOR_VOICE_ID
  const startedAt = new Date().toISOString()

  await patchSessionSectionAudio(
    sessionId,
    {
      sectionAudioStatus: 'pending',
      sectionAudioStartedAt: startedAt,
      sectionAudioLanguage: language,
    },
    { language }
  )

  try {
    const { sectionAudio, sectionTranslations, status } = await generateShareSectionAudio({
      sessionId,
      projectId: payload.projectId,
      treatment: payload.treatment,
      language,
      voiceId,
      existingAudio,
      onSectionSaved: async (partial, partialTranslations) => {
        const prevByLang = payload!.sectionAudioByLanguage || {}
        const prevTrans = payload!.sectionTranslations || {}
        await patchSessionSectionAudio(
          sessionId,
          {
            sectionAudio: partial,
            sectionAudioStatus: 'pending',
            sectionAudioStartedAt: startedAt,
            sectionAudioByLanguage: { ...prevByLang, [language]: partial },
            sectionTranslations: {
              ...prevTrans,
              [language]: { ...(prevTrans[language] || {}), ...partialTranslations },
            },
          },
          { mergeSectionAudio: true, language }
        )
      },
    })

    const prevByLang = payload.sectionAudioByLanguage || {}
    const prevTrans = payload.sectionTranslations || {}

    await patchSessionSectionAudio(sessionId, {
      sectionAudio: sectionAudio,
      sectionAudioByLanguage: { ...prevByLang, [language]: sectionAudio },
      sectionTranslations: {
        ...prevTrans,
        [language]: sectionTranslations,
      },
      sectionAudioStatus: status,
      sectionAudioVoiceId: voiceId,
      sectionAudioLanguage: language,
      sectionAudioGeneratedAt: new Date().toISOString(),
    })

    return { skipped: false, status, sectionAudio, language }
  } catch (err) {
    console.error('[runShareSectionAudioGeneration]', err)
    await patchSessionSectionAudio(sessionId, { sectionAudioStatus: 'failed' })
    return { skipped: false, status: 'failed', language }
  }
}

/** Alias for manual refresh routes. */
export const scheduleShareSectionAudioGeneration = runShareSectionAudioGeneration
