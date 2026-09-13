import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { isPriorityPaygoEnabled, priorityPaygoHeaders } from '@/lib/vertexai/priorityPaygo'

describe('priorityPaygoHeaders', () => {
  afterEach(() => {
    delete process.env.VERTEX_PRIORITY_PAYGO
  })

  it('is off unless explicitly enabled, so dev and test stay on standard billing', () => {
    expect(isPriorityPaygoEnabled()).toBe(false)
    expect(priorityPaygoHeaders()).toEqual({})
  })

  it('stays off for any value other than "true"', () => {
    for (const value of ['false', '1', 'yes', 'TRUE', '']) {
      process.env.VERTEX_PRIORITY_PAYGO = value
      expect(isPriorityPaygoEnabled(), `"${value}" must not enable priority billing`).toBe(false)
    }
  })

  it('emits the shared priority headers when enabled', () => {
    process.env.VERTEX_PRIORITY_PAYGO = 'true'

    expect(priorityPaygoHeaders()).toEqual({
      'X-Vertex-AI-LLM-Request-Type': 'shared',
      'X-Vertex-AI-LLM-Shared-Request-Type': 'priority',
    })
  })
})

describe('priority paygo wiring', () => {
  const files = ['src/lib/vertexai/vertexImageClient.ts', 'src/lib/vertexai/gemini.ts']

  it('is spread into the headers of every Vertex generateContent call', () => {
    for (const file of files) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8')
      const fetchHeaderSites = source.match(/'?Authorization'?: `Bearer/g)?.length ?? 0
      const paygoSites = source.match(/priorityPaygoHeaders\(\)/g)?.length ?? 0

      expect(fetchHeaderSites, `${file} should have Vertex auth headers`).toBeGreaterThan(0)
      expect(paygoSites, `${file} must opt every request in`).toBe(fetchHeaderSites)
    }
  })

  it('is documented in env.example', () => {
    const env = readFileSync(path.join(process.cwd(), 'env.example'), 'utf8')

    expect(env).toContain('VERTEX_PRIORITY_PAYGO')
    expect(env).toContain('EXPRESS_IMAGE_MIN_SPACING_MS')
    expect(env).toContain('VERTEX_IMAGE_LOCATION')
  })
})
