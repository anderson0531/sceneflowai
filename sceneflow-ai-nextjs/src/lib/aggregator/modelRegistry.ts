import type { AggregatorModelEntry } from './types'

/** SceneFlow-facing catalog — matched dynamically to Renderful slugs at runtime. */
export const AGGREGATOR_MODEL_REGISTRY: AggregatorModelEntry[] = [
  {
    id: 'kling-2.6',
    label: 'Kling 2.6',
    vendorModelId: 'kling-2.6',
    matchKeywords: ['kling', '2.6'],
    excludeKeywords: ['reference', 'o1', 'lipsync', 'motion', 'edit', '3.0', 'turbo'],
    supportedRenderfulTypes: ['text-to-video', 'image-to-video'],
    polloEndpoint: '/generation/kling/kling-v2-6',
    methods: ['T2V', 'I2V', 'REF'],
    costPerSecondUsd: 0.07,
    nativeAudio: true,
  },
  {
    id: 'kling-3.0',
    label: 'Kling 3.0',
    vendorModelId: 'kling-3.0',
    matchKeywords: ['kling', '3.0'],
    excludeKeywords: ['reference', 'o1', '2.6', '2.5', 'lipsync', 'motion', 'edit'],
    supportedRenderfulTypes: ['text-to-video', 'image-to-video'],
    polloEndpoint: '/generation/kling/kling-v3',
    methods: ['T2V', 'I2V', 'REF'],
    costPerSecondUsd: 0.09,
    nativeAudio: true,
  },
  {
    id: 'seedance-2.0',
    label: 'Seedance 1.5 Pro',
    vendorModelId: 'seedance-1.5-pro',
    matchKeywords: ['seedance', '1.5'],
    excludeKeywords: ['mini', 'fast', 'edit', 'extend', '2.0'],
    supportedRenderfulTypes: ['text-to-video', 'image-to-video'],
    polloEndpoint: '/generation/seedance/seedance-2.0',
    methods: ['T2V', 'I2V'],
    costPerSecondUsd: 0.06,
    nativeAudio: true,
  },
  {
    id: 'runway-gen4',
    label: 'Runway Gen-4 Turbo',
    vendorModelId: 'runway-gen4-turbo',
    matchKeywords: ['runway', 'gen4'],
    excludeKeywords: ['aleph', 'upscale', 'edit'],
    qualityTier: 'turbo',
    // Renderful lists Runway as image-to-video only (Gen4 Turbo I2V).
    supportedRenderfulTypes: ['image-to-video'],
    polloEndpoint: '/generation/runway/runway-gen-4',
    methods: ['T2V', 'I2V'],
    costPerSecondUsd: 0.1,
    nativeAudio: false,
  },
  {
    id: 'wan-2.6',
    label: 'Wan 2.6',
    vendorModelId: 'wan-2.6',
    matchKeywords: ['wan', '2.6'],
    excludeKeywords: ['2.7', '2.5', '2.2', '2.1', 'reference', 'edit', 'animate'],
    supportedRenderfulTypes: ['text-to-video', 'image-to-video'],
    polloEndpoint: '/generation/wan/wan-2.6',
    methods: ['T2V', 'I2V'],
    costPerSecondUsd: 0.05,
    nativeAudio: false,
  },
]

export function getAggregatorModel(modelId: string): AggregatorModelEntry | undefined {
  return AGGREGATOR_MODEL_REGISTRY.find((m) => m.id === modelId)
}

export function getDefaultAggregatorModelId(): string {
  return process.env.VIDEO_AGGREGATOR_DEFAULT_MODEL?.trim() || 'kling-2.6'
}

export function listAggregatorModelsForMethod(
  method: string
): AggregatorModelEntry[] {
  return AGGREGATOR_MODEL_REGISTRY.filter((m) => m.methods.includes(method as never))
}

export function getAggregatorCreditsForModel(
  modelId: string,
  durationSeconds: number
): number {
  const model = getAggregatorModel(modelId) || getAggregatorModel(getDefaultAggregatorModelId())
  const costPerSec = model?.costPerSecondUsd ?? 0.08
  const baseUsd = costPerSec * Math.max(4, durationSeconds)
  // ~100 credits per $0.01 at platform margin
  return Math.max(120, Math.round(baseUsd * 100 * 10))
}
