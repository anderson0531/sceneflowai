'use client'

import { useState, useMemo, useCallback } from 'react'
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
  Info
} from 'lucide-react'
import {
  CREDIT_EXCHANGE_RATE,
  SUBSCRIPTION_TIERS,
  TOPUP_PACKS,
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
  onSetBudget?: (credits: number) => void | Promise<void>
  initialParams?: Partial<FullProjectParameters>
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
  onSetBudget,
  initialParams,
}: ProjectCostCalculatorProps) {
  // Project parameters state - merge initialParams with defaults
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)

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

  // Calculate costs and strategies
  const comparison = useMemo(() => compareStrategies(params), [params])
  const breakdown = comparison.projectCost

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
          <h3 className="text-lg font-semibold text-white">Quick Estimate</h3>
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
              {preset.name}
            </button>
          ))}
        </div>

        {/* Quick result */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-white">
              {formatCredits(breakdown.total.credits)} credits
            </div>
            <div className="text-sm text-gray-400">
              ≈ {formatCurrency(breakdown.total.usdCost)}
            </div>
          </div>
          {recommended && (
            <div className="text-right">
              <div className="text-sm text-cyan-400 font-medium">{recommended.tierName}</div>
              <div className="text-xs text-gray-500">{formatCurrency(recommended.totalMonthlyCost)}/mo</div>
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
            <h2 className="text-xl font-bold text-white">Project Cost Calculator</h2>
            <p className="text-sm text-gray-400">
              Plan your next masterpiece. Configure your project and see the best pricing strategy.
            </p>
          </div>
        </div>
        {currentBalance > 0 && (
          <div className="text-right">
            <div className="text-sm text-gray-400">Current Balance</div>
            <div className="text-lg font-bold text-cyan-400">{formatCredits(currentBalance)} credits</div>
          </div>
        )}
      </div>

      {/* Preset Quick Select */}
      <div className="px-6 py-4 border-b border-slate-700/30 bg-slate-800/30">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400 mr-2">Quick Start:</span>
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
                {preset.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 p-6">
        {/* Left Column - Inputs */}
        <div className="space-y-6">
          {/* Scene Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Film className="w-4 h-4" /> Scene Configuration
            </h3>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">Number of Scenes</label>
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
                <label className="text-sm text-gray-300">Segments per Scene</label>
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
                <label className="text-sm text-gray-300">Takes per Segment (regenerations)</label>
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

          {/* Video Model */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Video className="w-4 h-4" /> Video Quality
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateParam('video', 'model', 'veo_fast')}
                className={`p-4 rounded-xl border transition-all ${
                  params.video.model === 'veo_fast'
                    ? 'bg-cyan-500/20 border-cyan-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">Veo Fast</span>
                </div>
                <div className="text-xs text-gray-400">1080p • 1200 credits/8s</div>
              </button>
              
              <button
                onClick={() => updateParam('video', 'model', 'veo_quality_4k')}
                className={`p-4 rounded-xl border transition-all ${
                  params.video.model === 'veo_quality_4k'
                    ? 'bg-cyan-500/20 border-cyan-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">Veo 4K</span>
                </div>
                <div className="text-xs text-gray-400">4K Quality • 2000 credits/8s</div>
              </button>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Key Frames & Images
            </h3>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">Key Frames to Generate</label>
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
                <label className="text-sm text-gray-300">Retakes per Frame</label>
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
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
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
                    <Mic className="w-4 h-4" /> Audio & Voice
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Dialogue Lines</label>
                      <input
                        type="number"
                        min="0"
                        value={params.audio.dialogueLines}
                        onChange={(e) => updateParam('audio', 'dialogueLines', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Sound Effects</label>
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
                      <label className="text-xs text-gray-400">Music Tracks</label>
                      <input
                        type="number"
                        min="0"
                        value={params.audio.musicTracks}
                        onChange={(e) => updateParam('audio', 'musicTracks', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Voice Clones</label>
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
                    <HardDrive className="w-4 h-4" /> Storage
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Expected Storage (GB)</label>
                      <input
                        type="number"
                        min="1"
                        value={params.storage.expectedStorageGB}
                        onChange={(e) => updateParam('storage', 'expectedStorageGB', Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Active Months</label>
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
                    <TrendingUp className="w-4 h-4" /> Upscaling
                  </h3>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">Minutes to Upscale</label>
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
                      <span className="text-sm text-gray-300">Instant (1.5x)</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Total Credits Card */}
          <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400">Project Budget Calculation</span>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>~{params.video.totalMinutes} min video</span>
              </div>
            </div>
            
            <div className="text-4xl font-bold text-white mb-2">
              {formatCredits(breakdown.total.credits)} <span className="text-2xl text-gray-400">credits</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>≈ {formatCurrency(breakdown.total.usdCost)}</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span>~{formatBytes(breakdown.estimatedStorageBytes)}</span>
              </div>
            </div>
            
            {/* Set Budget Button */}
            {onSetBudget && (
              <button
                onClick={() => onSetBudget(breakdown.total.credits)}
                className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Set as Project Budget ({formatCredits(breakdown.total.credits)} credits)
              </button>
            )}
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Cost Breakdown by Service</h3>
            
            {[
              { key: 'video', label: 'Video Generation', icon: Video, cost: breakdown.video },
              { key: 'images', label: 'Image Generation', icon: ImageIcon, cost: breakdown.images },
              { key: 'audio', label: 'Audio & Music', icon: Music, cost: breakdown.audio },
              { key: 'voiceClones', label: 'Voice Clones', icon: Mic, cost: breakdown.voiceClones },
              { key: 'upscale', label: 'Upscaling', icon: TrendingUp, cost: breakdown.upscale },
            ].filter(item => item.cost.credits > 0).map(item => {
              const Icon = item.icon
              const percentage = breakdown.total.credits > 0 
                ? (item.cost.credits / breakdown.total.credits) * 100 
                : 0
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-700/50 rounded">
                      <Icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-sm text-white">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {formatCredits(item.cost.credits)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Strategy Comparison */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Best Value Options</h3>
            
            {comparison.subscriptions
              .filter(s => !s.tier.includes('trial') || s.recommended)
              .slice(0, 3)
              .map(strategy => (
                <div
                  key={strategy.tier}
                  className={`p-4 rounded-xl border transition-all ${
                    strategy.recommended
                      ? 'bg-cyan-500/10 border-cyan-500/50'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {strategy.recommended && (
                        <span className="px-2 py-0.5 bg-cyan-500 text-white text-xs font-medium rounded">
                          BEST VALUE
                        </span>
                      )}
                      <span className="font-medium text-white">{strategy.tierName}</span>
                    </div>
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(strategy.totalMonthlyCost)}<span className="text-sm text-gray-400">/mo</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{formatCredits(strategy.includedCredits)} credits included</span>
                    {strategy.additionalCreditsNeeded > 0 && (
                      <span className="text-amber-400">
                        +{formatCredits(strategy.additionalCreditsNeeded)} via top-ups
                      </span>
                    )}
                  </div>
                  
                  {strategy.savings > 0 && (
                    <div className="mt-2 text-sm text-green-400">
                      Save {formatCurrency(strategy.savings)} vs pay-as-you-go
                    </div>
                  )}
                  
                  {strategy.warnings.length > 0 && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-amber-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{strategy.warnings[0]}</span>
                    </div>
                  )}
                  
                  {onUpgrade && strategy.tier !== currentTier && (
                    <button
                      onClick={() => onUpgrade(strategy.tier)}
                      className="mt-3 w-full py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      Upgrade to {strategy.tierName}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
          </div>

          {/* Pay-as-you-go Option */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Or pay-as-you-go:</span>
              <span className="text-lg font-bold text-white">
                {formatCurrency(comparison.payAsYouGo.totalCost)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {comparison.payAsYouGo.packs.map(p => `${p.quantity}x ${p.name}`).join(' + ')}
            </div>
          </div>

          {/* Current Balance Info */}
          {hasDeficit && (
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">
                    You need {formatCredits(creditsNeeded)} more credits
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Your current balance of {formatCredits(currentBalance)} credits won&apos;t cover this project.
                    Consider upgrading or purchasing a top-up pack.
                  </p>
                  {onTopUp && (
                    <button
                      onClick={() => onTopUp('scene_pack')}
                      className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Get Scene Pack ({formatCredits(TOPUP_PACKS.scene_pack.credits)} credits)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ProjectCostCalculator
