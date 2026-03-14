'use client'

/**
 * SegmentSyncStatusBar - Tri-color visual overlay for LML elastic segment status
 * 
 * Shows at-a-glance sync status for each segment in a language:
 * - Blue: Base duration (8s) — audio fits within video
 * - Gray: Smart Padding (≤0.3s overrun) — minor hold, no visual effect
 * - Yellow: Freeze Extension (>0.3s overrun) — freeze-frame + Ken Burns
 * 
 * Integrated into SceneTimelineV2 below the video track.
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { SceneLMLAnalysis, SegmentDynamicsResult, SegmentDynamicsMode } from './types'

// ============================================================================
// Constants
// ============================================================================

const SYNC_STATUS_COLORS: Record<SegmentDynamicsMode, { bg: string; border: string; label: string; textColor: string }> = {
  'EXACT': {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    label: 'Base',
    textColor: 'text-blue-400',
  },
  'SMART_PAD': {
    bg: 'bg-gray-400/20',
    border: 'border-gray-400/40',
    label: 'Pad',
    textColor: 'text-gray-400',
  },
  'FREEZE_EXTEND': {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/40',
    label: 'Freeze',
    textColor: 'text-yellow-400',
  },
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SegmentSyncChipProps {
  dynamics: SegmentDynamicsResult
  totalDuration: number
  pixelsPerSecond: number
  isCompact?: boolean
}

function SegmentSyncChip({ dynamics, totalDuration, pixelsPerSecond, isCompact = false }: SegmentSyncChipProps) {
  const colors = SYNC_STATUS_COLORS[dynamics.mode]
  const baseWidth = dynamics.baseDuration * pixelsPerSecond
  const extensionWidth = dynamics.extension * pixelsPerSecond
  const totalWidth = baseWidth + extensionWidth
  
  return (
    <div
      className={cn(
        'relative flex items-center border-r border-gray-700/50',
        'transition-all duration-200',
      )}
      style={{ width: `${totalWidth}px`, minWidth: '20px' }}
      title={`Segment ${dynamics.segmentIndex + 1}: ${dynamics.mode} | Base: ${dynamics.baseDuration.toFixed(1)}s | Extension: ${dynamics.extension.toFixed(2)}s | Total: ${dynamics.displayDuration.toFixed(1)}s`}
    >
      {/* Base duration portion (Blue) */}
      <div
        className={cn(
          'h-full bg-blue-500/20 border-blue-500/30',
          'flex items-center justify-center',
        )}
        style={{ width: `${baseWidth}px` }}
      >
        {!isCompact && baseWidth > 30 && (
          <span className="text-[9px] text-blue-400/70 font-mono truncate px-0.5">
            {dynamics.baseDuration.toFixed(1)}s
          </span>
        )}
      </div>
      
      {/* Extension portion (Gray for SMART_PAD, Yellow for FREEZE_EXTEND) */}
      {dynamics.extension > 0 && (
        <div
          className={cn(
            'h-full flex items-center justify-center',
            dynamics.mode === 'FREEZE_EXTEND' 
              ? 'bg-yellow-500/30 border-l border-yellow-500/50' 
              : 'bg-gray-400/30 border-l border-gray-400/50',
          )}
          style={{ width: `${extensionWidth}px`, minWidth: '2px' }}
        >
          {!isCompact && extensionWidth > 25 && (
            <span className={cn(
              'text-[9px] font-mono truncate px-0.5',
              dynamics.mode === 'FREEZE_EXTEND' ? 'text-yellow-400/80' : 'text-gray-400/80',
            )}>
              +{dynamics.extension.toFixed(1)}s
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface SegmentSyncStatusBarProps {
  /** LML analysis for the current language (null if baseline/no analysis) */
  lmlAnalysis: SceneLMLAnalysis | null
  /** Pixels per second for timeline scaling */
  pixelsPerSecond: number
  /** Whether to show in compact mode (less text) */
  compact?: boolean
  /** Optional className for outer container */
  className?: string
}

export function SegmentSyncStatusBar({
  lmlAnalysis,
  pixelsPerSecond,
  compact = false,
  className,
}: SegmentSyncStatusBarProps) {
  // Don't render if no analysis (baseline language)
  if (!lmlAnalysis) return null
  
  // Don't render if all segments are EXACT (no extensions needed)
  if (!lmlAnalysis.hasFreeze && lmlAnalysis.modeCounts['SMART_PAD'] === 0) return null
  
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Status Bar Label */}
      <div className="flex items-center gap-2 px-2 py-0.5">
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          Sync Status
        </span>
        
        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-blue-500/40" />
            <span className="text-[9px] text-gray-500">Base</span>
          </div>
          {lmlAnalysis.modeCounts['SMART_PAD'] > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-gray-400/40" />
              <span className="text-[9px] text-gray-500">Pad ≤0.3s</span>
            </div>
          )}
          {lmlAnalysis.modeCounts['FREEZE_EXTEND'] > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-yellow-500/40" />
              <span className="text-[9px] text-gray-500">Freeze &gt;0.3s</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Sync Bar */}
      <div className="flex h-4 rounded overflow-hidden border border-gray-700/30 bg-gray-900/50">
        {lmlAnalysis.segmentDynamics.map((dynamics) => (
          <SegmentSyncChip
            key={dynamics.segmentIndex}
            dynamics={dynamics}
            totalDuration={lmlAnalysis.totalDuration}
            pixelsPerSecond={pixelsPerSecond}
            isCompact={compact}
          />
        ))}
      </div>
      
      {/* Summary line */}
      <div className="flex items-center gap-2 px-2 py-0.5">
        <span className="text-[9px] text-gray-600">
          {lmlAnalysis.language.toUpperCase()} • 
          Total: {lmlAnalysis.totalDuration.toFixed(1)}s 
          (+{lmlAnalysis.totalExtension.toFixed(1)}s extended)
        </span>
        {lmlAnalysis.hasFreeze && (
          <span className="text-[9px] text-yellow-500/70">
            ⚠ {lmlAnalysis.modeCounts['FREEZE_EXTEND']} segment{lmlAnalysis.modeCounts['FREEZE_EXTEND'] > 1 ? 's' : ''} need freeze-frame
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Compact Inline Variant (for segment cards or tooltips)
// ============================================================================

interface SegmentSyncBadgeProps {
  mode: SegmentDynamicsMode
  extension: number
  className?: string
}

export function SegmentSyncBadge({ mode, extension, className }: SegmentSyncBadgeProps) {
  if (mode === 'EXACT') return null
  
  const colors = SYNC_STATUS_COLORS[mode]
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
      colors.bg, colors.textColor,
      'border', colors.border,
      className,
    )}>
      {mode === 'FREEZE_EXTEND' && (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
      )}
      {colors.label} +{extension.toFixed(1)}s
    </span>
  )
}
