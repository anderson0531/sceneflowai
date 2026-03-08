'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Drama, ChevronDown, ChevronUp } from 'lucide-react'
import type { TalentDirectionProps } from './types'

/**
 * Unified talent direction section for image generation dialogs.
 * Features:
 * - Blocking position (static position for still images)
 * - Emotional beat
 * - Key props in hand
 * - Collapsible (default collapsed in FramePromptDialog)
 */
export function TalentDirectionSection({
  talentDirection,
  onTalentDirectionChange,
  defaultCollapsed = false,
  className,
}: TalentDirectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Drama className="w-4 h-4 text-cyan-400" />
        <h4 className="text-sm font-medium text-slate-200 flex-1">Talent Direction</h4>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {!isCollapsed && (
        <div className="space-y-3 pt-1">
          <div>
            <Label className="text-xs text-slate-400">Talent Blocking / Position</Label>
            <Input
              value={talentDirection.talentBlocking}
              onChange={(e) => onTalentDirectionChange({ talentBlocking: e.target.value })}
              placeholder="e.g., Character stands center-frame, facing camera"
              className="mt-1 bg-slate-900 border-slate-700 text-sm"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Static position only — motion is stripped for still images.
            </p>
          </div>
          <div>
            <Label className="text-xs text-slate-400">Emotional Beat</Label>
            <Input
              value={talentDirection.emotionalBeat}
              onChange={(e) => onTalentDirectionChange({ emotionalBeat: e.target.value })}
              placeholder="e.g., Conflicted determination"
              className="mt-1 bg-slate-900 border-slate-700 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Key Props in Hand</Label>
            <Input
              value={talentDirection.keyProps}
              onChange={(e) => onTalentDirectionChange({ keyProps: e.target.value })}
              placeholder="e.g., Holding a crumpled letter"
              className="mt-1 bg-slate-900 border-slate-700 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
