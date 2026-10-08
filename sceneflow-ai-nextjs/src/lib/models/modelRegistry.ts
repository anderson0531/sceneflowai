/**
 * Checked-in inventory of API model pins the runtime can send.
 * Admin search reads this list. It does not scan the repo on Vercel.
 */

import {
  GEMINI_IMAGE_MODELS,
  GEMINI_PRODUCT_MODELS,
  GEMINI_TEXT_MODELS_PREVIOUS,
  IMAGEN_4_MODELS,
  IMAGEN_MODELS,
  VEO_MODELS,
} from '@/lib/config/modelConfig'
import { LYRIA_3_CLIP_MODEL, LYRIA_3_PRO_MODEL } from '@/lib/audio/lyriaClient'
import { DEFAULT_GEMINI_TTS_MODEL } from '@/lib/tts/blueprintTtsConstants'
import { DESIGNED_VOICE_TTS_MODEL } from '@/lib/tts/geminiVoiceDesign'
import { KLING_MODEL_CATALOG, type KlingModelId } from '@/lib/kling/types'
import {
  AGGREGATOR_MODEL_REGISTRY,
  RENDERFUL_REF_UPGRADE_ENTRIES,
} from '@/lib/aggregator/modelRegistry'
import { SCENEFLOW_VIDEO_KLING_MODEL } from '@/lib/video/videoGenerationPolicy'

export type ModelApi = 'vertex' | 'gemini_developer' | 'kling' | 'aggregator' | 'lyria'
export type ModelRole = 'live' | 'fallback' | 'retired'
export type ModelProvider = 'google' | 'kling' | 'aggregator'
export type ModelAnalysisMode = 'release' | 'catalog_only'

export interface ModelRegistryEntry {
  id: string
  /** Product job this pin serves. */
  function: string
  provider: ModelProvider
  api: ModelApi
  modelId: string
  role: ModelRole
  /** Source constant or catalog key. */
  symbol: string
  files: string[]
  tests: string[]
  envOverrides?: string[]
  notes?: string
  /** release compares live catalogs. catalog_only is listed and not upgraded from those lists. */
  analysis: ModelAnalysisMode
}

const TEXT_FILES = ['src/lib/config/modelConfig.ts', 'src/lib/vertexai/geminiTextFallback.ts']
const TEXT_TESTS = ['src/__tests__/modelConfig.test.ts', 'src/__tests__/geminiModelIds.test.ts']
const VIDEO_FILES = [
  'src/lib/config/modelConfig.ts',
  'src/lib/gemini/videoClient.ts',
  'src/lib/video/generateSegmentVideo.ts',
]
const VIDEO_TESTS = ['src/__tests__/modelConfig.test.ts', 'src/__tests__/omniVideoInteractions.test.ts']
const IMAGE_FILES = ['src/lib/config/modelConfig.ts']
const IMAGE_TESTS = ['src/__tests__/modelConfig.test.ts']

