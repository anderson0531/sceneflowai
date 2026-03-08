'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Box, Check, AlertCircle } from 'lucide-react'
import type { PropSelectionProps } from './types'

/**
 * Unified prop/object selection section for image generation dialogs.
 * Features:
 * - Responsive 4-column grid with image thumbnails
 * - Auto-detected "Suggested" badges from scene text
 * - Critical/secondary importance badges
 * - "Select Suggested" / "Unselect All" convenience buttons
 * - Warning when > 5 objects selected
 */
export function PropSelectionSection({
  objectReferences,
  selectedObjectIds,
  onSelectionChange,
  autoDetectedObjectIds,
  className,
}: PropSelectionProps) {
  if (objectReferences.length === 0) return null

  const toggleObject = (id: string) => {
    onSelectionChange(
      selectedObjectIds.includes(id)
        ? selectedObjectIds.filter(oid => oid !== id)
        : [...selectedObjectIds, id]
    )
  }

  const selectSuggested = () => {
    if (!autoDetectedObjectIds) return
    const suggestedIds = objectReferences
      .filter(obj => autoDetectedObjectIds.has(obj.id))
      .map(obj => obj.id)
    onSelectionChange(suggestedIds)
  }

  const unselectAll = () => {
    onSelectionChange([])
  }

  const hasSuggestions = autoDetectedObjectIds && autoDetectedObjectIds.size > 0

  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <Box className="w-4 h-4 text-cyan-400" />
          Props & Objects
        </h4>
        {/* Convenience buttons */}
        <div className="flex items-center gap-2">
          {hasSuggestions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={selectSuggested}
              className="h-6 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-2"
            >
              Select Suggested
            </Button>
          )}
          {selectedObjectIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={unselectAll}
              className="h-6 text-[10px] text-slate-400 hover:text-slate-300 px-2"
            >
              Unselect All
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400">Select objects to include for visual consistency</p>

      {/* Warning for too many selections */}
      {selectedObjectIds.length > 5 && (
        <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            You've selected {selectedObjectIds.length} objects. For best results, limit to 5 or fewer key props.
          </p>
        </div>
      )}

      {/* Object grid */}
      <div className="grid grid-cols-4 gap-2">
        {objectReferences.map((obj) => {
          const isSelected = selectedObjectIds.includes(obj.id)
          const isSuggested = autoDetectedObjectIds?.has(obj.id) ?? false

          return (
            <button
              key={obj.id}
              type="button"
              onClick={() => toggleObject(obj.id)}
              className={cn(
                'relative aspect-square rounded-lg border cursor-pointer transition-all overflow-hidden',
                isSelected
                  ? 'border-purple-500 ring-2 ring-purple-500/50'
                  : 'border-slate-700 hover:border-slate-600'
              )}
              title={obj.description || obj.name}
            >
              {obj.imageUrl ? (
                <img
                  src={obj.imageUrl}
                  alt={obj.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                  <Box className="w-6 h-6 text-slate-500" />
                </div>
              )}
              {/* Name overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                <div className="text-[10px] text-white truncate font-medium">{obj.name}</div>
              </div>
              {/* Selection check */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              {/* Importance badge */}
              {obj.importance === 'critical' && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500/90 rounded text-[9px] text-white font-medium">
                  Critical
                </div>
              )}
              {/* Suggested badge */}
              {isSuggested && !isSelected && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-cyan-500/90 rounded text-[9px] text-white font-medium">
                  ✓ Suggested
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-slate-500">
        Selected objects will be included for visual consistency in the generated image.
      </p>
    </div>
  )
}
