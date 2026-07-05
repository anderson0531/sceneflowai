import type { AggregatorModelEntry } from './types'

/** SceneFlow-facing catalog — maps to vendor-specific model IDs per adapter. */
export const AGGREGATOR_MODEL_REGISTRY: AggregatorModelEntry[] = [
  {
    id: 'kling-2.6',
    label: 'Kling 2.6',
    vendorModelId: 'kling/kling-v2-6',
    // Renderful catalog uses hyphenated version ids (kling/kling-v2-6), not dotted (kling/kling-2.6).
    renderfulModel: 'kling/kling-v2-6',
    polloEndpoint: '/generation/kling/kling-v2-6',
    methods: ['T2V', 'I2V', 'REF'],
    costPerSecondUsd: 0.07,
    nativeAudio: true,
  },
  {
    id: 'kling-3.0',
    label: 'Kling 3.0',
    vendorModelId: 'kling/kling-v3-std',
    renderfulModel: 'kling/kling-v3-std',
    polloEndpoint: '/generation/kling/kling-v3',
    methods: ['T2V', 'I2V', 'REF'],
    costPerSecondUsd: 0.09,
    nativeAudio: true,
  },
  {
    id: 'seedance-2.0',
    label: 'Seedance 1.5 Pro',
    vendorModelId: 'seedance/seedance-1.5-pro',
    renderfulModel: 'seedance/seedance-1.5-pro',
    polloEndpoint: '/generation/seedance/seedance-2.0',
    methods: ['T2V', 'I2V'],
    costPerSecondUsd: 0.06,
    nativeAudio: true,
  },
  {
    id: 'runway-gen4',
    label: 'Runway Gen-3 Alpha Turbo',
    vendorModelId: 'runway/gen3-alpha-turbo',
    // Renderful exposes Runway as gen3-alpha-turbo; gen-4-turbo is rejected as "Unsupported model".
    renderfulModel: 'runway/gen3-alpha-turbo',
    polloEndpoint: '/generation/runway/runway-gen-4',
    methods: ['T2V', 'I2V'],
    costPerSecondUsd: 0.1,
    nativeAudio: false,
  },
  {
    id: 'wan-2.6',
    label: 'Wan 2.6',
    vendorModelId: 'wan/wan-2.6',
    renderfulModel: 'wan/wan-2.6',
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
