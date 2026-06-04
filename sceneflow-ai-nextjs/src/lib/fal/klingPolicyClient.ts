/**
 * Fal.ai-hosted Kling models for Vertex policy fallback (pay-as-you-go).
 */

import { fal } from '@fal-ai/client'
import {
  ensureFalConfigured,
  getFalKlingT2vModel,
  getFalKlingI2vModel,
  getFalKlingImageModel,
} from './config'

export type FalKlingVideoInput = {
  prompt: string
  negative_prompt?: string
  duration?: number
  aspect_ratio?: string
  startFrame?: string
  lastFrame?: string
}

function mapFalDuration(seconds?: number): '5' | '10' {
  if (seconds != null && seconds >= 8) return '10'
  return '5'
}

function mapAspectRatio(ratio?: string): string {
  if (ratio === '9:16') return '9:16'
  if (ratio === '1:1') return '1:1'
  return '16:9'
}

/** Exported for unit tests */
export function buildFalKlingVideoInput(body: FalKlingVideoInput): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: body.prompt,
    duration: mapFalDuration(body.duration),
    aspect_ratio: mapAspectRatio(body.aspect_ratio),
  }
  if (body.negative_prompt) input.negative_prompt = body.negative_prompt
  if (body.startFrame) input.start_image_url = body.startFrame
  if (body.lastFrame) {
    input.end_image_url = body.lastFrame
    input.tail_image_url = body.lastFrame
  }
  return input
}

async function resolveImageUrl(source: string): Promise<string> {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source
  }
  ensureFalConfigured()
  let base64 = source
  let mime = 'image/png'
  const dataMatch = source.match(/^data:([^;]+);base64,(.+)$/)
  if (dataMatch) {
    mime = dataMatch[1]
    base64 = dataMatch[2]
  }
  const buffer = Buffer.from(base64, 'base64')
  const blob = new Blob([buffer], { type: mime })
  return fal.storage.upload(blob)
}

function extractVideoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  const video = d.video as Record<string, unknown> | undefined
  if (typeof video?.url === 'string') return video.url
  if (typeof d.video_url === 'string') return d.video_url
  const videos = d.videos as Array<{ url?: string }> | undefined
  if (videos?.[0]?.url) return videos[0].url
  return undefined
}

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  const images = d.images as Array<{ url?: string }> | undefined
  if (images?.[0]?.url) return images[0].url
  if (typeof d.image_url === 'string') return d.image_url
  const image = d.image as { url?: string } | undefined
  if (typeof image?.url === 'string') return image.url
  return undefined
}

export async function runFalKlingVideo(body: FalKlingVideoInput): Promise<Buffer> {
  ensureFalConfigured()

  const hasStart = !!body.startFrame
  let startUrl: string | undefined
  let endUrl: string | undefined

  if (hasStart && body.startFrame) {
    startUrl = await resolveImageUrl(body.startFrame)
  }
  if (body.lastFrame) {
    endUrl = await resolveImageUrl(body.lastFrame)
  }

  const input = buildFalKlingVideoInput({
    ...body,
    startFrame: startUrl,
    lastFrame: endUrl,
  })

  const endpoint = hasStart ? getFalKlingI2vModel() : getFalKlingT2vModel()
  const result = await fal.subscribe(endpoint, {
    input,
    logs: false,
  })

  const videoUrl = extractVideoUrl(result.data)
  if (!videoUrl) {
    throw new Error('Fal Kling video completed without video URL')
  }

  const res = await fetch(videoUrl)
  if (!res.ok) throw new Error(`Fal video download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export async function runFalKlingImage(body: {
  prompt: string
  negative_prompt?: string
  aspect_ratio?: string
}): Promise<Buffer> {
  ensureFalConfigured()

  const input: Record<string, unknown> = {
    prompt: body.prompt,
    aspect_ratio: mapAspectRatio(body.aspect_ratio),
  }
  if (body.negative_prompt) input.negative_prompt = body.negative_prompt

  const result = await fal.subscribe(getFalKlingImageModel(), {
    input,
    logs: false,
  })

  const imageUrl = extractImageUrl(result.data)
  if (!imageUrl) {
    throw new Error('Fal Kling image completed without image URL')
  }

  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Fal image download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
