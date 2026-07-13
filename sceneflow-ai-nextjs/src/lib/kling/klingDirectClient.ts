/**
 * Direct Kling AI API client (klingai.com) — primary SceneFlow video engine.
 * Supports official JWT auth (AccessKey + SecretKey) and gateway Bearer token mode.
 */

import jwt from 'jsonwebtoken'
import {
  getKlingApiBaseUrl,
  getKlingCapabilities,
  getKlingDefaultModel,
  getKlingElementCreateModel,
  getKlingElementEndpoint,
  getKlingElementPollIntervalMs,
  getKlingElementPollPath,
  getKlingElementPollTimeoutSec,
  getKlingWatermarkDefault,
  getKlingPollIntervalMs,
  getKlingSegmentPollTimeoutSec,
  hasDirectKlingCredentials,
  isKlingSoundEnabled,
} from './config'
import {
  KLING_DUAL_IMAGE_PRESETS,
  type KlingImageListEntry,
  type KlingModelId,
  type KlingQuality,
  resolveKlingApiModelName,
  type KlingSubmitResult,
  type KlingVideoInput,
  type KlingWebhookPayload,
} from './types'

export type { KlingVideoInput } from './types'

type KlingTaskStatus = 'submitted' | 'processing' | 'succeed' | 'failed'

interface KlingTaskResponse {
  code?: number
  message?: string
  data?: {
    task_id?: string
    task_status?: KlingTaskStatus
    task_status_msg?: string
    element_id?: string
    task_result?: {
      videos?: Array<{ url?: string; id?: string }>
    }
  }
}

export interface BuildKlingBodyResult {
  body: Record<string, unknown>
  droppedKeys: string[]
  endpoint: 'text2video' | 'image2video'
}

/** Official klingai.com duration enum: "5" or "10" only. */
function mapOfficialKlingDuration(seconds: number | undefined): string {
  const raw = seconds ?? 10
  return raw <= 7 ? '5' : '10'
}

function isOfficialV2ApiModel(apiModelName: string): boolean {
  return apiModelName.startsWith('kling-v2')
}

function supportsOfficialNativeAudio(apiModelName: string): boolean {
  return apiModelName === 'kling-v2-6'
}

function mapOfficialKlingMode(
  quality: KlingQuality,
  hasEndFrame: boolean
): 'std' | 'pro' {
  if (hasEndFrame) return 'pro'
  if (quality === 'std') return 'std'
  return 'pro'
}

function mapAspectRatio(ratio?: string, hasStartFrame?: boolean): string {
  if (ratio === '9:16') return '9:16'
  if (ratio === '1:1') return '1:1'
  if (ratio === 'auto' && hasStartFrame) return 'auto'
  return '16:9'
}

function truncatePrompt(text: string, max = 2500): string {
  return text.length > max ? text.slice(0, max) : text
}

/** Exported for unit tests */
export function buildKlingAuthHeader(): string {
  const apiKey = process.env.KLING_API_KEY?.trim()
  if (apiKey) {
    return `Bearer ${apiKey}`
  }

  const accessKey = process.env.KLING_ACCESS_KEY?.trim()
  const secretKey = process.env.KLING_SECRET_KEY?.trim()
  if (!accessKey || !secretKey) {
    throw new Error('Kling credentials missing: set KLING_API_KEY or KLING_ACCESS_KEY + KLING_SECRET_KEY')
  }

  const now = Math.floor(Date.now() / 1000)
  const token = jwt.sign(
    { iss: accessKey, exp: now + 1800, nbf: now - 5 },
    secretKey,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  )
  return `Bearer ${token}`
}

/** Exported for unit tests */
export function extractKlingVideoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as KlingTaskResponse['data']
  const videos = d?.task_result?.videos
  if (videos?.[0]?.url) return videos[0].url
  return undefined
}

/** Exported for unit tests — reads task_result.videos[0].id for extend chaining */
export function extractKlingVideoId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as KlingTaskResponse['data']
  const videos = d?.task_result?.videos
  if (videos?.[0]?.id) return videos[0].id
  return undefined
}

export interface KlingPollResult {
  videoUrl: string
  videoId?: string
}

