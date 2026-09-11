import { describe, expect, it, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  getExpressAnimaticImageModel,
  usesFlashAnimaticTier,
} from '@/lib/sceneGeneration/animaticImageModel'
import {
  DEFAULT_EXPRESS_FLASH_IMAGE_CONCURRENCY,
  DEFAULT_EXPRESS_IMAGE_CONCURRENCY,
  getExpressImageConcurrency,
} from '@/lib/sceneGeneration/expressTrafficCop'
import {
  DEFAULT_SCENE_EXPRESS_BEAT_CONCURRENCY,
  DEFAULT_SCENE_EXPRESS_FLASH_BEAT_CONCURRENCY,
  getSceneExpressBeatConcurrency,
} from '@/lib/sceneGeneration/adaptiveBeatScheduler'

const previousModel = process.env.EXPRESS_ANIMATIC_IMAGE_MODEL
const previousImage = process.env.EXPRESS_IMAGE_CONCURRENCY
const previousBeat = process.env.SCENE_EXPRESS_BEAT_CONCURRENCY
const previousFlash = process.env.VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

afterEach(() => {
  restore('EXPRESS_ANIMATIC_IMAGE_MODEL', previousModel)
  restore('EXPRESS_IMAGE_CONCURRENCY', previousImage)
  restore('SCENE_EXPRESS_BEAT_CONCURRENCY', previousBeat)
  restore('VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY', previousFlash)
})

describe('getExpressAnimaticImageModel', () => {
  it('defaults draft beats to flash', () => {
    delete process.env.EXPRESS_ANIMATIC_IMAGE_MODEL
    expect(getExpressAnimaticImageModel()).toBe('flash')
  })

  it('reverts to pro without a redeploy', () => {
    process.env.EXPRESS_ANIMATIC_IMAGE_MODEL = 'PRO'
    expect(getExpressAnimaticImageModel()).toBe('pro')
    expect(usesFlashAnimaticTier({ isBeatFrame: true, animaticDraft: true })).toBe(false)
  })
})

describe('usesFlashAnimaticTier', () => {
  it('only applies to beat frames that opted in', () => {
    delete process.env.EXPRESS_ANIMATIC_IMAGE_MODEL
    expect(usesFlashAnimaticTier({ isBeatFrame: true, animaticDraft: true })).toBe(true)
    // The prompt builder and final beats never send animaticDraft.
    expect(usesFlashAnimaticTier({ isBeatFrame: true, animaticDraft: false })).toBe(false)
    expect(usesFlashAnimaticTier({ isBeatFrame: true })).toBe(false)
    // Establishing and dialogue frames stay on pro even if the flag leaks in.
    expect(usesFlashAnimaticTier({ isBeatFrame: false, animaticDraft: true })).toBe(false)
  })
})

describe('animatic concurrency', () => {
  it('widens the image lane for flash and leaves pro sequential', () => {
    delete process.env.EXPRESS_IMAGE_CONCURRENCY
    expect(getExpressImageConcurrency()).toBe(DEFAULT_EXPRESS_IMAGE_CONCURRENCY)
    expect(getExpressImageConcurrency({ flashAnimatic: false })).toBe(1)
    expect(getExpressImageConcurrency({ flashAnimatic: true })).toBe(
      DEFAULT_EXPRESS_FLASH_IMAGE_CONCURRENCY
    )
  })

  it('widens the beat pool for flash and leaves pro sequential', () => {
    delete process.env.SCENE_EXPRESS_BEAT_CONCURRENCY
    delete process.env.VERTEX_GEMINI_FLASH_IMAGE_CONCURRENCY
    delete process.env.EXPRESS_IMAGE_CONCURRENCY
    expect(getSceneExpressBeatConcurrency()).toBe(DEFAULT_SCENE_EXPRESS_BEAT_CONCURRENCY)
    expect(getSceneExpressBeatConcurrency({ flashAnimatic: true })).toBe(
      DEFAULT_SCENE_EXPRESS_FLASH_BEAT_CONCURRENCY
    )
  })

  it('lets an explicit env override win over both defaults', () => {
    process.env.EXPRESS_IMAGE_CONCURRENCY = '6'
    expect(getExpressImageConcurrency({ flashAnimatic: true })).toBe(6)
    expect(getExpressImageConcurrency({ flashAnimatic: false })).toBe(6)
  })
})

describe('animatic tier wiring', () => {
  const routeSource = readFileSync(
    join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
    'utf8'
  )

  it('exempts animatic beats from the forced designer path without changing Vertex routing', () => {
    expect(routeSource).toContain(
      'const useAnimaticFlashTier = usesFlashAnimaticTier({ isBeatFrame, animaticDraft })'
    )
    expect(routeSource).toContain(
      'const forceVertexGeminiImagePath = isBeatFrame || skipLikenessValidation'
    )
    expect(routeSource).toContain(
      'const forceDesignerImagePath = forceVertexGeminiImagePath && !useAnimaticFlashTier'
    )
    expect(routeSource).toContain('allowEcoWithReferences: useAnimaticFlashTier')
  })

  it('still routes every beat frame through Vertex Gemini', () => {
    expect(routeSource).toContain('forceVertexGeminiImagePath ||\n      imageReferences.length > 0')
  })
})
