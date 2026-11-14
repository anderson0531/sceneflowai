import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import {
  DESIGNED_VOICE_TTS_MODEL,
  DESIGNED_VOICE_TYPE,
  buildDesignedVoiceSynthesisBody,
  buildNeutralVoiceDesignFallback,
  buildVoiceDesignCreateBody,
  isDesignedGeminiVoiceId,
  readDesignedVoiceId,
  voiceDesignCreateAttempts,
  voicesToEvict,
  voicesToOverlay,
  type StoredPromptedVoice,
} from '@/lib/tts/geminiVoiceDesign'

const replacedVoiceIds = new Map<string, string>()

function vertexProjectId(): string {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for Voice Design')
  }
  return projectId
}

function voicesCollectionUrl(): string {
  return `https://aiplatform.googleapis.com/v1beta1/projects/${vertexProjectId()}/locations/global/voices`
}

async function vertexHeaders(): Promise<Record<string, string>> {
  const token = await getVertexAIAuthToken()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function voiceResourceName(voiceId: string): string {
  if (voiceId.startsWith('projects/')) return voiceId
  return `${voicesCollectionUrl()}/${voiceId}`
}

function readVoiceCreateTime(record: Record<string, unknown>): string | undefined {
  const nested =
    record.voice && typeof record.voice === 'object'
      ? (record.voice as Record<string, unknown>)
      : null
  const candidates = [
    record.createTime,
    record.create_time,
    record.updateTime,
    record.update_time,
    nested?.createTime,
    nested?.create_time,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

async function fetchStoredVoicesPages(
  headers: Record<string, string>,
  filterType?: string
): Promise<StoredPromptedVoice[]> {
  const collected: StoredPromptedVoice[] = []
  const seen = new Set<string>()
  let pageToken = ''
  let listIndex = 0
  for (let page = 0; page < 10; page++) {
    const url = new URL(voicesCollectionUrl())
    url.searchParams.set('pageSize', '100')
    if (filterType) {
      url.searchParams.append('type', filterType)
    }
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const response = await fetch(url, { headers })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Voice Design list failed: HTTP ${response.status} ${detail.slice(0, 240)}`)
    }
    const data = (await response.json()) as {
      voices?: Array<Record<string, unknown>>
      customVoices?: Array<Record<string, unknown>>
      custom_voices?: Array<Record<string, unknown>>
      nextPageToken?: string
      next_page_token?: string
    }
    const items = data.voices ?? data.customVoices ?? data.custom_voices ?? []
    for (const voice of items) {
      const id = readDesignedVoiceId(voice)
      if (!id || seen.has(id)) continue
      seen.add(id)
      collected.push({
        id,
        createTime: readVoiceCreateTime(voice),
        listIndex: listIndex++,
      })
    }
    pageToken = (data.nextPageToken ?? data.next_page_token ?? '').trim()
    if (!pageToken) break
  }
  return collected
}

async function listPromptedVoices(headers: Record<string, string>): Promise<StoredPromptedVoice[]> {
  let unfilteredError: unknown = null
  try {
    const allCustom = await fetchStoredVoicesPages(headers)
    if (allCustom.length > 0) return allCustom
  } catch (error) {
    unfilteredError = error
  }

  try {
    return await fetchStoredVoicesPages(headers, DESIGNED_VOICE_TYPE)
  } catch (filteredError) {
    throw unfilteredError ?? filteredError
  }
}

async function deleteVoice(voiceId: string, headers: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch(voiceResourceName(voiceId), { method: 'DELETE', headers })
    if (response.ok || response.status === 404) {
      return true
    }
    const detail = await response.text().catch(() => '')
    console.warn(
      `[Voice Design] Delete ${voiceId} failed: HTTP ${response.status} ${detail.slice(0, 180)}`
    )
    return false
  } catch (error) {
    console.warn(`[Voice Design] Delete ${voiceId} threw:`, error)
    return false
  }
}

export async function evictOldestDesignedVoices(retainIds: Iterable<string>): Promise<void> {
  const headers = await vertexHeaders()
  let voices: StoredPromptedVoice[] = []
  try {
    voices = await listPromptedVoices(headers)
  } catch (error) {
    console.warn('[Voice Design] Could not list voices before create:', error)
    return
  }
  for (const voiceId of voicesToEvict(voices, retainIds)) {
    await deleteVoice(voiceId, headers)
  }
}

function promptRejected(status: number, detail: string): boolean {
  return (
    status === 400 &&
    /did not complete|rephras|INVALID_ARGUMENT|no voice was created|safety|blocked|sensitive/i.test(
      detail
    )
  )
}

function voiceLibraryFull(status: number, detail: string): boolean {
  return (
    status === 429 ||
    /RESOURCE_EXHAUSTED|quota exceeded|maximum active stored voice|too many.*voices|voice.*limit/i.test(
      detail
    )
  )
}

async function pauseBeforeRetry(ms: number): Promise<void> {
  const actualMs = process.env.VITEST ? Math.min(ms, 5) : ms
  await new Promise((resolve) => setTimeout(resolve, actualMs))
}

async function postVoice(
  body: Record<string, unknown>,
  headers: Record<string, string>
): Promise<{ ok: boolean; status: number; detail: string; payload: unknown }> {
  const response = await fetch(voicesCollectionUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    return { ok: false, status: response.status, detail, payload: null }
  }
  return { ok: true, status: response.status, detail: '', payload: await response.json() }
}

async function createFromAttempts(args: {
  description: string
  displayName: string
  languageCode?: string
  headers: Record<string, string>
}): Promise<{ ok: boolean; status: number; detail: string; payload: unknown }> {
  const attempts = voiceDesignCreateAttempts({
    description: args.description,
    displayName: args.displayName,
    languageCode: args.languageCode,
  })
  let result = await postVoice(attempts[0], args.headers)
  const shorter = attempts[1]
  if (!result.ok && shorter && promptRejected(result.status, result.detail)) {
    console.warn('[Voice Design] prompt rejected, retrying shorter:', args.description.slice(0, 240))
    result = await postVoice(shorter, args.headers)
  }
  if (!result.ok && promptRejected(result.status, result.detail)) {
    const neutralDescription = buildNeutralVoiceDesignFallback(args.description)
    console.warn(
      '[Voice Design] shorter prompt rejected, retrying neutral studio acoustic fallback:',
      neutralDescription
    )
    const neutralBody = buildVoiceDesignCreateBody({
      description: neutralDescription,
      displayName: 'Studio Character',
      languageCode: args.languageCode,
    })
    result = await postVoice(neutralBody, args.headers)
  }
  return result
}

/**
 * Free or overlay stored voice slots when Vertex reports the project voice library is full.
 * Prefers unretained voices first; when `allowRetainedOverlay` is true, overlays the oldest
 * retained voices as well so new voice generation never deadlocks at the 200-slot cap.
 */
async function freeVoiceSlots(args: {
  headers: Record<string, string>
  replaceVoiceId: string | undefined
  retainVoiceIds: string[]
  count: number
  allowRetainedOverlay: boolean
  deletedIds: Set<string>
}): Promise<number> {
  const retain = new Set(args.retainVoiceIds)
  let freed = 0

  if (
    args.replaceVoiceId &&
    isDesignedGeminiVoiceId(args.replaceVoiceId) &&
    !retain.has(args.replaceVoiceId) &&
    !args.deletedIds.has(args.replaceVoiceId)
  ) {
    if (await deleteVoice(args.replaceVoiceId, args.headers)) {
      args.deletedIds.add(args.replaceVoiceId)
      freed++
    }
  }

  let voices: StoredPromptedVoice[] = []
  try {
    voices = await listPromptedVoices(args.headers)
  } catch (error) {
    console.warn('[Voice Design] Could not list voices to free slots:', error)
    return freed
  }

  const available = voices.filter((voice) => !args.deletedIds.has(voice.id))
  const targets = voicesToOverlay(
    available,
    args.retainVoiceIds,
    Math.max(0, args.count - freed),
    args.allowRetainedOverlay
  )

  for (const targetId of targets) {
    if (await deleteVoice(targetId, args.headers)) {
      args.deletedIds.add(targetId)
      freed++
    }
  }
  return freed
}

export async function createDesignedGeminiVoice(args: {
  description: string
  displayName: string
  languageCode?: string
  retainVoiceIds?: string[]
  /** Previous designed voice for this character. Overlaid/deleted so slots do not accumulate. */
  replaceVoiceId?: string
}): Promise<{ voiceId: string }> {
  const description = args.description.trim()
  if (description.length < 12) {
    throw new Error('Voice Design needs a description of the character’s voice')
  }
  const retainVoiceIds = args.retainVoiceIds ?? []
  const deletedIds = new Set<string>()
  const previous = args.replaceVoiceId?.trim()

  const headers = await vertexHeaders()

  // Overlay this character's previous voice slot upfront if one exists
  if (
    previous &&
    isDesignedGeminiVoiceId(previous) &&
    !retainVoiceIds.includes(previous)
  ) {
    if (await deleteVoice(previous, headers)) {
      deletedIds.add(previous)
    }
  }

  await evictOldestDesignedVoices(retainVoiceIds)

  let result = await createFromAttempts({
    description,
    displayName: args.displayName,
    languageCode: args.languageCode,
    headers,
  })

  if (!result.ok && voiceLibraryFull(result.status, result.detail)) {
    let freed = await freeVoiceSlots({
      headers,
      replaceVoiceId: previous,
      retainVoiceIds,
      count: 10,
      allowRetainedOverlay: false,
      deletedIds,
    })
    if (freed === 0) {
      freed = await freeVoiceSlots({
        headers,
        replaceVoiceId: previous,
        retainVoiceIds,
        count: 6,
        allowRetainedOverlay: true,
        deletedIds,
      })
    }
    await pauseBeforeRetry(250)
    result = await createFromAttempts({
      description,
      displayName: args.displayName,
      languageCode: args.languageCode,
      headers,
    })
  }

  if (!result.ok && voiceLibraryFull(result.status, result.detail)) {
    await freeVoiceSlots({
      headers,
      replaceVoiceId: previous,
      retainVoiceIds,
      count: 15,
      allowRetainedOverlay: true,
      deletedIds,
    })
    await pauseBeforeRetry(500)
    result = await createFromAttempts({
      description,
      displayName: args.displayName,
      languageCode: args.languageCode,
      headers,
    })
  }

  if (!result.ok) {
    if (voiceLibraryFull(result.status, result.detail)) {
      throw new Error('The voice library is full.')
    }
    console.error('[Voice Design] prompt:', description.slice(0, 240))
    throw new Error(`Voice Design failed: HTTP ${result.status} ${result.detail.slice(0, 400)}`)
  }
  const voiceId = readDesignedVoiceId(result.payload)
  if (!voiceId) throw new Error('Voice Design did not return a voice id')
  if (previous && previous !== voiceId && isDesignedGeminiVoiceId(previous)) {
    replacedVoiceIds.set(previous, voiceId)
    if (!deletedIds.has(previous) && !retainVoiceIds.includes(previous)) {
      await deleteVoice(previous, headers)
    }
  }
  return { voiceId }
}

function readInlineAudio(payload: unknown): Buffer | null {
  if (!payload || typeof payload !== 'object') return null
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
    .candidates
  const parts = candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    const inline = (part.inlineData ?? part.inline_data) as { data?: string } | undefined
    if (typeof inline?.data === 'string' && inline.data.length > 0) {
      return Buffer.from(inline.data, 'base64')
    }
  }
  return null
}

async function synthesizeOnce(args: {
  text: string
  voiceId: string
  style?: string
}): Promise<{ status: number; audio: Buffer | null; detail: string }> {
  const headers = await vertexHeaders()
  const url = `https://aiplatform.googleapis.com/v1/projects/${vertexProjectId()}/locations/global/publishers/google/models/${DESIGNED_VOICE_TTS_MODEL}:generateContent`
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(
      buildDesignedVoiceSynthesisBody({
        text: args.text,
        voiceId: args.voiceId,
        style: args.style,
      })
    ),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    return { status: response.status, audio: null, detail }
  }
  const payload = await response.json()
  return { status: response.status, audio: readInlineAudio(payload), detail: '' }
}

function voiceMissing(status: number, detail: string): boolean {
  if (status === 404) return true
  if (status === 400 || status === 403 || status === 422) {
    return /not found|NOT_FOUND|does not exist|unknown voice|invalid.*voice|voice_/i.test(detail)
  }
  return false
}

/**
 * Gemini 3.8 returns a WAV. This route leaves it as WAV so scene-audio does
 * not trace the ffmpeg binary into an already full Vercel function.
 */
export async function synthesizeDesignedGeminiVoiceWav(args: {
  text: string
  voiceId: string
  style?: string
  designPrompt?: string
  displayName?: string
}): Promise<Buffer> {
  const text = args.text.trim()
  if (!text) return Buffer.alloc(0)
  let voiceId = replacedVoiceIds.get(args.voiceId) ?? args.voiceId
  if (!isDesignedGeminiVoiceId(voiceId)) {
    throw new Error('Designed voice synthesis requires a voice_ id')
  }

  let result = await synthesizeOnce({ text, voiceId, style: args.style })
  if (!result.audio && voiceMissing(result.status, result.detail) && args.designPrompt?.trim()) {
    const created = await createDesignedGeminiVoice({
      description: args.designPrompt,
      displayName: args.displayName || 'SceneFlow character',
    })
    replacedVoiceIds.set(args.voiceId, created.voiceId)
    voiceId = created.voiceId
    result = await synthesizeOnce({ text, voiceId, style: args.style })
  }
  if (!result.audio) {
    throw new Error(
      `Designed voice TTS failed: HTTP ${result.status} ${result.detail.slice(0, 400)}`
    )
  }
  return result.audio
}
