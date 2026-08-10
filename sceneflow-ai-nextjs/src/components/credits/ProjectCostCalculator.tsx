'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calculator, 
  Film, 
  Image as ImageIcon, 
  Mic, 
  Video, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
  ArrowRight,
  Check,
  X,
  HardDrive,
  Layers,
  Music,
  Play,
  RefreshCw,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Info,
  Globe,
  MonitorPlay,
  ShoppingCart,
  Plus,
  Key,
  Brain
} from 'lucide-react'
import {
  CREDIT_EXCHANGE_RATE,
  SUBSCRIPTION_TIERS,
  TOPUP_PACKS,
  ANIMATIC_CREDITS,
  STORAGE_ADDONS,
  IMAGE_CREDITS,
  type ProductionType,
} from '@/lib/credits/creditCosts'
import {
  FullProjectParameters,
  DEFAULT_PROJECT_PARAMS,
  calculateDetailedProjectCost,
  compareStrategies,
  estimateShortFilm,
  estimateCommercial,
  estimateMusicVideo,
  type StrategyComparison,
  type SubscriptionTierName,
} from '@/lib/credits/projectCalculator'
import {
  SCENEFLOW_ENGINE_ID,
  SCENEFLOW_QUALITY_TIERS,
  ALTERNATIVE_ENGINES,
  estimateVideoClipCredits,
  normalizeVideoParameters,
  snapSegmentDurationForEngine,
  toEngineSelection,
  buildCreditsBudgetParams,
  type VideoEngineId,
  type SceneFlowQualityTierId,
} from '@/lib/credits/videoEnginePricing'

// =============================================================================
// TYPES
// =============================================================================