export function parseKlingWebhookPayload(body: unknown): KlingWebhookPayload | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  const data = (raw.data as Record<string, unknown> | undefined) ?? raw
  const taskId = (data.task_id as string | undefined) ?? (raw.task_id as string | undefined)
  if (!taskId) return null
  return {
    task_id: taskId,
    task_status: data.task_status as KlingWebhookPayload['task_status'],
    task_status_msg: data.task_status_msg as string | undefined,
    task_result: data.task_result as KlingWebhookPayload['task_result'],
  }
}

async function resolveImageForKling(source: string): Promise<string> {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source
  }

  const dataMatch = source.match(/^data:([^;]+);base64,(.+)$/)
  const mime = dataMatch?.[1] || 'image/png'
  const base64 = dataMatch?.[2] || source

  const baseUrl = getKlingApiBaseUrl()
  const res = await fetch(`${baseUrl}/images/upload`, {
    method: 'POST',
    headers: {
      Authorization: buildKlingAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: base64,
      mime_type: mime,
    }),
  })

  if (!res.ok) {
    throw new Error(`Kling image upload failed: ${res.status}`)
  }

  const json = (await res.json()) as { data?: { url?: string } }
  if (!json.data?.url) {
    throw new Error('Kling image upload completed without URL')
  }
  return json.data.url
}

async function klingRequest(path: string, body: Record<string, unknown>): Promise<KlingTaskResponse> {
  const baseUrl = getKlingApiBaseUrl()
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: buildKlingAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as KlingTaskResponse
  if (!res.ok || (json.code != null && json.code !== 0)) {
    throw new Error(json.message || `Kling API error: ${res.status}`)
  }
  return json
}

async function klingGet(path: string): Promise<KlingTaskResponse> {
  const baseUrl = getKlingApiBaseUrl()
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: buildKlingAuthHeader() },
  })
  const json = (await res.json()) as KlingTaskResponse
  if (!res.ok || (json.code != null && json.code !== 0)) {
    throw new Error(json.message || `Kling API error: ${res.status}`)
  }
  return json
}

export async function pollKlingTask(
  taskId: string,
  endpoint: 'text2video' | 'image2video' | 'video-extend' | 'lip-sync',
  maxWaitSec = 300,
  intervalMs = 5000
): Promise<string> {
  const result = await pollKlingTaskResult(taskId, endpoint, maxWaitSec, intervalMs)
  return result.videoUrl
}

