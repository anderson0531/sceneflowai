'use client'

import React, { useState, useEffect } from 'react'
import { DollarSign, Info, Key, Volume2, Camera, Film, ChevronDown, ChevronUp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { calculateProjectCost, type ProjectCostEstimate } from '@/lib/cost/projectCostCalculator'

interface ProjectCostCalculatorProps {
  scenes: any[]
  characters: any[]
  hasBYOK?: boolean
  onOpenBYOK?: () => void
}

export function ProjectCostCalculator({ 
  scenes, 
  characters,
  hasBYOK = false,
  onOpenBYOK 
}: ProjectCostCalculatorProps) {
  const [estimate, setEstimate] = useState<ProjectCostEstimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  
  // BYOK toggles for each service
  const [byokSettings, setByokSettings] = useState({
    tts: hasBYOK,
    images: hasBYOK,
    video: hasBYOK
  })
  
  // Calculate costs when scenes or BYOK settings change
  useEffect(() => {
    if (scenes.length === 0) {
      setEstimate(null)
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    calculateProjectCost(scenes, characters, byokSettings)
      .then(setEstimate)
      .catch((err) => {
        console.error('Error calculating project cost:', err)
        setError('Failed to calculate costs. Using default estimates.')
        // Provide fallback estimate
        setEstimate(createFallbackEstimate(scenes, byokSettings))
      })
      .finally(() => setLoading(false))
  }, [scenes, characters, byokSettings])
  
  if (loading || !estimate) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 border border-blue-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Calculating project costs...</span>
        </div>
      </div>
    )
  }
  
  // Calculate total credits based on current BYOK settings
  const totalCredits = 
    (byokSettings.tts ? estimate.tts.totalByokCredits : estimate.tts.totalCredits) +
    (byokSettings.images ? estimate.images.totalByokCredits : estimate.images.totalCredits) +
    (byokSettings.video ? estimate.video.totalByokCredits : estimate.video.totalCredits)
  
  const totalUsd = totalCredits * 0.01
  
  // Calculate maximum potential savings
  const maxSavings = estimate.savings
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 border border-blue-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Project Cost Estimate
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Estimated credits for TTS, images, and video generation.
                  {hasBYOK && ' Toggle BYOK for each service to see savings.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      
      {error && (
        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-300">
          {error}
        </div>
      )}
      
      {/* Total Cost Display */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">Total Credits Needed:</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {totalCredits.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              (${totalUsd.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
      
      {/* Service Breakdown */}
      {expanded && (
        <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          {/* TTS */}
          <ServiceRow
            icon={<Volume2 className="w-4 h-4 text-indigo-500" />}
            label="Text-to-Speech"
            units={estimate.tts.units}
            unitLabel={estimate.tts.unitDescription || 'characters'}
            credits={byokSettings.tts ? estimate.tts.totalByokCredits : estimate.tts.totalCredits}
            sceneFlowCredits={estimate.tts.totalCredits}
            byokCredits={estimate.tts.totalByokCredits}
            useBYOK={byokSettings.tts}
            onToggleBYOK={(value) => setByokSettings(prev => ({ ...prev, tts: value }))}
            hasBYOK={hasBYOK}
          />
          
          {/* Images */}
          <ServiceRow
            icon={<Camera className="w-4 h-4 text-green-500" />}
            label="Image Generation"
            units={estimate.images.units}
            unitLabel={estimate.images.unitDescription || 'images'}
            credits={byokSettings.images ? estimate.images.totalByokCredits : estimate.images.totalCredits}
            sceneFlowCredits={estimate.images.totalCredits}
            byokCredits={estimate.images.totalByokCredits}
            useBYOK={byokSettings.images}
            onToggleBYOK={(value) => setByokSettings(prev => ({ ...prev, images: value }))}
            hasBYOK={hasBYOK}
          />
          
          {/* Video */}
          <ServiceRow
            icon={<Film className="w-4 h-4 text-pink-500" />}
            label="Video Generation"
            units={estimate.video.units}
            unitLabel={estimate.video.unitDescription || 'clips'}
            credits={byokSettings.video ? estimate.video.totalByokCredits : estimate.video.totalCredits}
            sceneFlowCredits={estimate.video.totalCredits}
            byokCredits={estimate.video.totalByokCredits}
            useBYOK={byokSettings.video}
            onToggleBYOK={(value) => setByokSettings(prev => ({ ...prev, video: value }))}
            hasBYOK={hasBYOK}
          />
        </div>
      )}
      
      {/* BYOK Call-to-Action */}
      {!hasBYOK && maxSavings > 1 && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-start gap-2">
            <Key className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                Save up to ${maxSavings.toFixed(2)} with your own API keys
              </p>
              {onOpenBYOK && (
                <button
                  onClick={onOpenBYOK}
                  className="text-xs font-medium text-green-700 dark:text-green-400 hover:underline"
                >
                  Connect Your API Keys →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ServiceRowProps {
  icon: React.ReactNode
  label: string
  units: number
  unitLabel: string
  credits: number
  sceneFlowCredits: number
  byokCredits: number
  useBYOK: boolean
  onToggleBYOK: (value: boolean) => void
  hasBYOK: boolean
}

function ServiceRow({ 
  icon, 
  label, 
  units, 
  unitLabel, 
  credits, 
  sceneFlowCredits,
  byokCredits,
  useBYOK, 
  onToggleBYOK, 
  hasBYOK 
}: ServiceRowProps) {
  const savings = sceneFlowCredits - byokCredits
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {units.toLocaleString()} {unitLabel}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {credits.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">credits</div>
          {useBYOK && savings > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400">
              Save {savings.toLocaleString()}
            </div>
          )}
        </div>
        
        {hasBYOK && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">BYOK</span>
            <button
              onClick={() => onToggleBYOK(!useBYOK)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                useBYOK 
                  ? 'bg-green-600 dark:bg-green-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={useBYOK}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useBYOK ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Fallback estimate creator for error cases
function createFallbackEstimate(scenes: any[], byokSettings: { tts: boolean; images: boolean; video: boolean }): ProjectCostEstimate {
  const ttsChars = scenes.reduce((sum, s) => {
    return sum + (s.narration?.length || 0) + (s.action?.length || 0) + 
           (s.dialogue?.reduce((acc: number, d: any) => acc + (d.line?.length || 0), 0) || 0)
  }, 0)
  
  const ttsUnits = Math.ceil(ttsChars / 100)
  const imageCount = scenes.length
  const videoSeconds = Math.max(scenes.length * 8, 8) // Rough estimate
  
  return {
    tts: {
      service: 'tts',
      units: ttsUnits,
      unitDescription: 'per 100 characters',
      creditsPerUnit: 10,
      byokCreditsPerUnit: 2,
      totalCredits: 10 * ttsUnits,
      totalByokCredits: 2 * ttsUnits,
      usdValue: 0,
      details: []
    },
    images: {
      service: 'image_gen',
      units: imageCount,
      unitDescription: 'per image',
      creditsPerUnit: 30,
      byokCreditsPerUnit: 6,
      totalCredits: 30 * imageCount,
      totalByokCredits: 6 * imageCount,
      usdValue: 0,
      details: []
    },
    video: {
      service: 'video_gen',
      units: videoSeconds,
      unitDescription: 'per second',
      creditsPerUnit: 35,
      byokCreditsPerUnit: 7,
      totalCredits: 35 * videoSeconds,
      totalByokCredits: 7 * videoSeconds,
      usdValue: 0,
      details: []
    },
    totalCredits: 0,
    totalByokCredits: 0,
    totalUsd: 0,
    totalByokUsd: 0,
    savings: 0
  }
}