interface ProjectCostCalculatorProps {
  currentTier?: SubscriptionTierName
  currentBalance?: number
  onUpgrade?: (tier: SubscriptionTierName) => void
  onTopUp?: (pack: keyof typeof TOPUP_PACKS) => void
  compact?: boolean
  projectId?: string
  currentCreditsUsed?: number
  onSetBudget?: (credits: number, budgetParams?: Record<string, unknown>) => void | Promise<void>
  onSetCreditsUsed?: (credits: number) => void | Promise<void>
  initialParams?: Partial<FullProjectParameters>
  /** Prefill BYOK exclude-media from project keys / saved budget params */
  initialByokExcludeMedia?: boolean
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatCredits(credits: number): string {
  return credits.toLocaleString()
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

// =============================================================================
// PRESET TEMPLATES
// =============================================================================

const PROJECT_PRESETS = [
  { name: 'Quick Demo', icon: Sparkles, scenes: 5, minutes: 2 },
  { name: 'Short Film', icon: Film, scenes: 20, minutes: 8 },
  { name: 'Commercial', icon: Play, scenes: 10, minutes: 1 },
  { name: 'Music Video', icon: Music, scenes: 30, minutes: 4 },
  { name: 'Feature Film', icon: Layers, scenes: 100, minutes: 45 },
]

const PRESET_NAME_TO_KEY: Record<string, 'presets.quickDemo' | 'presets.shortFilm' | 'presets.commercial' | 'presets.musicVideo' | 'presets.featureFilm'> = {
  'Quick Demo': 'presets.quickDemo',
  'Short Film': 'presets.shortFilm',
  'Commercial': 'presets.commercial',
  'Music Video': 'presets.musicVideo',
  'Feature Film': 'presets.featureFilm',
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProjectCostCalculator({
  currentTier = 'starter',
  currentBalance = 0,
  onUpgrade,
  onTopUp,
  compact = false,
  projectId,
  currentCreditsUsed = 0,
  onSetBudget,
  onSetCreditsUsed,
  initialParams,
  initialByokExcludeMedia = false,
}: ProjectCostCalculatorProps) {
  const t = useTranslations('production.budget')

  const presetLabel = useCallback((name: string) => {
    const key = PRESET_NAME_TO_KEY[name]
    return key ? t(key) : name
  }, [t])

  const [params, setParams] = useState<FullProjectParameters>(() => {
    if (!initialParams) return DEFAULT_PROJECT_PARAMS;
    
    // Deep merge with defaults first to ensure all properties exist
    // Use || {} to handle undefined/null categories from initialParams
    return {
      scenes: { 
        ...DEFAULT_PROJECT_PARAMS.scenes, 
        ...(initialParams.scenes || {}) 
      },
      video: { 
        ...DEFAULT_PROJECT_PARAMS.video, 
        ...(initialParams.video || {}) 
      },
      images: { 
        ...DEFAULT_PROJECT_PARAMS.images, 
        ...(initialParams.images || {}) 
      },
      intelligence: {
        ...DEFAULT_PROJECT_PARAMS.intelligence,
        ...(initialParams.intelligence || {}),
      },
      audio: { 
        ...DEFAULT_PROJECT_PARAMS.audio, 
        ...(initialParams.audio || {}) 
      },
      voice: { 
        ...DEFAULT_PROJECT_PARAMS.voice, 
        ...(initialParams.voice || {}) 
      },
      storage: { 
        ...DEFAULT_PROJECT_PARAMS.storage, 
        ...(initialParams.storage || {}) 
      },
      upscale: { 
        ...DEFAULT_PROJECT_PARAMS.upscale, 
        ...(initialParams.upscale || {}) 
      },
    };
  })
  const [byokExcludeMedia, setByokExcludeMedia] = useState(Boolean(initialByokExcludeMedia))
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showAlternativeEngines, setShowAlternativeEngines] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  
  // Production type: full_video (with AI video) or animatic (frames + audio only)
  const [productionType, setProductionType] = useState<ProductionType>('full_video')
  
  // Language versions for multi-language releases
  const [languageVersions, setLanguageVersions] = useState(1)
  const [manualCreditsUsedInput, setManualCreditsUsedInput] = useState(String(currentCreditsUsed))
  const [isSavingCreditsUsed, setIsSavingCreditsUsed] = useState(false)

  useEffect(() => {
    setManualCreditsUsedInput(String(currentCreditsUsed))
  }, [currentCreditsUsed])

  // Update a specific parameter
  const updateParam = useCallback(<K extends keyof FullProjectParameters>(
    category: K,
    key: keyof FullProjectParameters[K],
    value: FullProjectParameters[K][typeof key]
  ) => {
    setParams(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
    setActivePreset(null)
  }, [])

  const selectSceneFlowTier = useCallback((qualityTier: SceneFlowQualityTierId) => {
    setParams((prev) => ({
      ...prev,
      video: {
        ...prev.video,
        engine: SCENEFLOW_ENGINE_ID,
        qualityTier,
        model: undefined,
      },
    }))
    setActivePreset(null)
  }, [])

  const selectAlternativeEngine = useCallback((engine: VideoEngineId) => {
    setParams((prev) => {
      const selection = toEngineSelection(engine)
      const snappedDuration = snapSegmentDurationForEngine(
        prev.video.segmentDuration ?? 8,
        selection
      )
      return {
        ...prev,
        video: {
          ...prev.video,
          engine,
          qualityTier: undefined,
          segmentDuration: snappedDuration,
          model: undefined,
        },
      }
    })
    setActivePreset(null)
  }, [])

  const updateSegmentDuration = useCallback((duration: number) => {
    setParams((prev) => {
      const engine = prev.video.engine ?? SCENEFLOW_ENGINE_ID
      const selection = toEngineSelection(engine, prev.video.qualityTier)
      const snappedDuration = snapSegmentDurationForEngine(duration, selection)
      return {
        ...prev,
        video: {
          ...prev.video,
          segmentDuration: snappedDuration,
        },
      }
    })
    setActivePreset(null)
  }, [])

  const normalizedVideo = useMemo(
    () => normalizeVideoParameters(params.video),
    [params.video]
  )

  const clipEstimate = useMemo(
    () => estimateVideoClipCredits(normalizedVideo),
    [normalizedVideo]
  )

  const totalClipCount = useMemo(() => {
    const segments = params.scenes.count * params.scenes.segmentsPerScene
    return segments * params.scenes.takesPerSegment
  }, [params.scenes])

  // Apply preset
  const applyPreset = useCallback((preset: typeof PROJECT_PRESETS[0]) => {
    const segmentsPerScene = Math.ceil((preset.minutes * 60 / preset.scenes) / 8)
    setParams(prev => ({
      ...prev,
      scenes: {
        count: preset.scenes,
        segmentsPerScene: Math.max(1, segmentsPerScene),
        takesPerSegment: 2,
      },
      video: {
        ...prev.video,
        totalMinutes: preset.minutes,
      },
      images: {
        ...prev.images,
        keyFrames: preset.scenes * 3,
      },
      audio: {
        ...prev.audio,
        totalMinutes: preset.minutes,
        dialogueLines: preset.scenes * 5,
      },
      voice: {
        ...prev.voice,
        voiceMinutes: preset.minutes,
      },
      storage: {
        ...prev.storage,
        expectedStorageGB: Math.ceil(preset.scenes * 0.5),
      },
    }))
    setActivePreset(preset.name)
  }, [])

  // Calculate costs and strategies with adjustments for production type & languages
  const comparison = useMemo(() => {
    // For animatic mode, zero out video costs
    const adjustedParams = productionType === 'animatic'
      ? {
          ...params,
          video: { ...params.video, engine: SCENEFLOW_ENGINE_ID as const },
        }
      : params;
    
    const baseComparison = compareStrategies(adjustedParams, { byokExcludeMedia });
    
    // If animatic mode, zero out video and add MP4 render costs
    if (productionType === 'animatic') {
      const mp4RenderCredits = Math.ceil(params.video.totalMinutes) * ANIMATIC_CREDITS.MP4_RENDER_PER_MINUTE;
      
      // Adjust breakdown
      baseComparison.projectCost.video = {
        credits: byokExcludeMedia ? 0 : mp4RenderCredits,
        usdCost: (byokExcludeMedia ? 0 : mp4RenderCredits) / CREDIT_EXCHANGE_RATE,
        excluded: byokExcludeMedia,
        preExclusionCredits: mp4RenderCredits,
        items: [{
          name: t('mp4RenderAnimatic'),
          quantity: Math.ceil(params.video.totalMinutes),
          creditsEach: ANIMATIC_CREDITS.MP4_RENDER_PER_MINUTE,
          totalCredits: mp4RenderCredits,
        }],
      };
      
      // Recalculate total
      const newTotal = 
        (baseComparison.projectCost.intelligence?.credits || 0) +
        baseComparison.projectCost.video.credits +
        baseComparison.projectCost.images.credits +
        baseComparison.projectCost.audio.credits +
        baseComparison.projectCost.voiceClones.credits +
        baseComparison.projectCost.storage.credits +
        baseComparison.projectCost.upscale.credits;
      
      baseComparison.projectCost.total.credits = newTotal;
      baseComparison.projectCost.total.usdCost = newTotal / CREDIT_EXCHANGE_RATE;
    }
    
    // Add language version costs
    if (languageVersions > 1) {
      const extraLanguages = languageVersions - 1;
      const baseVoiceCredits = baseComparison.projectCost.audio.credits;
      const translationChars = params.audio.dialogueLines * 80 * extraLanguages; // ~80 chars per line
      
      const languageCredits = 
        (extraLanguages * ANIMATIC_CREDITS.LANGUAGE_VERSION_BASE) + // Base cost per language
        (Math.ceil(translationChars / 1000) * ANIMATIC_CREDITS.TRANSLATION_PER_1K_CHARS) + // Translation
        (baseVoiceCredits * extraLanguages * 0.8); // Re-voicing (80% of original audio cost)
      
      baseComparison.projectCost.total.credits += languageCredits;
      baseComparison.projectCost.total.usdCost = baseComparison.projectCost.total.credits / CREDIT_EXCHANGE_RATE;
    }
    
    return baseComparison;
  }, [params, productionType, languageVersions, byokExcludeMedia, t])
  const breakdown = comparison.projectCost

  // Calculate additional language credits separately for display
  const languageCreditsCost = useMemo(() => {
    if (languageVersions <= 1) return 0;
    const extraLanguages = languageVersions - 1;
    const baseVoiceCredits = comparison.projectCost.audio.credits;
    const translationChars = params.audio.dialogueLines * 80 * extraLanguages;
    
    return (extraLanguages * ANIMATIC_CREDITS.LANGUAGE_VERSION_BASE) +
      (Math.ceil(translationChars / 1000) * ANIMATIC_CREDITS.TRANSLATION_PER_1K_CHARS) +
      (baseVoiceCredits * extraLanguages * 0.8);
  }, [languageVersions, comparison.projectCost.audio.credits, params.audio.dialogueLines])

  // Find recommended strategy
  const recommended = comparison.subscriptions.find(s => s.recommended)
  const creditsNeeded = breakdown.total.credits - currentBalance
  const hasDeficit = creditsNeeded > 0

  // Compact mode for landing page
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/80 backdrop-blur rounded-xl border border-slate-700/50 p-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">{t('quickEstimate')}</h3>
        </div>
        
        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PROJECT_PRESETS.slice(0, 3).map(preset => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePreset === preset.name
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              {presetLabel(preset.name)}
            </button>
          ))}
        </div>

        {/* Quick result */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-white">
              {t('creditsCount', { count: formatCredits(breakdown.total.credits) })}
            </div>
            <div className="text-sm text-gray-400">
              {t('approxValue', { value: formatCurrency(breakdown.total.usdCost) })}
            </div>
          </div>
          {recommended && (
            <div className="text-right">
              <div className="text-sm text-cyan-400 font-medium">{recommended.tierName}</div>
              <div className="text-xs text-gray-500">{formatCurrency(recommended.totalMonthlyCost)}{t('perMonth')}</div>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('title')}</h2>
            <p className="text-sm text-gray-400">
              {t('subtitle')}
            </p>
          </div>
        </div>
        {currentBalance > 0 && (
          <div className="text-right">
            <div className="text-sm text-gray-400">{t('currentBalance')}</div>
            <div className="text-lg font-bold text-cyan-400">{t('creditsCount', { count: formatCredits(currentBalance) })}</div>
          </div>
        )}
      </div>

      {/* Preset Quick Select */}
      <div className="px-6 py-4 border-b border-slate-700/30 bg-slate-800/30">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400 mr-2">{t('quickStart')}</span>
          {PROJECT_PRESETS.map(preset => {
            const Icon = preset.icon
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePreset === preset.name
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {presetLabel(preset.name)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 p-6">
        {/* Left Column - Inputs */}
        <div className="space-y-6">
          {/* BYOK */}
          <div className={`p-4 rounded-xl border transition-all ${
            byokExcludeMedia
              ? 'bg-amber-500/10 border-amber-500/40'
              : 'bg-slate-800/50 border-slate-700/50'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={byokExcludeMedia}
                onChange={(e) => setByokExcludeMedia(e.target.checked)}
                className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Key className="w-4 h-4 text-amber-400" />
                  {t('byokTitle')}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {t('byokDescription')}
                </p>
              </div>
            </label>
          </div>

          {/* Production Type Toggle */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <MonitorPlay className="w-4 h-4" /> {t('productionType')}
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProductionType('full_video')}
                className={`p-4 rounded-xl border transition-all ${
                  productionType === 'full_video'
                    ? 'bg-cyan-500/20 border-cyan-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Video className="w-4 h-4" />
                  <span className="font-medium">{t('fullVideo')}</span>
                </div>
                <div className="text-xs text-gray-400">{t('fullVideoHint')}</div>
              </button>
              
              <button
                onClick={() => setProductionType('animatic')}
                className={`p-4 rounded-xl border transition-all ${
                  productionType === 'animatic'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="font-medium">{t('animatic')}</span>
                </div>
                <div className="text-xs text-gray-400">{t('animaticHint')}</div>
              </button>
            </div>
            
            {productionType === 'animatic' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-300">
                <strong>{t('animaticModeTitle')}</strong> {t('animaticModeBody')}
              </div>
            )}
          </div>

          {/* Language Versions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Globe className="w-4 h-4" /> {t('languageVersions')}
            </h3>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">{t('numberOfLanguages')}</label>
                <span className="text-sm font-medium text-white">{languageVersions}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={languageVersions}
                onChange={(e) => setLanguageVersions(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{t('oneOriginal')}</span>
                <span>{t('tenLanguages')}</span>
              </div>
            </div>
            
            {languageVersions > 1 && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                {t('languagesBanner', {
                  count: languageVersions,
                  extra: languageVersions - 1,
                  credits: formatCredits(Math.round(languageCreditsCost)),
                })}
              </div>
            )}
          </div>

          {/* Scene Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Film className="w-4 h-4" /> {t('sceneConfiguration')}
            </h3>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">{t('numberOfScenes')}</label>
                <span className="text-sm font-medium text-white">{params.scenes.count}</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={params.scenes.count}
                onChange={(e) => updateParam('scenes', 'count', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">{t('beatsPerScene')}</label>
                <span className="text-sm font-medium text-white">{params.scenes.segmentsPerScene}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={params.scenes.segmentsPerScene}
                onChange={(e) => updateParam('scenes', 'segmentsPerScene', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">{t('takesPerBeat')}</label>
                <span className="text-sm font-medium text-white">{params.scenes.takesPerSegment}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={params.scenes.takesPerSegment}
                onChange={(e) => updateParam('scenes', 'takesPerSegment', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* Engine & Quality */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Video className="w-4 h-4" /> {t('engineAndQuality')}
            </h3>

            <div className="space-y-2">
              <p className="text-xs text-gray-500">{t('sceneflowDefaultEngine')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SCENEFLOW_QUALITY_TIERS.map((tier) => {
                  const tierEstimate = estimateVideoClipCredits(
                    normalizeVideoParameters({
                      ...params.video,
                      engine: SCENEFLOW_ENGINE_ID,
                      qualityTier: tier.id,
                      segmentDuration: normalizedVideo.segmentDuration,
                    })
                  )
                  const isSelected =
                    (params.video.engine ?? SCENEFLOW_ENGINE_ID) === SCENEFLOW_ENGINE_ID &&
                    (params.video.qualityTier ?? 'cinematic') === tier.id

                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => selectSceneFlowTier(tier.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {tier.id === 'cinematic' ? (
                          <Sparkles className="w-4 h-4" />
                        ) : tier.id === 'ultra-4k' ? (
                          <Layers className="w-4 h-4" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        <span className="font-medium">{tier.label}</span>
                        {tier.id === 'cinematic' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            {t('recommended')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{tier.description}</div>
                      <div className="text-xs text-cyan-400/80 mt-2">
                        {formatCredits(tierEstimate.creditsEach)}{' '}
                        {t('creditsPerClip', { seconds: normalizedVideo.segmentDuration })}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAlternativeEngines((prev) => !prev)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showAlternativeEngines ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {t('alternativeEngines')}
              </button>

              <AnimatePresence>
                {showAlternativeEngines && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-hidden"
                  >
                    {ALTERNATIVE_ENGINES.map((engine) => {
                      const engineEstimate = estimateVideoClipCredits(
                        normalizeVideoParameters({
                          ...params.video,
                          engine: engine.id,
                          segmentDuration: normalizedVideo.segmentDuration,
                        })
                      )
                      const isSelected = params.video.engine === engine.id
                      const providerLabel =
                        engine.provider === 'vertex' ? t('vertexVeo') : t('aggregator')

                      return (
                        <button
                          key={engine.id}
                          type="button"
                          onClick={() => selectAlternativeEngine(engine.id)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="font-medium mb-1">{engine.label}</div>
                          <div className="text-xs text-gray-400">{engine.description}</div>
                          <div className="text-[10px] text-gray-500 mt-1">{providerLabel}</div>
                          <div className="text-xs text-cyan-400/80 mt-2">
                            {formatCredits(engineEstimate.creditsEach)}{' '}
                            {t('creditsPerClip', { seconds: normalizedVideo.segmentDuration })}
                          </div>
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">{t('clipDuration')}</label>
                <span className="text-sm font-medium text-white">{normalizedVideo.segmentDuration}s</span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                step={1}
                value={normalizedVideo.segmentDuration}
                onChange={(e) => updateSegmentDuration(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('clipDurationHint')}
              </p>
            </div>

            {productionType === 'full_video' && (
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-sm text-gray-300">
                <span className="text-cyan-400 font-medium">
                  {formatCredits(clipEstimate.creditsEach)}
                </span>{' '}
                {t('videoCreditsMath', { clips: formatCredits(totalClipCount) })}{' '}
                <span className="text-white font-medium">
                  {t('creditsCount', { count: formatCredits(clipEstimate.creditsEach * totalClipCount) })}
                </span>{' '}
                {t('forVideo')}
              </div>
            )}
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> {t('imagesByQuality')}
              {byokExcludeMedia && (
                <span className="text-[10px] uppercase tracking-wide text-amber-300 bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 rounded">
                  {t('excludedByok')}
                </span>
              )}
            </h3>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">
                  {t('draftBeatFrames', { credits: IMAGE_CREDITS.FRAME_GENERATION })}
                </label>
                <span className="text-sm font-medium text-white">{params.images.keyFrames}</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={params.images.keyFrames}
                onChange={(e) => updateParam('images', 'keyFrames', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">{t('retakesPerDraft')}</label>
                <span className="text-sm font-medium text-white">{params.images.retakesPerFrame}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={params.images.retakesPerFrame}
                onChange={(e) => updateParam('images', 'retakesPerFrame', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">
                  {t('finalStoryboardImages', { credits: IMAGE_CREDITS.FAL_KLING_IMAGE })}
                </label>
                <span className="text-sm font-medium text-white">{params.images.finalImages ?? 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.images.finalImages ?? 0}
                onChange={(e) => updateParam('images', 'finalImages', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">
                  {t('characterHeadshots', { credits: IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT })}
                </label>
                <span className="text-sm font-medium text-white">{params.images.characterHeadshots ?? 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={params.images.characterHeadshots ?? 0}
                onChange={(e) => updateParam('images', 'characterHeadshots', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? t('hideAdvanced') : t('showAdvanced')}
          </button>

          {/* Advanced Options */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 overflow-hidden"
              >
                {/* Audio */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Mic className="w-4 h-4" /> {t('audioAndVoice')}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">{t('dialogueLines')}</label>
                      <input
                        type="number"
                        min="0"
                        value={params.audio.dialogueLines}
                        onChange={(e) => updateParam('audio', 'dialogueLines', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">{t('soundEffects')}</label>
                      <input
                        type="number"
                        min="0"
                        value={params.audio.soundEffects}
                        onChange={(e) => updateParam('audio', 'soundEffects', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">{t('musicTracks')}</label>
                      <input
                        type="number"
                        min="0"
                        value={params.audio.musicTracks}
                        onChange={(e) => updateParam('audio', 'musicTracks', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">{t('voiceClones')}</label>
                      <input
                        type="number"
                        min="0"
                        value={params.voice.voiceClones}
                        onChange={(e) => updateParam('voice', 'voiceClones', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Storage */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" /> {t('storage')}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">{t('expectedStorageGb')}</label>
                      <input
                        type="number"
                        min="1"
                        value={params.storage.expectedStorageGB}
                        onChange={(e) => updateParam('storage', 'expectedStorageGB', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">{t('activeMonths')}</label>
                      <input
                        type="number"
                        min="1"
                        value={params.storage.activeMonths}
                        onChange={(e) => updateParam('storage', 'activeMonths', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Upscale */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> {t('upscaling')}
                  </h3>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">{t('minutesToUpscale')}</label>
                      <input
                        type="number"
                        min="0"
                        value={params.upscale.upscaleMinutes}
                        onChange={(e) => updateParam('upscale', 'upscaleMinutes', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-5">
                      <input
                        type="checkbox"
                        checked={params.upscale.useInstant}
                        onChange={(e) => updateParam('upscale', 'useInstant', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-300">{t('instantUpscale')}</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Budget Status Header */}
          <div className={`p-4 rounded-xl border ${
            hasDeficit 
              ? creditsNeeded > breakdown.total.credits * 0.5 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${
                hasDeficit 
                  ? creditsNeeded > breakdown.total.credits * 0.5 
                    ? 'text-red-400' 
                    : 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {hasDeficit 
                  ? creditsNeeded > breakdown.total.credits * 0.5 
                    ? `🔴 ${t('creditsNeededStatus')}` 
                    : `🟡 ${t('lowBalance')}`
                  : `🟢 ${t('budgetCovered')}`}
              </span>
              <span className="text-xs text-gray-400">
                {productionType === 'animatic' && `📊 ${t('animatic')}`}
                {languageVersions > 1 && ` • 🌐 ${t('langsShort', { count: languageVersions })}`}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all ${
                  hasDeficit 
                    ? creditsNeeded > breakdown.total.credits * 0.5 
                      ? 'bg-red-500' 
                      : 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ 
                  width: `${Math.min(100, (currentBalance / breakdown.total.credits) * 100)}%` 
                }}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-gray-400">{t('required')}</div>
                <div className="font-medium text-white">{formatCredits(breakdown.total.credits)}</div>
              </div>
              <div>
                <div className="text-gray-400">{t('available')}</div>
                <div className="font-medium text-cyan-400">{formatCredits(currentBalance)}</div>
              </div>
              <div>
                <div className="text-gray-400">{t('toPurchase')}</div>
                <div className={`font-medium ${hasDeficit ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {hasDeficit ? formatCredits(creditsNeeded) : '0'}
                </div>
              </div>
            </div>
          </div>

          {/* Total Credits Card */}
          <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400">
                {productionType === 'animatic' ? t('animaticProduction') : t('videoProduction')}
              </span>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>{t('minutesApprox', { minutes: params.video.totalMinutes })}</span>
              </div>
            </div>
            
            <div className="text-4xl font-bold text-white mb-2">
              {formatCredits(breakdown.total.credits)} <span className="text-2xl text-gray-400">{t('credits')}</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span>{t('approxSize', { size: formatBytes(breakdown.estimatedStorageBytes) })}</span>
              </div>
              {languageVersions > 1 && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Globe className="w-4 h-4" />
                  <span>{t('languagesCount', { count: languageVersions })}</span>
                </div>
              )}
            </div>
            
            {/* Set Budget Button */}
            {onSetBudget && (
              <button
                onClick={() =>
                  onSetBudget(
                    breakdown.total.credits,
                    buildCreditsBudgetParams(normalizedVideo, { byokExcludeMedia })
                  )
                }
                className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {t('setAsProjectBudget', { credits: formatCredits(breakdown.total.credits) })}
              </button>
            )}

            {projectId && onSetCreditsUsed && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">{t('currentCreditsUsed')}</span>
                  <span className="text-white font-medium">{formatCredits(currentCreditsUsed)}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={manualCreditsUsedInput}
                    onChange={(e) => setManualCreditsUsedInput(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                    placeholder={t('creditsUsedPlaceholder')}
                  />
                  <button
                    type="button"
                    disabled={isSavingCreditsUsed}
                    onClick={async () => {
                      const parsed = Number(manualCreditsUsedInput)
                      if (!Number.isFinite(parsed) || parsed < 0) return
                      setIsSavingCreditsUsed(true)
                      try {
                        await onSetCreditsUsed(Math.round(parsed))
                      } finally {
                        setIsSavingCreditsUsed(false)
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {isSavingCreditsUsed ? t('saving') : t('setUsed')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cost Breakdown - Collapsible */}
          <details className="group">
            <summary className="text-sm font-medium text-gray-400 cursor-pointer flex items-center gap-2 hover:text-gray-300 transition-colors">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              {t('costBreakdown')}
            </summary>
            <div className="mt-3 space-y-2">
            {[
              { key: 'intelligence', label: t('intelligence'), icon: Brain, cost: breakdown.intelligence },
              { key: 'video', label: productionType === 'animatic' ? t('mp4Rendering') : t('videoGeneration'), icon: productionType === 'animatic' ? MonitorPlay : Video, cost: breakdown.video },
              { key: 'images', label: t('imageGeneration'), icon: ImageIcon, cost: breakdown.images },
              { key: 'audio', label: t('audioAndMusic'), icon: Music, cost: breakdown.audio },
              { key: 'voiceClones', label: t('voiceClones'), icon: Mic, cost: breakdown.voiceClones },
              { key: 'upscale', label: t('upscaling'), icon: TrendingUp, cost: breakdown.upscale },
              ...(languageVersions > 1 ? [{
                key: 'languages',
                label: t('translationExtra', { count: languageVersions - 1 }),
                icon: Globe,
                cost: { credits: Math.round(languageCreditsCost), usdCost: languageCreditsCost / CREDIT_EXCHANGE_RATE, items: [] as any[] }
              }] : []),
            ].filter(item => item.cost && (item.cost.credits > 0 || Boolean((item.cost as any).excluded && (item.cost as any).preExclusionCredits))).map(item => {
              const Icon = item.icon
              const excluded = Boolean((item.cost as any).excluded)
              const displayCredits = excluded
                ? Number((item.cost as any).preExclusionCredits || 0)
                : item.cost.credits
              const percentage = breakdown.total.credits > 0 && !excluded
                ? (item.cost.credits / breakdown.total.credits) * 100 
                : 0
              return (
                <div
                  key={item.key}
                  className={`p-3 rounded-lg ${excluded ? 'bg-amber-950/20 border border-amber-700/30' : 'bg-slate-800/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-700/50 rounded">
                        <Icon className={`w-4 h-4 ${excluded ? 'text-amber-400' : 'text-cyan-400'}`} />
                      </div>
                      <div>
                        <span className={`text-sm ${excluded ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {item.label}
                        </span>
                        {excluded && (
                          <div className="text-[10px] text-amber-300">{t('excludedByok')}</div>
                        )}
                        {!excluded && item.cost.items?.length > 0 && (
                          <div className="text-[10px] text-gray-500 mt-0.5 max-w-[220px] truncate">
                            {item.cost.items.map((line: any) => line.name).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${excluded ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {formatCredits(displayCredits)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {excluded ? t('zeroBilled') : `${percentage.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </details>

          {/* Top-Up Packs - Collapsible */}
          {hasDeficit && (
            <details className="group">
              <summary className="text-sm font-medium text-gray-400 cursor-pointer flex items-center gap-2 hover:text-gray-300 transition-colors">
                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                <ShoppingCart className="w-4 h-4" /> {t('quickTopUpPacks')}
                <span className="text-xs text-emerald-400">{t('creditsNeeded', { credits: formatCredits(creditsNeeded) })}</span>
              </summary>
              
              <div className="grid gap-2">
                {TOPUP_PACKS.map((pack, index) => {
                  const coversDeficit = pack.credits >= creditsNeeded;
                  const packsNeeded = Math.ceil(creditsNeeded / pack.credits);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => onTopUp && onTopUp(index as keyof typeof TOPUP_PACKS)}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        coversDeficit
                          ? 'bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">
                              {pack.name}
                            </span>
                            {coversDeficit && (
                              <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded">
                                {t('coversProject')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mb-2">
                            {pack.description}
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-white font-medium">
                              {t('creditsCount', { count: formatCredits(pack.credits) })}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-white font-medium">
                              {formatCurrency(pack.price)}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {t('centsPerCredit', {
                                cents: (pack.price / pack.credits * 100).toFixed(2),
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!coversDeficit && (
                            <span className="text-xs text-gray-500">
                              {t('needPacks', { count: packsNeeded })}
                            </span>
                          )}
                          <Plus className="w-5 h-5 text-cyan-400" />
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </details>
          )}

          {/* Storage Tracking - Collapsible */}
          <details className="group">
            <summary className="text-sm font-medium text-gray-400 cursor-pointer flex items-center gap-2 hover:text-gray-300 transition-colors">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              <HardDrive className="w-4 h-4" /> 
              {t('storageEstimate')}
              <span className="text-xs text-gray-500">
                {t('approxSize', { size: formatBytes(breakdown.estimatedStorageBytes) })}
              </span>
            </summary>
            
            <div className="mt-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">
                  {t('approxSize', { size: formatBytes(breakdown.estimatedStorageBytes) })}
                </span>
                <span className="text-sm text-gray-400">
                  {t('monthsRetention', { count: params.storage.activeMonths })}
                </span>
              </div>
              
              <div className="text-xs text-gray-400 mb-3">
                {t('basedOnScenes', { scenes: params.scenes.count, segments: params.scenes.segmentsPerScene })}
              </div>
              
              {breakdown.estimatedStorageBytes > 5 * 1024 * 1024 * 1024 && (
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="text-xs text-gray-400 mb-2">{t('needMoreStorage')}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(STORAGE_ADDONS).map(([key, addon]) => (
                      <div 
                        key={key}
                        className="p-2 bg-slate-700/50 rounded-lg text-center"
                      >
                        <div className="text-sm font-medium text-white">
                          {t('storageGbAmount', { gb: addon.gb })}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatCurrency(addon.priceMonthly)}
                          {t('perMonth')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* Recommended Top-Up Packs - Collapsible */}
          <details className="group">
            <summary className="text-sm font-medium text-gray-400 cursor-pointer flex items-center gap-2 hover:text-gray-300 transition-colors">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              <ShoppingCart className="w-4 h-4" />
              {t('recommendedTopUp')}
            </summary>
            <div className="mt-3 space-y-2">
              {Object.entries(TOPUP_PACKS).map(([key, pack]) => {
                const coversProject = pack.credits >= breakdown.total.credits;
                const packsNeeded = Math.ceil(breakdown.total.credits / pack.credits);
                
                return (
                  <button
                    key={key}
                    onClick={() => onTopUp && onTopUp(key as keyof typeof TOPUP_PACKS)}
                    disabled={!onTopUp}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      coversProject
                        ? 'bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20'
                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">
                            {pack.name}
                          </span>
                          {coversProject && (
                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded">
                              {t('coversProject')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                          {pack.description}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-white font-medium">
                            {t('creditsCount', { count: formatCredits(pack.credits) })}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-white font-medium">
                            {formatCurrency(pack.price)}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {t('centsPerCredit', {
                              cents: (pack.price / pack.credits * 100).toFixed(2),
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!coversProject && (
                          <span className="text-xs text-gray-500">
                            {t('needPacks', { count: packsNeeded })}
                          </span>
                        )}
                        <Plus className="w-5 h-5 text-cyan-400" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </details>
        </div>
      </div>
    </motion.div>
  )
}

export default ProjectCostCalculator
