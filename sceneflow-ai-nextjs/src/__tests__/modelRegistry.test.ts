import { describe, expect, it } from 'vitest'
import {
  GEMINI_IMAGE_MODELS,
  GEMINI_PRODUCT_MODELS,
  VEO_MODELS,
} from '@/lib/config/modelConfig'
import { LYRIA_3_CLIP_MODEL, LYRIA_3_PRO_MODEL } from '@/lib/audio/lyriaClient'
import { DEFAULT_GEMINI_TTS_MODEL } from '@/lib/tts/blueprintTtsConstants'
import { MODEL_REGISTRY } from '@/lib/models/modelRegistry'

function row(symbol: string) {
  return MODEL_REGISTRY.filter((entry) => entry.symbol === symbol)
}

describe('model registry', () => {
  it('lists each Veo, Gemini product, Gemini image, Lyria, and TTS pin once', () => {
    expect(row('VEO_MODELS.omni').map((entry) => entry.modelId)).toEqual([VEO_MODELS.omni])
    expect(row('VEO_MODELS.lite').map((entry) => entry.modelId)).toEqual([VEO_MODELS.lite])
    expect(row('VEO_MODELS.fast').map((entry) => entry.modelId)).toEqual([VEO_MODELS.fast])
    expect(row('VEO_MODELS.premium').map((entry) => entry.modelId)).toEqual([VEO_MODELS.premium])

    expect(row('GEMINI_PRODUCT_MODELS.workhorse').map((entry) => entry.modelId)).toEqual([
      GEMINI_PRODUCT_MODELS.workhorse,
    ])
    expect(row('GEMINI_PRODUCT_MODELS.prior').map((entry) => entry.modelId)).toEqual([
      GEMINI_PRODUCT_MODELS.prior,
    ])
    expect(row('GEMINI_PRODUCT_MODELS.lite').map((entry) => entry.modelId)).toEqual([
      GEMINI_PRODUCT_MODELS.lite,
    ])
    expect(row('GEMINI_PRODUCT_MODELS.pro').map((entry) => entry.modelId)).toEqual([
      GEMINI_PRODUCT_MODELS.pro,
    ])

    expect(row('GEMINI_IMAGE_MODELS.flash').map((entry) => entry.modelId)).toEqual([
      GEMINI_IMAGE_MODELS.flash,
    ])
    expect(row('GEMINI_IMAGE_MODELS.pro').map((entry) => entry.modelId)).toEqual([
      GEMINI_IMAGE_MODELS.pro,
    ])

    expect(row('LYRIA_3_CLIP_MODEL').map((entry) => entry.modelId)).toEqual([LYRIA_3_CLIP_MODEL])
    expect(row('LYRIA_3_PRO_MODEL').map((entry) => entry.modelId)).toEqual([LYRIA_3_PRO_MODEL])
    expect(row('DEFAULT_GEMINI_TTS_MODEL').map((entry) => entry.modelId)).toEqual([
      DEFAULT_GEMINI_TTS_MODEL,
    ])
  })

  it('keeps those pins on live or fallback roles', () => {
    const symbols = [
      'VEO_MODELS.omni',
      'VEO_MODELS.lite',
      'VEO_MODELS.fast',
      'VEO_MODELS.premium',
      'GEMINI_PRODUCT_MODELS.workhorse',
      'GEMINI_PRODUCT_MODELS.prior',
      'GEMINI_PRODUCT_MODELS.lite',
      'GEMINI_PRODUCT_MODELS.pro',
      'GEMINI_IMAGE_MODELS.flash',
      'GEMINI_IMAGE_MODELS.pro',
      'LYRIA_3_CLIP_MODEL',
      'LYRIA_3_PRO_MODEL',
      'DEFAULT_GEMINI_TTS_MODEL',
    ]
    for (const symbol of symbols) {
      expect(['live', 'fallback']).toContain(row(symbol)[0]?.role)
    }
  })

  it('marks Imagen constants retired and notes the Omni credit copies', () => {
    const retired = MODEL_REGISTRY.filter((entry) => entry.role === 'retired')
    expect(retired.some((entry) => entry.symbol === 'IMAGEN_MODELS.fast')).toBe(true)
    expect(retired.some((entry) => entry.symbol === 'IMAGEN_4_MODELS.ultra')).toBe(true)
    expect(row('VEO_MODELS.omni')[0]?.notes).toContain('OMNI_MODEL_ID')
    expect(row('VEO_MODELS.omni')[0]?.modelId).toBe('gemini-omni-1.1-flash-preview')
  })
})
