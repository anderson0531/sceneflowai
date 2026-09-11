import { describe, expect, it, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  getExpressAnimaticImageModel,
  usesFlashDraftTier,
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
    expect(usesFlashDraftTier({ isBeatFrame: true, resolvedModelTier: 'eco' })).toBe(false)
  })
})

describe('usesFlashDraftTier', () => {
  it('reads the resolved tier, so every caller asking for a draft beat gets flash', () => {
    delete process.env.EXPRESS_ANIMATIC_IMAGE_MODEL
    // This is the whole point: the prompt builder and the per-beat regen send
    // modelTier eco and no animaticDraft, and used to be forced onto pro.
    expect(usesFlashDraftTier({ isBeatFrame: true, resolvedModelTier: 'eco' })).toBe(true)
  })

  it('keeps final beats on pro', () => {
    delete process.env.EXPRESS_ANIMATIC_IMAGE_MODEL
    expect(usesFlashDraftTier({ isBeatFrame: true, resolvedModelTier: 'designer' })).toBe(false)
    expect(usesFlashDraftTier({ isBeatFrame: true, resolvedModelTier: 'director' })).toBe(false)
    expect(usesFlashDraftTier({ isBeatFrame: true })).toBe(false)
  })

  it('leaves establishing and dialogue frames alone', () => {
    delete process.env.EXPRESS_ANIMATIC_IMAGE_MODEL
    expect(usesFlashDraftTier({ isBeatFrame: false, resolvedModelTier: 'eco' })).toBe(false)
    expect(usesFlashDraftTier({ isBeatFrame: false, animaticDraft: true })).toBe(false)
  })

  it('still honours animaticDraft, so an in-flight Express run keeps its tier across a deploy', () => {
    delete process.env.EXPRESS_ANIMATIC_IMAGE_MODEL
    expect(usesFlashDraftTier({ isBeatFrame: true, animaticDraft: true })).toBe(true)
    expect(
      usesFlashDraftTier({
        isBeatFrame: true,
        resolvedModelTier: 'designer',
        animaticDraft: true,
      })
    ).toBe(true)
  })
})

describe('animatic concurrency', () => {
  it('runs three draft frames at once and keeps pro sequential', () => {
    // Iterating on an animatic is repeated frame regeneration, so this number
    // is what sets how long that loop takes.
    expect(DEFAULT_EXPRESS_FLASH_IMAGE_CONCURRENCY).toBe(3)
    expect(DEFAULT_SCENE_EXPRESS_FLASH_BEAT_CONCURRENCY).toBe(3)
    expect(DEFAULT_EXPRESS_IMAGE_CONCURRENCY).toBe(1)
    expect(DEFAULT_SCENE_EXPRESS_BEAT_CONCURRENCY).toBe(1)
  })

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

  it('keeps the beat pool from queueing behind the image lane', () => {
    // A beat pool wider than the traffic cop's lane just parks jobs in the cop.
    expect(DEFAULT_SCENE_EXPRESS_FLASH_BEAT_CONCURRENCY).toBe(
      DEFAULT_EXPRESS_FLASH_IMAGE_CONCURRENCY
    )
  })

  it('lets an explicit env override win over both defaults', () => {
    process.env.EXPRESS_IMAGE_CONCURRENCY = '6'
    expect(getExpressImageConcurrency({ flashAnimatic: true })).toBe(6)
    expect(getExpressImageConcurrency({ flashAnimatic: false })).toBe(6)
  })
})

describe('draft tier wiring', () => {
  const routeSource = readFileSync(
    join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
    'utf8'
  )

  it('decides the tier from the resolved tier, not from an Express-only flag', () => {
    expect(routeSource).toContain(
      `const useFlashDraftTier = usesFlashDraftTier({
      isBeatFrame,
      resolvedModelTier,
      animaticDraft,
    })`
    )
    expect(routeSource).toContain(
      'const forceDesignerImagePath = forceVertexGeminiImagePath && !useFlashDraftTier'
    )
    expect(routeSource).toContain('allowEcoWithReferences: useFlashDraftTier')
  })

  it('does not reintroduce the flag-only check', () => {
    expect(routeSource).not.toContain('usesFlashAnimaticTier')
    expect(routeSource).not.toContain('!useAnimaticFlashTier')
  })

  it('still routes every beat frame through Vertex Gemini', () => {
    expect(routeSource).toContain(
      'const forceVertexGeminiImagePath = isBeatFrame || skipLikenessValidation'
    )
    expect(routeSource).toContain('forceVertexGeminiImagePath ||\n      imageReferences.length > 0')
  })
})