export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  {
    id: 'text-workhorse',
    function: 'Series, blueprint, script, and audience resonance',
    provider: 'google',
    api: 'vertex',
    modelId: GEMINI_PRODUCT_MODELS.workhorse,
    role: 'live',
    symbol: 'GEMINI_PRODUCT_MODELS.workhorse',
    files: [...TEXT_FILES, 'src/lib/config/__fixtures__/aiGatewayGeminiModelIds.json'],
    tests: TEXT_TESTS,
    envOverrides: ['GEMINI_MODEL', 'GEMINI_SCRIPT_MODEL'],
    notes: 'One-line workhorse bump upgrades every Flash surface that tracks this pin.',
    analysis: 'release',
  },
  {
    id: 'text-prior',
    function: 'Text quota fallback',
    provider: 'google',
    api: 'vertex',
    modelId: GEMINI_PRODUCT_MODELS.prior,
    role: 'fallback',
    symbol: 'GEMINI_PRODUCT_MODELS.prior',
    files: TEXT_FILES,
    tests: TEXT_TESTS,
    analysis: 'release',
  },
  {
    id: 'text-lite',
    function: 'Text lite tier and quota fallback',
    provider: 'google',
    api: 'vertex',
    modelId: GEMINI_PRODUCT_MODELS.lite,
    role: 'fallback',
    symbol: 'GEMINI_PRODUCT_MODELS.lite',
    files: TEXT_FILES,
    tests: TEXT_TESTS,
    analysis: 'release',
  },
  {
    id: 'text-pro',
    function: 'Revise scene and Gemini text default tier',
    provider: 'google',
    api: 'vertex',
    modelId: GEMINI_PRODUCT_MODELS.pro,
    role: 'live',
    symbol: 'GEMINI_PRODUCT_MODELS.pro',
    files: [...TEXT_FILES, 'src/app/api/vision/revise-scene/route.ts', 'src/lib/vertexai/gemini.ts'],
    tests: TEXT_TESTS,
    analysis: 'release',
  },
  {
    id: 'text-fallback-3-5-flash',
    function: 'Text quota fallback',
    provider: 'google',
    api: 'vertex',
    modelId: GEMINI_TEXT_MODELS_PREVIOUS['3.5-flash'],
    role: 'fallback',
    symbol: "GEMINI_TEXT_MODELS_PREVIOUS['3.5-flash']",
    files: TEXT_FILES,
    tests: TEXT_TESTS,
    analysis: 'release',
  },
  {
    id: 'text-fallback-2-5-flash',
    function: 'Text quota fallback',
    provider: 'google',
    api: 'vertex',
    modelId: GEMINI_TEXT_MODELS_PREVIOUS['2.5-flash'],
    role: 'fallback',
    symbol: "GEMINI_TEXT_MODELS_PREVIOUS['2.5-flash']",
    files: TEXT_FILES,
    tests: TEXT_TESTS,
    analysis: 'release',
  },
  {
    id: 'image-flash',
    function: 'Draft and eco stills',
    provider: 'google',
    api: 'vertex',
    modelId: GEMINI_IMAGE_MODELS.flash,
    role: 'live',
    symbol: 'GEMINI_IMAGE_MODELS.flash',
    files: IMAGE_FILES,
    tests: IMAGE_TESTS,
    analysis: 'release',
  },
  {
    id: 'image-pro',
    function: 'Designer stills and reference images',
    provider: 'google',
    api: 'vertex',
    modelId: GEMINI_IMAGE_MODELS.pro,
    role: 'live',
    symbol: 'GEMINI_IMAGE_MODELS.pro',
    files: [...IMAGE_FILES, 'src/lib/character/enhanceIdentityImage.ts'],
    tests: IMAGE_TESTS,
    analysis: 'release',
  },
  ...Object.entries(IMAGEN_MODELS).map(([tier, modelId]): ModelRegistryEntry => ({
    id: `image-retired-imagen-3-${tier}`,
    function: 'Retired Imagen 3 stills',
    provider: 'google',
    api: 'vertex',
    modelId,
    role: 'retired',
    symbol: `IMAGEN_MODELS.${tier}`,
    files: IMAGE_FILES,
    tests: IMAGE_TESTS,
    notes: 'Imagen endpoints were retired 2026-06-30. getImagenModel returns a Gemini image id.',
    analysis: 'release',
  })),
  ...Object.entries(IMAGEN_4_MODELS).map(([tier, modelId]): ModelRegistryEntry => ({
    id: `image-retired-imagen-4-${tier}`,
    function: 'Retired Imagen 4 stills',
    provider: 'google',
    api: 'vertex',
    modelId,
    role: 'retired',
    symbol: `IMAGEN_4_MODELS.${tier}`,
    files: IMAGE_FILES,
    tests: IMAGE_TESTS,
    notes: 'Imagen 4 endpoints were retired 2026-06-30.',
    analysis: 'release',
  })),
  {
    id: 'video-omni',
    function: 'Standard segment video (Vertex Interactions)',
    provider: 'google',
    api: 'vertex',
    modelId: VEO_MODELS.omni,
    role: 'live',
    symbol: 'VEO_MODELS.omni',
    files: [
      ...VIDEO_FILES,
      'src/lib/credits/quoteGenerationCredits.ts',
      'src/models/CreditPricing.ts',
      'src/lib/credits/costTracking.ts',
    ],
    tests: VIDEO_TESTS,
    notes:
      'Credit copies OMNI_MODEL_ID and CreditPricing use this same id. Calls go to Vertex locations/global/interactions when preferOmni is set.',
    analysis: 'release',
  },
  {
    id: 'video-lite',
    function: 'Veo lite video',
    provider: 'google',
    api: 'vertex',
    modelId: VEO_MODELS.lite,
    role: 'live',
    symbol: 'VEO_MODELS.lite',
    files: VIDEO_FILES,
    tests: ['src/__tests__/modelConfig.test.ts'],
    analysis: 'release',
  },
  {
    id: 'video-fast',
    function: 'Veo fast video',
    provider: 'google',
    api: 'vertex',
    modelId: VEO_MODELS.fast,
    role: 'live',
    symbol: 'VEO_MODELS.fast',
    files: VIDEO_FILES,
    tests: ['src/__tests__/modelConfig.test.ts'],
    analysis: 'release',
  },
  {
    id: 'video-premium',
    function: 'Veo premium video and reference images',
    provider: 'google',
    api: 'vertex',
    modelId: VEO_MODELS.premium,
    role: 'live',
    symbol: 'VEO_MODELS.premium',
    files: VIDEO_FILES,
    tests: ['src/__tests__/modelConfig.test.ts'],
    analysis: 'release',
  },
  {
    id: 'audio-lyria-clip',
    function: 'Scene music clip',
    provider: 'google',
    api: 'lyria',
    modelId: LYRIA_3_CLIP_MODEL,
    role: 'live',
    symbol: 'LYRIA_3_CLIP_MODEL',
    files: ['src/lib/audio/lyriaClient.ts'],
    tests: ['src/__tests__/lyriaClient.test.ts'],
    notes: 'Lyria calls Vertex Interactions. Release checks use the Vertex model list.',
    analysis: 'release',
  },
  {
    id: 'audio-lyria-pro',
    function: 'Scene music full track',
    provider: 'google',
    api: 'lyria',
    modelId: LYRIA_3_PRO_MODEL,
    role: 'live',
    symbol: 'LYRIA_3_PRO_MODEL',
    files: ['src/lib/audio/lyriaClient.ts'],
    tests: ['src/__tests__/lyriaClient.test.ts'],
    notes: 'Lyria calls Vertex Interactions. Release checks use the Vertex model list.',
    analysis: 'release',
  },
  {
    id: 'audio-tts',
    function: 'Blueprint narration',
    provider: 'google',
    api: 'gemini_developer',
    modelId: DEFAULT_GEMINI_TTS_MODEL,
    role: 'live',
    symbol: 'DEFAULT_GEMINI_TTS_MODEL',
    files: ['src/lib/tts/blueprintTtsConstants.ts', 'src/lib/tts/geminiFlashTts.ts'],
    tests: [],
    envOverrides: ['GEMINI_TTS_MODEL'],
    notes: 'Cloud Text-to-Speech. Not compared to Gemini or Vertex generative model lists.',
    analysis: 'catalog_only',
  },
  {
    id: 'audio-tts-voice-design',
    function: 'Character voice design',
    provider: 'google',
    api: 'vertex',
    modelId: DESIGNED_VOICE_TTS_MODEL,
    role: 'live',
    symbol: 'DESIGNED_VOICE_TTS_MODEL',
    files: ['src/lib/tts/geminiVoiceDesign.ts', 'src/lib/tts/geminiDesignedVoiceTts.ts'],
    tests: ['src/__tests__/geminiVoiceDesign.test.ts'],
    notes: 'Gemini 3.8 Flash TTS prompted voices. No prebuilt base voice.',
    analysis: 'catalog_only',
  },
  ...((Object.keys(KLING_MODEL_CATALOG) as KlingModelId[]).map((modelId): ModelRegistryEntry => ({
    id: `kling-${modelId}`,
    function: modelId === SCENEFLOW_VIDEO_KLING_MODEL ? 'Creative segment video' : 'Kling catalog',
    provider: 'kling',
    api: 'kling',
    modelId,
    role: modelId === SCENEFLOW_VIDEO_KLING_MODEL ? 'live' : 'fallback',
    symbol: modelId === SCENEFLOW_VIDEO_KLING_MODEL ? 'SCENEFLOW_VIDEO_KLING_MODEL' : `KLING_MODEL_CATALOG.${modelId}`,
    files: ['src/lib/kling/types.ts', 'src/lib/video/videoGenerationPolicy.ts'],
    tests: [],
    notes: `Official API model_name ${KLING_MODEL_CATALOG[modelId].apiModelName}. Catalog only in this pass.`,
    analysis: 'catalog_only',
  }))),
  ...[...AGGREGATOR_MODEL_REGISTRY, ...RENDERFUL_REF_UPGRADE_ENTRIES].map((entry): ModelRegistryEntry => ({
    id: `aggregator-${entry.id}`,
    function: `Aggregator ${entry.methods.join(', ')}`,
    provider: 'aggregator',
    api: 'aggregator',
    modelId: entry.vendorModelId,
    role: 'live',
    symbol: entry.id,
    files: ['src/lib/aggregator/modelRegistry.ts'],
    tests: [],
    notes: `SceneFlow id ${entry.id}. Vendor-routed. Catalog only in this pass.`,
    analysis: 'catalog_only',
  })),
]

export function listModelRegistry(): ModelRegistryEntry[] {
  return MODEL_REGISTRY
}

export function isPreviewModelId(modelId: string): boolean {
  return modelId.includes('-preview')
}
