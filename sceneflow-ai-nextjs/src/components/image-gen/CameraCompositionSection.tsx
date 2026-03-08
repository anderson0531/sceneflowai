'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Camera, CheckCircle2 } from 'lucide-react'
import {
  SHOT_TYPE_OPTIONS,
  CAMERA_ANGLE_OPTIONS,
  LIGHTING_OPTIONS,
  LENS_OPTIONS,
} from './constants'
import type { CameraCompositionProps } from './types'

/**
 * Unified camera & composition section for image generation dialogs.
 * Features:
 * - Shot type with reference quality annotations (✓ Recommended / ⚠️ Limited / ❌ Too small)
 * - Camera angle selection
 * - Lighting selection
 * - Optional lens choice & lighting mood (extended mode for ScenePromptBuilder)
 */
export function CameraCompositionSection({
  visualSetup,
  onVisualSetupChange,
  hasCharacterReferences = false,
  showExtendedOptions = false,
  className,
}: CameraCompositionProps) {
  const update = (field: string, value: string) => {
    onVisualSetupChange({ [field]: value })
  }

  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
        <Camera className="w-4 h-4 text-cyan-400" />
        Camera & Composition
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Shot Type */}
        <div>
          <Label className="text-xs text-slate-400">Shot Type</Label>
          <Select value={visualSetup.shotType} onValueChange={(v) => update('shotType', v)}>
            <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHOT_TYPE_OPTIONS.map((opt) => {
                const refHint = hasCharacterReferences
                  ? opt.referenceQuality === 'recommended'
                    ? ' ✓ Recommended'
                    : opt.referenceQuality === 'limited'
                    ? ' ⚠️ Limited'
                    : ' ❌ Too small'
                  : ''
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-1">
                      {opt.label}
                      {hasCharacterReferences && (
                        <span className={cn(
                          'text-[10px] ml-1',
                          opt.referenceQuality === 'recommended' ? 'text-emerald-400' :
                          opt.referenceQuality === 'limited' ? 'text-amber-400' :
                          'text-red-400'
                        )}>
                          {refHint}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Camera Angle */}
        <div>
          <Label className="text-xs text-slate-400">Camera Angle</Label>
          <Select value={visualSetup.cameraAngle} onValueChange={(v) => update('cameraAngle', v)}>
            <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMERA_ANGLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lighting */}
      <div>
        <Label className="text-xs text-slate-400">Lighting</Label>
        <Select value={visualSetup.lighting} onValueChange={(v) => update('lighting', v)}>
          <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIGHTING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Extended options: Lens Choice + Lighting Mood */}
      {showExtendedOptions && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
          <div>
            <Label className="text-xs text-slate-400">Lens Choice</Label>
            <Select
              value={visualSetup.lensChoice || 'standard'}
              onValueChange={(v) => update('lensChoice', v)}
            >
              <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Lighting Mood</Label>
            <Input
              value={visualSetup.lightingMood || ''}
              onChange={(e) => update('lightingMood', e.target.value)}
              placeholder="e.g., warm amber tones"
              className="mt-1 bg-slate-900 border-slate-700 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
