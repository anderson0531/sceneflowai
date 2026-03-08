'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Sparkles, Zap, Brush, Film, Brain, Check } from 'lucide-react'
import { MODEL_TIERS } from './constants'
import type { QualityModeProps } from './types'

const TIER_ICONS = { Zap, Brush, Film } as const
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  eco: Zap,
  designer: Brush,
  director: Film,
}

/**
 * Unified quality mode selection for image generation dialogs.
 * Features:
 * - Eco / Designer / Director tiers with cost display
 * - Thinking Level toggle (Low/High)
 * - Compact mode for inline display in Custom Prompt tab
 */
export function QualityModeSection({
  modelTier,
  onModelTierChange,
  thinkingLevel,
  onThinkingLevelChange,
  compact = false,
  className,
}: QualityModeProps) {
  if (compact) {
    return (
      <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
        <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Quality Mode
        </h4>
        <div className="flex items-center gap-2">
          {MODEL_TIERS.filter(t => !t.comingSoon).map((tier) => {
            const Icon = ICON_MAP[tier.id] || Zap
            const isSelected = modelTier === tier.id
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => onModelTierChange(tier.id)}
                className={cn(
                  'flex-1 flex items-center gap-2 p-2 rounded-lg border transition-all',
                  isSelected
                    ? tier.color === 'emerald'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                )}
              >
                <Icon className={cn(
                  'w-4 h-4',
                  isSelected
                    ? tier.color === 'emerald' ? 'text-emerald-400' : 'text-purple-400'
                    : 'text-slate-400'
                )} />
                <div className="text-left">
                  <div className="text-xs font-medium text-slate-200">{tier.name}</div>
                  <div className="text-[10px] text-slate-500">{tier.cost}</div>
                </div>
              </button>
            )
          })}
        </div>
        {/* Compact thinking level */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Thinking:</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onThinkingLevelChange('low')}
              className={cn(
                'px-2 py-0.5 text-[10px] rounded transition-colors',
                thinkingLevel === 'low'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              )}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => onThinkingLevelChange('high')}
              className={cn(
                'px-2 py-0.5 text-[10px] rounded transition-colors',
                thinkingLevel === 'high'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              )}
            >
              High
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Full mode — detailed tier cards
  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        Quality Mode
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {MODEL_TIERS.map((tier) => {
          const Icon = ICON_MAP[tier.id] || Zap
          const isSelected = modelTier === tier.id
          const isDisabled = tier.comingSoon
          return (
            <div
              key={tier.id}
              onClick={() => !isDisabled && onModelTierChange(tier.id)}
              className={cn(
                'p-3 rounded-lg border transition-all relative',
                isDisabled
                  ? 'border-slate-700/50 bg-slate-800/30 cursor-not-allowed opacity-60'
                  : isSelected
                    ? tier.color === 'emerald' ? 'border-emerald-500 bg-emerald-500/10 cursor-pointer'
                    : tier.color === 'purple' ? 'border-purple-500 bg-purple-500/10 cursor-pointer'
                    : 'border-amber-500 bg-amber-500/10 cursor-pointer'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 cursor-pointer'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  tier.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400'
                  : tier.color === 'purple' ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-amber-500/20 text-amber-400'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{tier.name}</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      tier.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300'
                      : tier.color === 'purple' ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-amber-500/20 text-amber-300'
                    )}>
                      {tier.description}
                    </span>
                    {tier.comingSoon && (
                      <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/50">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{tier.details}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                    <span>{tier.model}</span>
                    <span>•</span>
                    <span>{tier.resolution}</span>
                    <span>•</span>
                    <span>{tier.cost}</span>
                  </div>
                </div>
                {isSelected && !isDisabled && (
                  <Check className={cn(
                    'w-5 h-5',
                    tier.color === 'emerald' ? 'text-emerald-400'
                    : tier.color === 'purple' ? 'text-purple-400'
                    : 'text-amber-400'
                  )} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Thinking Level Control */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Thinking Level</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
            <button
              type="button"
              onClick={() => onThinkingLevelChange('low')}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                thinkingLevel === 'low'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              )}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => onThinkingLevelChange('high')}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                thinkingLevel === 'high'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              )}
            >
              High
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          {thinkingLevel === 'high'
            ? 'High thinking: Better for complex, multi-layered scenes. Takes longer but captures all details.'
            : 'Low thinking: Faster generation for simple prompts. Good for quick iterations.'}
        </p>
      </div>
    </div>
  )
}
