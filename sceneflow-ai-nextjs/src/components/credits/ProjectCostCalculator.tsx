'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
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
  X
} from 'lucide-react'
import {
  IMAGE_CREDITS,
  VIDEO_CREDITS,
  AUDIO_CREDITS,
  RENDER_CREDITS,
  SUBSCRIPTION_PLANS,
  TOP_UP_PACKS,
  type VideoQuality,
  type PlanTier,
} from '@/lib/credits/creditCosts'

// =============================================================================
// TYPES
// =============================================================================

interface ProjectCostCalculatorProps {
  currentPlan?: PlanTier
  currentBalance?: number
  onUpgrade?: (plan: PlanTier) => void
  onTopUp?: (pack: keyof typeof TOP_UP_PACKS) => void
}

interface CostBreakdown {
  images: number
  videoFast: number
  videoMax: number
  voiceover: number
  render: number
  total: number
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProjectCostCalculator({
  currentPlan = 'starter',
  currentBalance = 0,
  onUpgrade,
  onTopUp,
}: ProjectCostCalculatorProps) {
  // Form state
  const [projectName, setProjectName] = useState('Space Opera Trailer')
  const [sceneCount, setSceneCount] = useState(20)
  const [imagesPerScene, setImagesPerScene] = useState(3)
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('fast')
  const [hasVoiceover, setHasVoiceover] = useState(true)
  const [charsPerScene, setCharsPerScene] = useState(500)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Calculate costs
  const breakdown = useMemo((): CostBreakdown => {
    const images = sceneCount * imagesPerScene * IMAGE_CREDITS.IMAGEN_3
    
    const videoCredits = videoQuality === 'max' ? VIDEO_CREDITS.VEO_QUALITY_4K : VIDEO_CREDITS.VEO_FAST
    const videoFast = videoQuality === 'fast' ? sceneCount * videoCredits : 0
    const videoMax = videoQuality === 'max' ? sceneCount * videoCredits : 0
    
    const totalChars = sceneCount * charsPerScene
    const voiceover = hasVoiceover 
      ? Math.ceil(totalChars / 1000) * AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS 
      : 0
    
    const estimatedMinutes = Math.ceil(sceneCount * 0.5) // ~30s per scene
    const render = estimatedMinutes * RENDER_CREDITS.PER_MINUTE + RENDER_CREDITS.MP4_EXPORT

    return {
      images,
      videoFast,
      videoMax,
      voiceover,
      render,
      total: images + videoFast + videoMax + voiceover + render,
    }
  }, [sceneCount, imagesPerScene, videoQuality, hasVoiceover, charsPerScene])

  // Find recommended plan
  const recommendedPlan = useMemo((): PlanTier => {
    if (breakdown.total <= SUBSCRIPTION_PLANS.coffee_break.credits) return 'coffee_break'
    if (breakdown.total <= SUBSCRIPTION_PLANS.starter.credits) return 'starter'
    if (breakdown.total <= SUBSCRIPTION_PLANS.pro.credits) return 'pro'
    return 'studio'
  }, [breakdown.total])

  // Calculate deficit
  const creditsNeeded = breakdown.total - currentBalance
  const hasDeficit = creditsNeeded > 0

  // Find best top-up
  const recommendedTopUp = useMemo(() => {
    if (creditsNeeded <= TOP_UP_PACKS.quick_fix.credits) return 'quick_fix'
    if (creditsNeeded <= TOP_UP_PACKS.scene_pack.credits) return 'scene_pack'
    return 'feature_boost'
  }, [creditsNeeded])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Project Cost Calculator</h2>
            <p className="text-sm text-gray-400">Plan your next masterpiece! Tell us your project, and we&apos;ll tell you the credits you&apos;ll need.</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors">
          ✓ Feature Boost
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 p-6">
        {/* Left Column - Inputs */}
        <div className="space-y-6">
          {/* Project Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Project Details</h3>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-400">Number of Scenes</label>
                  <span className="text-sm font-medium text-white">{sceneCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={sceneCount}
                  onChange={(e) => setSceneCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>100+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Type Quick Select */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Project Type</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setSceneCount(10); setImagesPerScene(3); setVideoQuality('fast'); }}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" checked={sceneCount <= 10} readOnly />
                  <span className="text-white text-sm">Animatic / Storyboard</span>
                </div>
                <span className="text-xs text-gray-500 ml-6">5+</span>
              </button>
              <button
                onClick={() => { setSceneCount(50); setImagesPerScene(3); setVideoQuality('fast'); }}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" checked={sceneCount > 10 && sceneCount <= 50} readOnly />
                  <span className="text-white text-sm">Feature Film</span>
                </div>
                <span className="text-xs text-gray-500 ml-6">5+</span>
              </button>
            </div>
          </div>

