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
import { MapPin } from 'lucide-react'
import {
  TIME_OF_DAY_OPTIONS,
  WEATHER_OPTIONS,
  ATMOSPHERE_OPTIONS,
} from './constants'
import type { SectionProps, VisualSetup } from './types'

interface LocationSettingSectionProps extends SectionProps {
  visualSetup: VisualSetup
  onVisualSetupChange: (update: Partial<VisualSetup>) => void
}

/**
 * Unified location & setting section for image generation dialogs.
 * Features:
 * - Location text input
 * - Time of Day, Weather, Atmosphere dropdowns
 * - Standardized options (overcast not cloudy, consistent atmosphere order)
 */
export function LocationSettingSection({
  visualSetup,
  onVisualSetupChange,
  className,
}: LocationSettingSectionProps) {
  const update = (field: string, value: string) => {
    onVisualSetupChange({ [field]: value })
  }

  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-cyan-400" />
        Location & Setting
      </h4>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-slate-400">Location/Setting</Label>
          <Input
            value={visualSetup.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="e.g., Modern apartment living room"
            className="mt-1 bg-slate-900 border-slate-700 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-400">Time of Day</Label>
            <Select value={visualSetup.timeOfDay} onValueChange={(v) => update('timeOfDay', v)}>
              <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OF_DAY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Weather</Label>
            <Select value={visualSetup.weather} onValueChange={(v) => update('weather', v)}>
              <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEATHER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-400">Atmosphere/Mood</Label>
          <Select value={visualSetup.atmosphere} onValueChange={(v) => update('atmosphere', v)}>
            <SelectTrigger className="mt-1 bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATMOSPHERE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
