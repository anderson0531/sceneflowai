'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Clock, Film, Image as ImageIcon, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface RegenerateSegmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalSegments: number
  totalDuration: number
  anchoredCount: number
  hasGeneratedAssets: boolean
  onConfirm: () => void
}

// ============================================================================
// RegenerateSegmentsDialog Component
// ============================================================================

export function RegenerateSegmentsDialog({
  open,
  onOpenChange,
  totalSegments,
  totalDuration,
  anchoredCount,
  hasGeneratedAssets,
  onConfirm,
}: RegenerateSegmentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <RefreshCw className="w-5 h-5" />
            Regenerate Segments
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Clear all segments and return to the Segment Builder to start fresh.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Current Segments Summary */}
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Segments
              </span>
              <span className="text-white font-medium">{totalSegments}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Total Duration
              </span>
              <span className="text-white font-medium">{totalDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Anchored Frames
              </span>
              <span className="text-white font-medium">{anchoredCount} / {totalSegments}</span>
            </div>
          </div>
          
          {/* Impact Warning */}
          <div className={cn(
            "rounded-lg p-3 text-sm",
            hasGeneratedAssets
              ? "bg-red-500/10 border border-red-500/30 text-red-300"
              : "bg-amber-500/10 border border-amber-500/30 text-amber-300"
          )}>
            {hasGeneratedAssets ? (
              <p className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Warning:</strong> This will delete all segments including 
                  generated keyframes and video assets. This action cannot be undone.
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  All current segments will be removed. You&apos;ll be taken to the 
                  Segment Builder to configure and regenerate with new settings.
                </span>
              </p>
            )}
          </div>

          {/* What happens next */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 text-sm text-cyan-300/80">
            <p className="flex items-start gap-2">
              <Film className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-400" />
              <span>
                The Segment Builder will open with controls for total duration, 
                segment count, focus mode, and custom direction.
              </span>
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            variant={hasGeneratedAssets ? 'destructive' : 'default'}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className={hasGeneratedAssets 
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-cyan-600 hover:bg-cyan-700 text-white"
            }
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {hasGeneratedAssets ? 'Delete & Regenerate' : 'Regenerate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RegenerateSegmentsDialog
