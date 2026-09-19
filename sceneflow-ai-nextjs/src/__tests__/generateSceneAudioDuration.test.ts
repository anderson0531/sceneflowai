import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { SCENE_AUDIO_MAX_DURATION_SECONDS } from '@/lib/tts/googleTtsTimeBudget'

const ROOT = process.cwd()
const ROUTE = 'src/app/api/vision/generate-scene-audio/route.ts'
const VERCEL_JSON = 'vercel.json'

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

function maxDurationOf(relativePath: string): number {
  const match = readSource(relativePath).match(/export const maxDuration = (\d+)/)
  expect(match, `${relativePath} declares maxDuration`).toBeTruthy()
  return Number(match![1])
}

describe('generate-scene-audio Vercel duration', () => {
  it('exports maxDuration of 180 seconds', () => {
    expect(maxDurationOf(ROUTE)).toBe(180)
    expect(maxDurationOf(ROUTE)).toBe(SCENE_AUDIO_MAX_DURATION_SECONDS)
  })

  it('matches the vercel.json functions override', () => {
    const config = JSON.parse(readSource(VERCEL_JSON)) as {
      functions?: Record<string, { maxDuration?: number }>
    }
    expect(config.functions?.[ROUTE]?.maxDuration).toBe(SCENE_AUDIO_MAX_DURATION_SECONDS)
  })

  it('aborts Cloud TTS against remaining budget and falls back to Edge on timeout', () => {
    const route = readSource(ROUTE)
    expect(route).toContain('signal: controller.signal')
    expect(route).toContain('GoogleTtsTimeoutError')
    expect(route).toContain('shouldFallbackToEdgeTts')
    expect(route).toContain('edgeTtsTimeoutMs')
    expect(route).toContain('[Google TTS] synthesize')
  })
})
