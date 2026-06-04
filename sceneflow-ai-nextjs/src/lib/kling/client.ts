/**
 * Official Kling API client (platform key) — image + video async tasks.
 * @see https://api.klingai.com/v1
 */

import { klingFetch } from './auth'

export type KlingTaskStatus = 'submitted' | 'processing' | 'succeed' | 'failed'

export interface KlingTaskResult {
  status: KlingTaskStatus
  taskId: string
  videoUrl?: string
  imageUrl?: string
  error?: string
}

function parseTaskPayload(data: Record<string, unknown>): KlingTaskResult {
  const taskId = String(data.task_id || data.taskId || data.id || '')
  const statusRaw = String(
    data.task_status || data.status || data.state || 'processing'
  ).toLowerCase()

  let status: KlingTaskStatus = 'processing'
  if (['succeed', 'success', 'completed', 'done'].includes(statusRaw)) status = 'succeed'
  else if (['failed', 'fail', 'error'].includes(statusRaw)) status = 'failed'
  else if (['submitted', 'pending', 'queued'].includes(statusRaw)) status = 'submitted'

  const result = (data.task_result || data.result || data.data) as Record<string, unknown> | undefined
  const videos = (result?.videos || data.videos) as Array<Record<string, string>> | undefined
  const images = (result?.images || data.images) as Array<Record<string, string>> | undefined

  const videoUrl =
    videos?.[0]?.url || (result?.video_url as string) || (data.video_url as string)
  const imageUrl =
    images?.[0]?.url || (result?.image_url as string) || (data.image_url as string)

  const error =
    (data.task_status_msg as string) ||
    (data.message as string) ||
    (data.error as string)

  return { status, taskId, videoUrl, imageUrl, error }
}

export async function createKlingText2Video(body: {
  prompt: string
  negative_prompt?: string
  duration?: number
  aspect_ratio?: string
  model?: string
}): Promise<string> {
  const res = await klingFetch('/videos/text2video', {
    method: 'POST',
    body: JSON.stringify({
      model: body.model || process.env.KLING_VIDEO_MODEL || 'kling-v2-master',
      prompt: body.prompt,
      negative_prompt: body.negative_prompt,
      duration: body.duration ?? 5,
      aspect_ratio: body.aspect_ratio || '16:9',
      mode: process.env.KLING_VIDEO_MODE || 'std',
    }),
  })
  if (!res.ok) throw new Error(`Kling text2video failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const taskId = String(data.task_id || data.data?.task_id || data.id)
  if (!taskId) throw new Error('Kling text2video: missing task_id')
  return taskId
}

export async function createKlingImage2Video(body: {
  prompt?: string
  negative_prompt?: string
  image_url?: string
  image_base64?: string
  image_tail_url?: string
  image_tail_base64?: string
  duration?: number
  aspect_ratio?: string
  model?: string
}): Promise<string> {
  const res = await klingFetch('/videos/image2video', {
    method: 'POST',
    body: JSON.stringify({
      model: body.model || process.env.KLING_VIDEO_MODEL || 'kling-v2-master',
      prompt: body.prompt,
      negative_prompt: body.negative_prompt,
      image_url: body.image_url,
      image_base64: body.image_base64,
      image_tail: body.image_tail_url || body.image_tail_base64,
      duration: body.duration ?? 5,
      aspect_ratio: body.aspect_ratio || '16:9',
      mode: process.env.KLING_VIDEO_MODE || 'std',
    }),
  })
  if (!res.ok) throw new Error(`Kling image2video failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const taskId = String(data.task_id || data.data?.task_id || data.id)
  if (!taskId) throw new Error('Kling image2video: missing task_id')
  return taskId
}

export async function createKlingImageGeneration(body: {
  prompt: string
  negative_prompt?: string
  aspect_ratio?: string
  model?: string
}): Promise<string> {
  const res = await klingFetch('/images/generations', {
    method: 'POST',
    body: JSON.stringify({
      model: body.model || process.env.KLING_IMAGE_MODEL || 'kling-v2',
      prompt: body.prompt,
      negative_prompt: body.negative_prompt,
      aspect_ratio: body.aspect_ratio || '16:9',
    }),
  })
  if (!res.ok) throw new Error(`Kling image failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const taskId = String(data.task_id || data.data?.task_id || data.id)
  if (!taskId) throw new Error('Kling image: missing task_id')
  return taskId
}

export async function getKlingVideoTask(taskId: string): Promise<KlingTaskResult> {
  const res = await klingFetch(`/videos/${taskId}`)
  if (!res.ok) throw new Error(`Kling video task poll failed: ${res.status}`)
  const data = await res.json()
  const inner = (data.data || data) as Record<string, unknown>
  return parseTaskPayload(inner)
}

export async function getKlingImageTask(taskId: string): Promise<KlingTaskResult> {
  const res = await klingFetch(`/images/generations/${taskId}`)
  if (!res.ok) {
    const alt = await klingFetch(`/images/${taskId}`)
    if (!alt.ok) throw new Error(`Kling image task poll failed: ${res.status}`)
    const altData = await alt.json()
    return parseTaskPayload((altData.data || altData) as Record<string, unknown>)
  }
  const data = await res.json()
  return parseTaskPayload((data.data || data) as Record<string, unknown>)
}

export async function waitForKlingVideoTask(
  taskId: string,
  maxWaitSeconds = 300,
  pollIntervalSeconds = 5
): Promise<KlingTaskResult> {
  const deadline = Date.now() + maxWaitSeconds * 1000
  while (Date.now() < deadline) {
    const result = await getKlingVideoTask(taskId)
    if (result.status === 'succeed') return result
    if (result.status === 'failed') {
      throw new Error(result.error || 'Kling video generation failed')
    }
    await new Promise((r) => setTimeout(r, pollIntervalSeconds * 1000))
  }
  throw new Error('Kling video task timed out')
}

export async function waitForKlingImageTask(
  taskId: string,
  maxWaitSeconds = 120,
  pollIntervalSeconds = 3
): Promise<KlingTaskResult> {
  const deadline = Date.now() + maxWaitSeconds * 1000
  while (Date.now() < deadline) {
    const result = await getKlingImageTask(taskId)
    if (result.status === 'succeed') return result
    if (result.status === 'failed') {
      throw new Error(result.error || 'Kling image generation failed')
    }
    await new Promise((r) => setTimeout(r, pollIntervalSeconds * 1000))
  }
  throw new Error('Kling image task timed out')
}

export async function downloadKlingAsset(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Kling download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
