'use client'

import React from 'react'
import { DollarSign, Info, Key } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { calculateVideoCost, VIDEO_PRICING } from '@/lib/cost/videoCalculator'

interface VideoCostEstimatorProps {
  clipCount: number
  provider?: keyof typeof VIDEO_PRICING
  hasBYOK?: boolean
  onOpenBYOK?: () => void
}

export function VideoCostEstimator({ 
  clipCount, 
  provider = 'runway_gen4',
  hasBYOK = false,
  onOpenBYOK 
}: VideoCostEstimatorProps) {
  const cost = calculateVideoCost(clipCount, provider)
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 border border-blue-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Projected Cost
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Based on {clipCount} estimated 10-second clips using {cost.baseProvider}.
                  Includes 25% markup + ${cost.fixedFeePerClip.toFixed(2)}/clip service fee.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Cost Display */}
      <div className="space-y-2">
        {!hasBYOK ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Using SceneFlow Credits:</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${cost.totalUserCost.toFixed(2)}
              </span>
            </div>
            
            {/* BYOK Call-to-Action */}
            {clipCount > 5 && cost.byokSavings > 10 && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-start gap-2">
                  <Key className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                      Save ${cost.byokSavings.toFixed(2)} with your own API key
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                      Pay provider directly: ~${cost.totalProviderCost.toFixed(2)}
                    </p>
                    {onOpenBYOK && (
                      <button
                        onClick={onOpenBYOK}
                        className="text-xs font-medium text-green-700 dark:text-green-400 hover:underline"
                      >
                        Connect Your API Key →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Using Your API Key:</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              ~${cost.totalProviderCost.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      
      {/* Cost Breakdown (collapsible/tooltip) */}
      <details className="mt-3">
        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          View breakdown
        </summary>
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>{clipCount} clips × ${cost.baseCostPerClip.toFixed(2)}</span>
            <span>${cost.totalProviderCost.toFixed(2)}</span>
          </div>
          {!hasBYOK && (
            <>
              <div className="flex justify-between">
                <span>Markup (25%)</span>
                <span>+${cost.totalMarkup.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span>+${cost.totalFixedFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100 pt-1 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span>${cost.totalUserCost.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </details>
    </div>
  )
}