export async function pollKlingTaskResult(
  taskId: string,
  endpoint: 'text2video' | 'image2video' | 'video-extend' | 'lip-sync',
  maxWaitSec = 300,
  intervalMs = 5000
): Promise<KlingPollResult> {
  const deadline = Date.now() + maxWaitSec * 1000

  while (Date.now() < deadline) {
    const json = await klingGet(`/videos/${endpoint}/${taskId}`)
    const status = json.data?.task_status

    if (status === 'succeed') {
      const videoUrl = extractKlingVideoUrl(json.data)
      if (!videoUrl) throw new Error('Kling task succeeded without video URL')
      return {
        videoUrl,
        videoId: extractKlingVideoId(json.data),
      }
    }

    if (status === 'failed') {
      throw new Error(json.data?.task_status_msg || 'Kling video generation failed')
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error('Kling video generation timed out')
}

function buildImageList(input: KlingVideoInput): KlingImageListEntry[] {
  const list: KlingImageListEntry[] = [...(input.image_list ?? [])]
  if (input.startFrame && !list.some((e) => e.type === 'first_frame')) {
    list.push({ url: input.startFrame, type: 'first_frame' })
  }
  if (input.lastFrame && !list.some((e) => e.type === 'end_frame')) {
    list.push({ url: input.lastFrame, type: 'end_frame' })
  }
  if (input.secondaryImageUrl) {
    list.push({ url: input.secondaryImageUrl, type: 'end_frame' })
  }
  return list
}

/**
 * Build gated Kling request body. Unsupported params for the model are stripped.
 */
export function buildKlingVideoBody(
  input: KlingVideoInput,
  resolvedImageList?: KlingImageListEntry[]
): BuildKlingBodyResult {
  const model = (input.model_name || getKlingDefaultModel()) as KlingModelId
  const caps = getKlingCapabilities(model)
  const droppedKeys: string[] = []

  const imageList = resolvedImageList ?? buildImageList(input)
  const hasStart = imageList.some((e) => e.type === 'first_frame')
  const endFrame = imageList.find((e) => e.type === 'end_frame')
  const hasEndFrame = !!endFrame
  const quality: KlingQuality =
    input.mode === 'std' || input.mode === 'pro' || input.mode === '4k'
      ? input.mode
      : 'pro'

  const apiModelName = resolveKlingApiModelName(model)
  const officialMode = mapOfficialKlingMode(quality, hasEndFrame)

  if (quality === '4k' || (hasEndFrame && quality === 'std')) {
    droppedKeys.push('mode')
  }

  const body: Record<string, unknown> = {
    model_name: apiModelName,
    prompt: truncatePrompt(input.prompt),
    duration: mapOfficialKlingDuration(input.duration),
    aspect_ratio: mapAspectRatio(input.aspect_ratio, hasStart),
    mode: officialMode,
  }

  if (input.negative_prompt) {
    body.negative_prompt = truncatePrompt(input.negative_prompt)
  }

  if (!isOfficialV2ApiModel(apiModelName) && input.cfg_scale != null) {
    const cfg = Math.min(1, Math.max(0, input.cfg_scale))
    body.cfg_scale = cfg
  } else if (input.cfg_scale != null) {
    droppedKeys.push('cfg_scale')
  }

  const soundOn =
    input.sound === true ||
    input.sound === 'on' ||
    (input.sound !== false && input.sound !== 'off' && isKlingSoundEnabled())
  if (supportsOfficialNativeAudio(apiModelName) && soundOn) {
    body.sound = 'on'
  } else if (soundOn) {
    droppedKeys.push('sound')
  }

  if (caps.watermark && input.watermark_enabled != null) {
    body.watermark_enabled = input.watermark_enabled
  } else if (input.watermark_enabled != null) {
    droppedKeys.push('watermark_enabled')
  } else if (caps.watermark && getKlingWatermarkDefault()) {
    body.watermark_enabled = true
  }

  const firstFrame = imageList.find((e) => e.type === 'first_frame')
  if (firstFrame) {
    body.image = firstFrame.url
  }
  if (endFrame) {
    body.image_tail = endFrame.url
  } else if (imageList.length > 0 && !firstFrame) {
    droppedKeys.push('image')
  }

  if (caps.v2v && input.video_url) {
    body.video_url = input.video_url
  } else if (input.video_url) {
    droppedKeys.push('video_url')
  }

  if (caps.elements && input.element_list?.length) {
    body.element_list = input.element_list.slice(0, caps.maxElements)
  } else if (input.element_list?.length) {
    droppedKeys.push('element_list')
  }

  if (caps.voiceList && input.voice_list?.length) {
    body.voice_list = input.voice_list.slice(0, caps.maxVoices).map((v) => ({
      voice_id: v.voice_id,
    }))
  } else if (input.voice_list?.length) {
    droppedKeys.push('voice_list')
  }

  if (caps.multiShot && input.multi_shot) {
    body.multi_shot = true
    if (input.shot_type) body.shot_type = input.shot_type
    if (input.multi_prompt?.length) {
      body.multi_prompt = input.multi_prompt
        .slice(0, caps.maxMultiPromptScenes)
        .map((row) => ({
          index: row.index,
          prompt: truncatePrompt(row.prompt),
          duration: String(row.duration),
        }))
    }
  } else {
    if (input.multi_shot) droppedKeys.push('multi_shot')
    if (input.shot_type) droppedKeys.push('shot_type')
    if (input.multi_prompt?.length) droppedKeys.push('multi_prompt')
  }

  if (caps.presets && input.preset) {
    const isDual = KLING_DUAL_IMAGE_PRESETS.includes(input.preset as never)
    if (!isDual || imageList.length >= 2) {
      body.preset = input.preset
    } else {
      droppedKeys.push('preset')
    }
  } else if (input.preset) {
    droppedKeys.push('preset')
  }

  if (caps.faceConsistency && input.face_consistency && hasStart) {
    body.face_consistency = true
  } else if (input.face_consistency) {
    droppedKeys.push('face_consistency')
  }

  if (input.webhook_url) {
    body.callback_url = input.webhook_url
  }

  const endpoint: 'text2video' | 'image2video' = hasStart ? 'image2video' : 'text2video'

  if (droppedKeys.length) {
    console.log(`[Kling] Dropped unsupported params for ${model}: ${droppedKeys.join(', ')}`)
  }

  return { body, droppedKeys, endpoint }
}

export interface KlingElementMultiInput {
  name: string
  description?: string
  frontalImageUrl: string
  referImageUrls: string[]
  tagId?: string
}

/** Exported for unit tests — builds image_refer create-element body. */
export function buildKlingElementMultiBody(
  input: KlingElementMultiInput,
  resolved: { frontal: string; refers: string[] }
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    reference_type: 'image_refer',
    element_name: input.name.slice(0, 20),
    element_description: (input.description || input.name).slice(0, 100),
    element_image_list: {
      frontal_image: resolved.frontal,
      refer_images: resolved.refers.slice(0, 3).map((image_url) => ({ image_url })),
    },
  }

  const model = getKlingElementCreateModel()
  if (model) body.model = model

  if (input.tagId?.trim()) {
    body.tag_list = [{ tag_id: input.tagId.trim() }]
  }

  return body
}

export async function pollKlingElementTask(taskId: string): Promise<string> {
  const deadline = Date.now() + getKlingElementPollTimeoutSec() * 1000
  const intervalMs = getKlingElementPollIntervalMs()
  const pollPath = getKlingElementPollPath(taskId)

  while (Date.now() < deadline) {
    const json = await klingGet(pollPath)
    const elementId = json.data?.element_id
    if (elementId) return elementId

    const status = json.data?.task_status
    if (status === 'succeed') {
      if (json.data?.element_id) return json.data.element_id
      throw new Error('Kling element task succeeded without element_id')
    }
    if (status === 'failed') {
      throw new Error(json.data?.task_status_msg || 'Kling element registration failed')
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error('Kling element registration timed out')
}

/** Multi-image bind element (identity frontal + wardrobe refer images). */
export async function registerKlingElementMulti(
  input: KlingElementMultiInput
): Promise<string> {
  const frontal = await resolveImageForKling(input.frontalImageUrl)
  const refers: string[] = []
  for (const url of input.referImageUrls.slice(0, 3)) {
    refers.push(await resolveImageForKling(url))
  }
  if (refers.length < 1) {
    throw new Error('Multi-image element requires at least one refer image')
  }

  const body = buildKlingElementMultiBody(input, { frontal, refers })
  const create = await klingRequest(getKlingElementEndpoint(), body)

  const immediateId = create.data?.element_id
  if (immediateId) return immediateId

  const taskId = create.data?.task_id
  if (!taskId) {
    throw new Error('Kling element registration completed without element_id or task_id')
  }

  return pollKlingElementTask(taskId)
}

export async function registerKlingElement(imageUrl: string, name?: string): Promise<string> {
  const resolved = await resolveImageForKling(imageUrl)
  const create = await klingRequest(getKlingElementEndpoint(), {
    image: resolved,
    name: name?.slice(0, 128) || 'sceneflow-element',
  })
  const elementId = create.data?.element_id
  if (elementId) return elementId

  const taskId = create.data?.task_id
  if (taskId) return pollKlingElementTask(taskId)

  throw new Error('Kling element registration completed without element_id')
}

export async function submitKlingVideo(
  input: KlingVideoInput,
  options?: { webhookUrl?: string }
): Promise<KlingSubmitResult> {
  if (!hasDirectKlingCredentials()) {
    throw new Error('Direct Kling credentials are not configured')
  }

  const imageList = buildImageList(input)
  const resolvedList: KlingImageListEntry[] = []
  for (const entry of imageList) {
    resolvedList.push({
      ...entry,
      url: await resolveImageForKling(entry.url),
    })
  }

  const withWebhook: KlingVideoInput = {
    ...input,
    webhook_url: options?.webhookUrl ?? input.webhook_url,
  }

  const { body, endpoint } = buildKlingVideoBody(withWebhook, resolvedList)
  const create = await klingRequest(`/videos/${endpoint}`, body)
  const taskId = create.data?.task_id
  if (!taskId) {
    throw new Error('Kling video task created without task_id')
  }

  return {
    taskId,
    endpoint,
    asyncMode: !!options?.webhookUrl || !!input.webhook_url,
  }
}

export async function runKlingVideo(input: KlingVideoInput): Promise<Buffer> {
  const submit = await submitKlingVideo(input)
  const polled = await pollKlingTaskResult(
    submit.taskId,
    submit.endpoint,
    getKlingSegmentPollTimeoutSec(),
    getKlingPollIntervalMs()
  )
  const res = await fetch(polled.videoUrl)
  if (!res.ok) throw new Error(`Kling video download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export interface KlingExtendInput {
  videoId: string
  prompt?: string
  negativePrompt?: string
  cfgScale?: number
  webhookUrl?: string
  /** Intentionally ignored — model/mode inherited from parent video */
  model?: string
}

export interface BuildKlingExtendBodyResult {
  body: Record<string, unknown>
  droppedKeys: string[]
}

/** Exported for unit tests */
export function buildKlingExtendBody(input: KlingExtendInput): BuildKlingExtendBodyResult {
  const droppedKeys: string[] = []
  const body: Record<string, unknown> = {
    video_id: input.videoId,
  }

  if (input.prompt) {
    body.prompt = truncatePrompt(input.prompt)
  }
  if (input.negativePrompt) {
    body.negative_prompt = truncatePrompt(input.negativePrompt)
  }
  if (input.cfgScale != null) {
    body.cfg_scale = Math.min(1, Math.max(0, input.cfgScale))
  }
  if (input.webhookUrl) {
    body.callback_url = input.webhookUrl
  }
  if (input.model) {
    droppedKeys.push('model_name')
    droppedKeys.push('mode')
  }

  return { body, droppedKeys }
}

export async function submitKlingVideoExtend(
  input: KlingExtendInput
): Promise<KlingSubmitResult> {
  if (!hasDirectKlingCredentials()) {
    throw new Error('Direct Kling credentials are not configured')
  }

  const { body } = buildKlingExtendBody(input)
  const create = await klingRequest('/videos/video-extend', body)
  const taskId = create.data?.task_id
  if (!taskId) {
    throw new Error('Kling video-extend task created without task_id')
  }

  return {
    taskId,
    endpoint: 'video-extend',
    asyncMode: !!input.webhookUrl,
  }
}

export async function runKlingVideoExtend(input: KlingExtendInput): Promise<{
  buffer: Buffer
  videoId?: string
}> {
  const submit = await submitKlingVideoExtend(input)
  const polled = await pollKlingTaskResult(submit.taskId, 'video-extend')
  const res = await fetch(polled.videoUrl)
  if (!res.ok) throw new Error(`Kling extend download failed: ${res.status}`)
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    videoId: polled.videoId,
  }
}

export async function submitKlingLipSync(input: {
  videoUrl: string
  audioUrl: string
  webhookUrl?: string
}): Promise<KlingSubmitResult> {
  if (!hasDirectKlingCredentials()) {
    throw new Error('Direct Kling credentials are not configured')
  }

  const body: Record<string, unknown> = {
    video_url: input.videoUrl,
    audio_url: input.audioUrl,
    audio_type: 'url',
    mode: 'audio2video',
  }
  if (input.webhookUrl) {
    body.callback_url = input.webhookUrl
  }

  const create = await klingRequest('/videos/lip-sync', body)
  const taskId = create.data?.task_id
  if (!taskId) throw new Error('Kling lip-sync task created without task_id')

  return {
    taskId,
    endpoint: 'lip-sync',
    asyncMode: !!input.webhookUrl,
  }
}

export async function runKlingLipSync(videoUrl: string, audioUrl: string): Promise<Buffer> {
  if (!hasDirectKlingCredentials()) {
    throw new Error('Direct Kling credentials are not configured')
  }

  const submit = await submitKlingLipSync({ videoUrl, audioUrl })
  const outUrl = await pollKlingTask(submit.taskId, 'lip-sync')
  const res = await fetch(outUrl)
  if (!res.ok) throw new Error(`Kling lip-sync download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export async function downloadKlingVideoUrl(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Kling video download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
