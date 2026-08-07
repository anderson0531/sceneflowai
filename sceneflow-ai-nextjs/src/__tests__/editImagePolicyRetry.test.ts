import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { ContentPolicyExhaustedError } from '@/lib/generation/contentPolicy'

vi.mock('@/lib/vertexai/vertexImageClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/vertexai/vertexImageClient')>(
    '@/lib/vertexai/vertexImageClient'
  )
  return {
    ...actual,
    editVertexImage: vi.fn(),
  }
})

import { editVertexImage } from '@/lib/vertexai/vertexImageClient'
import {
  EDIT_POLICY_USER_MESSAGE,
  editImageWithVertexPolicyRetry,
  escalateEditInstructionForRetry,
} from '@/lib/generation/editImageWithVertexPolicyRetry'

const mockedEdit = vi.mocked(editVertexImage)

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

const SAFETY_ERROR = new Error(
  'No image in Vertex Gemini Image response — blocked by safety (model=gemini-2.5-flash-image, finishReason=IMAGE_SAFETY)'
)

describe('escalateEditInstructionForRetry', () => {
  it('appends pre-vis soften framing after the first failure', () => {
    const next = escalateEditInstructionForRetry('Make the man taller', 1)
    expect(next).toContain('Make the man taller')
    expect(next).toContain('Pre-visualization storyboard edit only')
    expect(next).not.toContain('wardrobe reference still')
  })

  it('does not duplicate soften framing', () => {
    const once = escalateEditInstructionForRetry('Make the man taller', 1)
    const twice = escalateEditInstructionForRetry(once, 2)
    expect(twice.match(/Pre-visualization storyboard edit only/g)?.length).toBe(1)
  })
})

describe('editImageWithVertexPolicyRetry', () => {
  beforeEach(() => {
    mockedEdit.mockReset()
  })

  it('succeeds on first attempt without retries', async () => {
    mockedEdit.mockResolvedValueOnce({
      imageBase64: 'abc',
      mimeType: 'image/png',
    })

    const result = await editImageWithVertexPolicyRetry({
      sourceImage: 'https://example.com/frame.png',
      instruction: 'Make the man taller',
      modelTier: 'eco',
    })

    expect(result.wasPolicyFallback).toBe(false)
    expect(result.vertexAttempts).toBe(1)
    expect(result.modelTierUsed).toBe('eco')
    expect(mockedEdit).toHaveBeenCalledOnce()
  })

  it('softens then upgrades to designer after IMAGE_SAFETY on eco', async () => {
    mockedEdit
      .mockRejectedValueOnce(SAFETY_ERROR)
      .mockRejectedValueOnce(SAFETY_ERROR)
      .mockResolvedValueOnce({
        imageBase64: 'pro-ok',
        mimeType: 'image/png',
      })

    const result = await editImageWithVertexPolicyRetry({
      sourceImage: 'https://example.com/frame.png',
      instruction: 'Make the man taller',
      modelTier: 'eco',
      editIntent: 'preVisEdit',
    })

    expect(result.imageBase64).toBe('pro-ok')
    expect(result.wasPolicyFallback).toBe(true)
    expect(result.vertexAttempts).toBe(3)
    expect(result.modelTierUsed).toBe('designer')
    expect(mockedEdit).toHaveBeenCalledTimes(3)

    expect(mockedEdit.mock.calls[0][0].modelTier).toBe('eco')
    expect(mockedEdit.mock.calls[0][0].instruction).toBe('Make the man taller')

    expect(mockedEdit.mock.calls[1][0].modelTier).toBe('eco')
    expect(mockedEdit.mock.calls[1][0].instruction).toContain(
      'Pre-visualization storyboard edit only'
    )

    expect(mockedEdit.mock.calls[2][0].modelTier).toBe('designer')
    expect(mockedEdit.mock.calls[2][0].instruction).toContain(
      'Pre-visualization storyboard edit only'
    )
  })

  it('throws ContentPolicyExhaustedError with a clear user message', async () => {
    mockedEdit.mockRejectedValue(SAFETY_ERROR)

    await expect(
      editImageWithVertexPolicyRetry({
        sourceImage: 'https://example.com/frame.png',
        instruction: 'Make the man taller',
        modelTier: 'eco',
      })
    ).rejects.toMatchObject({
      name: 'ContentPolicyExhaustedError',
      message: EDIT_POLICY_USER_MESSAGE,
    })

    expect(mockedEdit).toHaveBeenCalledTimes(3)
  })

  it('does not swallow non-policy errors', async () => {
    mockedEdit.mockRejectedValueOnce(new Error('network timeout'))

    await expect(
      editImageWithVertexPolicyRetry({
        sourceImage: 'https://example.com/frame.png',
        instruction: 'Make the man taller',
        modelTier: 'eco',
      })
    ).rejects.toThrow('network timeout')

    expect(mockedEdit).toHaveBeenCalledOnce()
  })
})

describe('Frame Edit policy wiring source guards', () => {
  it('routes studio edit through the policy retry helper', () => {
    const studio = readSource('src/lib/gemini/geminiStudioImageClient.ts')
    expect(studio).toContain('editImageWithVertexPolicyRetry')
    expect(studio).toContain('preVisEdit')
    expect(studio).toContain("from '@/lib/generation/editImageWithVertexPolicyRetry'")
    expect(studio).not.toContain('editVertexImage(')
  })

  it('maps exhausted IMAGE_SAFETY to a clear /api/image/edit error', () => {
    const route = readSource('src/app/api/image/edit/route.ts')
    expect(route).toContain('ContentPolicyExhaustedError')
    expect(route).toContain('EDIT_POLICY_USER_MESSAGE')
    expect(route).toContain('422')
  })
})