          {/* Project Focus */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Project Focus</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Number of Scenes</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={true} className="sr-only peer" readOnly />
                  <div className="w-11 h-6 bg-slate-700 peer-checked:bg-cyan-500 rounded-full transition-colors"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500">Prioritize 5 Images 3 shots</p>
              
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-gray-400">Find Video Length</p>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>↳ Total Reel Length?</p>
                <p>↳ Estimated image for order each shots</p>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced Options
            </button>
            
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-4"
              >
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-gray-400">Images per Scene</label>
                    <span className="text-sm font-medium text-white">{imagesPerScene}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={imagesPerScene}
                    onChange={(e) => setImagesPerScene(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-gray-400">Avg Characters per Scene (voiceover)</label>
                    <span className="text-sm font-medium text-white">{charsPerScene}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="50"
                    value={charsPerScene}
                    onChange={(e) => setCharsPerScene(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Checklist Options */}
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={true}
                  readOnly
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-white">Images 5</span>
              </div>
              <span className="text-sm text-gray-400">{breakdown.images} credits</span>
            </label>
            
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={false}
                  readOnly
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-white">Short Film / Commercial</span>
              </div>
              <span className="text-sm text-gray-400">2,000</span>
            </label>
            
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={false}
                  readOnly
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-white">Final Render Video & Audio</span>
              </div>
              <span className="text-sm text-gray-400">4,400+</span>
            </label>
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Total Credits Needed */}
          <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400">☆ Your Project Needs:</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={videoQuality === 'fast'}
                    onChange={() => setVideoQuality('fast')}
                    className="text-cyan-500"
                  />
                  <span className="text-sm text-gray-300">Fast / Draft Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={videoQuality === 'max'}
                    onChange={() => setVideoQuality('max')}
                    className="text-cyan-500"
                  />
                  <span className="text-sm text-gray-300">Veo Drafts</span>
                </label>
              </div>
            </div>
            
            <div className="text-4xl font-bold text-white mb-2">
              [{breakdown.total.toLocaleString()}] Credits
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                <span>Average Video Length (: 8conds)</span>
              </div>
            </div>
          </div>

          {/* Final Video Quality */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Final Video Quality</h3>
            
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={true} readOnly className="w-4 h-4 rounded" />
                <span className="text-sm text-white">Imeeo Drafts</span>
              </div>
              <span className="text-sm text-white">1500 credits</span>
            </label>
            
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={true} readOnly className="w-4 h-4 rounded" />
                <span className="text-sm text-white">Video Drafts / Final Rentitial</span>
              </div>
              <span className="text-sm text-white">150./100 credits</span>
            </label>
            
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={true} readOnly className="w-4 h-4 rounded" />
                <span className="text-sm text-white">Video Drafts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm text-white">750 credits</span>
              </div>
            </label>
            
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={true} readOnly className="w-4 h-4 rounded" />
                <span className="text-sm text-white">Production Ready</span>
              </div>
              <span className="text-sm text-white">75000 credits</span>
            </label>
            
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={true} readOnly className="w-4 h-4 rounded" />
                <span className="text-sm text-white">Total Buffer (115%) words / /</span>
              </div>
              <span className="text-sm text-gray-400">[60 sectes: words / 60rds]</span>
            </label>
            
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={true} readOnly className="w-4 h-4 rounded" />
                <span className="text-sm text-white">Voiceover</span>
              </div>
              <span className="text-sm text-white">C.CCCC</span>
            </label>
          </div>

          {/* To Complete This */}
          <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
            <h3 className="text-sm font-medium text-gray-400 mb-3">To Complete This:</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white">Upgrade to the</span>
              <span className="px-3 py-1 bg-cyan-500 text-white rounded-lg font-bold">
                {breakdown.total.toLocaleString()}
              </span>
              <span className="text-white">(Save upo Top-Up $XXX!</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">Save up @ack} {Non-expiring}</p>
          </div>

          {/* Your Estrnct Beeids */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">Your Estr/ct Beeids</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onTopUp?.('scene_pack')}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-medium transition-colors"
              >
                + Scene Boost
              </button>
              <span className="text-gray-400 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-gray-500"></div>
                Current Credits remaining.
              </span>
            </div>
            
            <h3 className="text-sm font-medium text-white">You Have</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onTopUp?.('feature_boost')}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-medium transition-colors"
              >
                + Starte Boost
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span className="text-gray-400 text-sm">Add a Recommended Top Pack | Studio Plan!</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ProjectCostCalculator
