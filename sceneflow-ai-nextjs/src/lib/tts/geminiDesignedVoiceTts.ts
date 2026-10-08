import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import {
  DESIGNED_VOICE_TTS_MODEL,
  DESIGNED_VOICE_TYPE,
  buildDesignedVoiceSynthesisBody,
  isDesignedGeminiVoiceId,
  readDesignedVoiceId,
  voiceDesignCreateAttempts,
  voicesToEvict,
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

async function listPromptedVoices(headers: Record<string, string>): Promise<StoredPromptedVoice[]> {
  const collected: StoredPromptedVoice[] = []
  let pageToken = ''
  for (let page = 0; page < 8; page++) {
    const url = new URL(voicesCollectionUrl())
    url.searchParams.set('pageSize', '50')
    url.searchParams.append('type', DESIGNED_VOICE_TYPE)
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const response = await fetch(url, { headers })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Voice Design list failed: HTTP ${response.status} ${detail.slice(0, 240)}`)
    }
    const data = (await response.json()) as {
      voices?: Array<Record<string, unknown>>
      nextPageToken?: string
    }
    for (const voice of data.voices ?? []) {
      const id = readDesignedVoiceId(voice)
      if (!id) continue
      const createTime = typeof voice.createTime === 'string' ? voice.createTime : undefined
      collected.push({ id, createTime })
    }
    pageToken = data.nextPageToken?.trim() ?? ''
    if (!pageToken) break
  }
  return collected
}

async function deleteVoice(voiceId: string, headers: Record<string, string>): Promise<void> {
  const response = await fetch(voiceResourceName(voiceId), { method: 'DELETE', headers })
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => '')
    console.warn(`[Voice Design] Delete ${voiceId} failed: HTTP ${response.status} ${detail.slice(0, 180)}`)
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
  return status === 400 && /did not complete|rephras/i.test(detail)
}

function voiceLibraryFull(status: number, detail: string): boolean {
  return (
    status === 429 ||
    /RESOURCE_EXHAUSTED|quota exceeded|maximum active stored voice/i.test(detail)
  )
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
    console.error('[Voice Design] prompt rejected, retrying shorter:', args.description.slice(0, 240))
    result = await postVoice(shorter, args.headers)
  }
  return result
}

/** Free one stored voice so a create can proceed at the project cap. */
async function freeOneVoiceSlot(
  headers: Record<string, string>,
  replaceVoiceId: string | undefined,
  retainVoiceIds: string[]
): Promise<boolean> {
  const retain = new Set(retainVoiceIds)
  if (
    replaceVoiceId &&
    isDesignedGeminiVoiceId(replaceVoiceId) &&
    !retain.has(replaceVoiceId)
  ) {
    await deleteVoice(replaceVoiceId, headers)
    return true
  }
  let voices: StoredPromptedVoice[] = []
  try {
    voices = await listPromptedVoices(headers)
  } catch (error) {
    console.warn('[Voice Design] Could not list voices to free a slot:', error)
    return false
  }
  const unretained = voices.filter(
    (voice) => isDesignedGeminiVoiceId(voice.id) && !retain.has(voice.id)
  )
  const [oldest] = voicesToEvict(voices, retainVoiceIds, unretained.length)
  if (!oldest) return false
  await deleteVoice(oldest, headers)
  return true
}

export async function createDesignedGeminiVoice(args: {
  description: string
  displayName: string
  languageCode?: string
  retainVoiceIds?: string[]
  /** Previous designed voice for this character. Deleted after a replacement is stored. */
  replaceVoiceId?: string
}): Promise<{ voiceId: string }> {
  const description = args.description.trim()
  if (description.length < 12) {
    throw new Error('Voice Design needs a description of the character’s voice')
  }
  const retainVoiceIds = args.retainVoiceIds ?? []
  await evictOldestDesignedVoices(retainVoiceIds)
  const headers = await vertexHeaders()
  let result = await createFromAttempts({
    description,
    displayName: args.displayName,
    languageCode: args.languageCode,
    headers,
  })
  if (!result.ok && voiceLibraryFull(result.status, result.detail)) {
    const freed = await freeOneVoiceSlot(headers, args.replaceVoiceId, retainVoiceIds)
    if (freed) {
      result = await createFromAttempts({
        description,
        displayName: args.displayName,
        languageCode: args.languageCode,
        headers,
      })
    }
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
  const previous = args.replaceVoiceId?.trim()
  if (
    previous &&
    previous !== voiceId &&
    isDesignedGeminiVoiceId(previous) &&
    !retainVoiceIds.includes(previous)
  ) {
    await deleteVoice(previous, headers)
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
  return /not found|NOT_FOUND|voice_/i.test(detail) && status === 400
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
