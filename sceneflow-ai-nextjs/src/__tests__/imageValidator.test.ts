import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { LIKENESS_VISION_GEMINI_OPTIONS } from '@/lib/imagen/imageValidator'
import { LIKENESS_VALIDATION_MIN_RESERVE_MS } from '@/lib/scene/sceneImageTimeBudget'
import { DEFAULT_GEMINI_VISION_TIMEOUT_MS } from '@/lib/vertexai/gemini'
import { combineAbortSignals } from '@/lib/sceneGeneration/generateImage'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('likeness validation cannot stall Frame Agent', () => {
  it('caps blob fetches and the vision call, and does not retry timeouts', () => {
    expect(LIKENESS_VISION_GEMINI_OPTIONS.timeoutMs).toBe(LIKENESS_VALIDATION_MIN_RESERVE_MS)
    expect(LIKENESS_VISION_GEMINI_OPTIONS.maxRetries).toBe(0)
    expect(LIKENESS_VISION_GEMINI_OPTIONS.thinkingLevel).toBe('minimal')

    const src = readSource('src/lib/imagen/imageValidator.ts')
    expect(src).toContain('fetchReferenceImageAsBase64')
    expect(src).toContain('LIKENESS_VISION_GEMINI_OPTIONS')
  })

  it('gives generateWithVision the same default timeout as generateText', () => {
    expect(DEFAULT_GEMINI_VISION_TIMEOUT_MS).toBe(90_000)
    const src = readSource('src/lib/vertexai/gemini.ts')
    expect(src).toContain('timeoutMs: timeoutToUse')
    expect(src).toContain('DEFAULT_GEMINI_VISION_TIMEOUT_MS')
  })
})

describe('combineAbortSignals', () => {
  it('aborts when either the timeout or the parent run aborts', () => {
    const timeout = new AbortController()
    const parent = new AbortController()
    const combined = combineAbortSignals(timeout.signal, parent.signal)

    expect(combined.aborted).toBe(false)
    parent.abort()
    expect(combined.aborted).toBe(true)
  })
})
