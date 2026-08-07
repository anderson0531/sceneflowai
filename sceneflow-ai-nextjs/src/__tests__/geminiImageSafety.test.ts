import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  HarmBlockThreshold,
  getGeminiImageSafetySettings,
  getGeminiImageSafetyThreshold,
  getGeminiSafetyThreshold,
} from '@/lib/vertexai/safety'
import { isVertexContentPolicyError } from '@/lib/generation/contentPolicy'

const ENV_KEYS = [
  'VERTEX_SAFETY_THRESHOLD',
  'VERTEX_IMAGE_SAFETY_THRESHOLD',
] as const

const saved: Record<string, string | undefined> = {}

function stashEnv() {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
}

afterEach(() => {
  restoreEnv()
})

describe('getGeminiImageSafetyThreshold', () => {
  it('defaults to OFF for max image tolerance', () => {
    stashEnv()
    expect(getGeminiImageSafetyThreshold()).toBe(HarmBlockThreshold.OFF)
    expect(getGeminiSafetyThreshold()).toBe(HarmBlockThreshold.BLOCK_ONLY_HIGH)
  })

  it('prefers VERTEX_IMAGE_SAFETY_THRESHOLD over VERTEX_SAFETY_THRESHOLD', () => {
    stashEnv()
    process.env.VERTEX_SAFETY_THRESHOLD = 'BLOCK_MEDIUM_AND_ABOVE'
    process.env.VERTEX_IMAGE_SAFETY_THRESHOLD = 'BLOCK_NONE'
    expect(getGeminiImageSafetyThreshold()).toBe(HarmBlockThreshold.BLOCK_NONE)
  })

  it('falls back to VERTEX_SAFETY_THRESHOLD when image env is unset', () => {
    stashEnv()
    process.env.VERTEX_SAFETY_THRESHOLD = 'BLOCK_NONE'
    expect(getGeminiImageSafetyThreshold()).toBe(HarmBlockThreshold.BLOCK_NONE)
  })

  it('returns four categories at the image threshold', () => {
    stashEnv()
    const settings = getGeminiImageSafetySettings()
    expect(settings).toHaveLength(4)
    expect(settings.every((s) => s.threshold === HarmBlockThreshold.OFF)).toBe(true)
  })
})

describe('image soft-block policy detection', () => {
  it('treats empty-image safety messages as content policy', () => {
    expect(
      isVertexContentPolicyError(
        'No image in Vertex Gemini Image response — blocked by safety (model=gemini-2.5-flash-image, finishReason=SAFETY)'
      )
    ).toBe(true)
    expect(
      isVertexContentPolicyError('Image generation blocked by safety: OTHER')
    ).toBe(true)
    expect(
      isVertexContentPolicyError(
        'No image in Vertex Gemini Image response — blocked by safety (model=x, finishReason=STOP, text="I cannot")'
      )
    ).toBe(true)
  })
})

describe('vertexImageClient uses image safety settings', () => {
  it('imports getGeminiImageSafetySettings rather than text threshold', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/lib/vertexai/vertexImageClient.ts'),
      'utf8'
    )
    expect(src).toContain('getGeminiImageSafetySettings')
    expect(src).not.toMatch(/getGeminiSafetyThreshold\s*\(/)
    expect(src).toContain('blocked by safety')
  })
})
