'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  SlidersHorizontal, 
  ChevronDown, 
  RotateCcw,
  Sparkles,
  Target,
  Film,
  Users,
  TrendingUp
} from 'lucide-react'
import { 
  DEFAULT_SCORING_WEIGHTS, 
  WEIGHT_PRESETS,
  type WeightPresetKey 
} from '@/lib/treatment/scoringChecklist'

interface WeightCustomizerProps {
  weights: Record<string, number>
  preset: WeightPresetKey | 'custom' | null
  onWeightsChange: (weights: Record<string, number>) => void
  onPresetChange: (preset: WeightPresetKey | 'custom') => void
  disabled?: boolean
}

const AXIS_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  'concept-originality': { label: 'Concept Originality', icon: Sparkles },
  'character-depth': { label: 'Character Depth', icon: Users },
  'pacing-structure': { label: 'Pacing & Structure', icon: TrendingUp },
  'genre-fidelity': { label: 'Genre Fidelity', icon: Film },
  'commercial-viability': { label: 'Commercial Viability', icon: Target },
}

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'balanced': Target,
  'commercial': TrendingUp,
  'artistic': Sparkles,
  'genre-driven': Film,
}

export function WeightCustomizer({ 
  weights, 
  preset, 
  onWeightsChange, 
  onPresetChange,
  disabled = false 
}: WeightCustomizerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Calculate total (should be 1.0)
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0)
  const isValid = Math.abs(total - 1.0) < 0.01
  
  const handlePresetSelect = useCallback((presetKey: WeightPresetKey) => {
    const presetWeights = WEIGHT_PRESETS[presetKey].weights
    onWeightsChange({ ...presetWeights })
    onPresetChange(presetKey)
  }, [onWeightsChange, onPresetChange])
  
  const handleWeightChange = useCallback((axisId: string, value: number) => {
    const newWeights = { ...weights, [axisId]: value }
    onWeightsChange(newWeights)
    onPresetChange('custom')
  }, [weights, onWeightsChange, onPresetChange])
  
  const handleReset = useCallback(() => {
    onWeightsChange({ ...DEFAULT_SCORING_WEIGHTS })
    onPresetChange('balanced')
  }, [onWeightsChange, onPresetChange])
  
  return (
    <div className="border-t border-slate-700/30 mt-3 pt-3">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3 h-3" />
          <span>Customize Scoring Weights</span>
        </div>
        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-4">
              {/* Preset Buttons */}
              <div className="space-y-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Presets</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(WEIGHT_PRESETS) as WeightPresetKey[]).map((presetKey) => {
                    const presetConfig = WEIGHT_PRESETS[presetKey]
                    const Icon = PRESET_ICONS[presetKey] || Target
                    const isActive = preset === presetKey
                    
                    return (
                      <button
                        key={presetKey}
                        onClick={() => handlePresetSelect(presetKey)}
                        disabled={disabled}
                        className={`
                          flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all
                          ${isActive 
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' 
                            : 'bg-slate-800/50 border border-slate-700/30 text-gray-400 hover:text-white hover:border-slate-600/50'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                        title={presetConfig.description}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="font-medium">{presetConfig.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Weight Sliders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">
                    Custom Weights {preset === 'custom' && <span className="text-cyan-400">(Modified)</span>}
                  </p>
                  <button
                    onClick={handleReset}
                    disabled={disabled}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Reset
                  </button>
                </div>
                
                {Object.entries(AXIS_LABELS).map(([axisId, { label, icon: Icon }]) => {
                  const weight = weights[axisId] || 0.2
                  const percentage = Math.round(weight * 100)
                  
                  return (
                    <div key={axisId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3 h-3 text-gray-500" />
                          <span className="text-[11px] text-gray-400">{label}</span>
                        </div>
                        <span className="text-[11px] text-cyan-400 font-medium w-8 text-right">
                          {percentage}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={40}
                        step={5}
                        value={percentage}
                        onChange={(e) => handleWeightChange(axisId, parseInt(e.target.value) / 100)}
                        disabled={disabled}
                        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer 
                          [&::-webkit-slider-thumb]:appearance-none 
                          [&::-webkit-slider-thumb]:w-3 
                          [&::-webkit-slider-thumb]:h-3 
                          [&::-webkit-slider-thumb]:bg-cyan-400 
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:transition-all
                          [&::-webkit-slider-thumb]:hover:scale-110
                          disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  )
                })}
                
                {/* Total Validation */}
                <div className={`text-[10px] text-right ${isValid ? 'text-gray-500' : 'text-amber-400'}`}>
                  Total: {Math.round(total * 100)}%
                  {!isValid && ' (should be 100%)'}
                </div>
              </div>
              
              {/* Info Text */}
              <p className="text-[10px] text-gray-600 italic">
                Lower weights on Pacing & Concept allow for more flexibility—these are often refined in the script phase.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
