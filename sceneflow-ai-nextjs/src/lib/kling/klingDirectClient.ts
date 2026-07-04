/**
 * Direct Kling AI API client (klingai.com) for Vertex policy fallback.
 * Supports official JWT auth (AccessKey + SecretKey) and gateway Bearer token mode.
 */

import jwt from 'jsonwebtoken'
import {
  getKlingApiBaseUrl,
  getKlingModelName,
  getKlingVideoMode,
  hasDirectKlingCredentials,
  isKlingSoundEnabled,
} from './config'

export type KlingVideoInput = {
  prompt: string
  negative_prompt?: string
  duration?: number
  aspect_ratio?: string
  startFrame?: string
  lastFrame?: string
}

type KlingTaskStatus = 'submitted' | 'processing' | 'succeed' | 'failed'

interface KlingTaskResponse {
  code?: number
  message?: string
  data?: {
    task_id?: string
    task_status?: KlingTaskStatus
    task_status_msg?: string
    task_result?: {
      videos?: Array<{ url?: string; id?: string }>
    }
  }
}

function mapKlingDuration(seconds?: number): '5' | '10' {
  if (seconds != null && seconds >= 8) return '10'
  return '5'
}

function mapAspectRatio(ratio?: string): string {
  if (ratio === '9:16') return '9:16'
  if (ratio === '1:1') return '1:1'
  return '16:9'
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

async function pollKlingTask(
  taskId: string,
  endpoint: 'text2video' | 'image2video',
  maxWaitSec = 300
): Promise<string> {
  const baseUrl = getKlingApiBaseUrl()
  const deadline = Date.now() + maxWaitSec * 1000

  while (Date.now() < deadline) {
    const res = await fetch(`${baseUrl}/videos/${endpoint}/${taskId}`, {
      headers: { Authorization: buildKlingAuthHeader() },
    })

    const json = (await res.json()) as KlingTaskResponse
    const status = json.data?.task_status

    if (status === 'succeed') {
      const url = extractKlingVideoUrl(json.data)
      if (url) return url
      throw new Error('Kling task succeeded without video URL')
    }

    if (status === 'failed') {
      throw new Error(json.data?.task_status_msg || 'Kling video generation failed')
    }

    await new Promise((r) => setTimeout(r, 5000))
  }

  throw new Error('Kling video generation timed out')
}

/** Exported for unit tests */
export function buildKlingVideoBody(body: KlingVideoInput, imageUrl?: string): Record<string, unknown> {
  const input: Record<string, unknown> = {
    model_name: getKlingModelName(),
    prompt: body.prompt,
    duration: mapKlingDuration(body.duration),
    aspect_ratio: mapAspectRatio(body.aspect_ratio),
    mode: getKlingVideoMode(),
  }

  if (body.negative_prompt) input.negative_prompt = body.negative_prompt
  if (isKlingSoundEnabled()) input.sound = 'on'
  if (imageUrl) {
    input.image = imageUrl
    if (body.lastFrame) {
      // tail image support varies by model — best-effort
      input.tail_image = body.lastFrame
    }
  }

  return input
}

export async function runKlingVideo(body: KlingVideoInput): Promise<Buffer> {
  if (!hasDirectKlingCredentials()) {
    throw new Error('Direct Kling credentials are not configured')
  }

  const hasStart = !!body.startFrame
  let imageUrl: string | undefined

  if (hasStart && body.startFrame) {
    imageUrl = await resolveImageForKling(body.startFrame)
  }

  let lastFrameUrl: string | undefined
  if (body.lastFrame) {
    lastFrameUrl = await resolveImageForKling(body.lastFrame)
  }

  const payload = buildKlingVideoBody(body, imageUrl)
  if (lastFrameUrl) payload.tail_image = lastFrameUrl

  const endpoint = hasStart ? 'image2video' : 'text2video'
  const createPath = `/videos/${endpoint}`
  const create = await klingRequest(createPath, payload)
  const taskId = create.data?.task_id

  if (!taskId) {
    throw new Error('Kling video task created without task_id')
  }

  const videoUrl = await pollKlingTask(taskId, endpoint)
  const res = await fetch(videoUrl)
  if (!res.ok) throw new Error(`Kling video download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
