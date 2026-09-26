'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Trash2, Clock, Film } from 'lucide-react'
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

export interface DeleteSegmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segmentIndex: number
  segmentDuration: number
  hasFrames: boolean
  totalBeats: number
  onConfirm: () => void
  isDeleting?: boolean
}

// ============================================================================
// DeleteSegmentDialog Component
// ============================================================================

export function DeleteSegmentDialog({
  open,
  onOpenChange,
  segmentIndex,
  segmentDuration,
  hasFrames,
  totalBeats,
  onConfirm,
  isDeleting = false
}: DeleteSegmentDialogProps) {
  const t = useTranslations('production.segments')
  const tc = useTranslations('common')
  const isLastBeat = totalBeats === 1
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            {t('delete.title', { number: segmentIndex + 1 })}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {t('delete.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Beat Info */}
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Film className="w-4 h-4" />
                {t('delete.segmentLabel')}
              </span>
              <span className="text-white font-medium">
                {t('delete.segmentOf', { index: segmentIndex + 1, total: totalBeats })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('delete.duration')}
              </span>
              <span className="text-white font-medium">{segmentDuration.toFixed(1)}s</span>
            </div>
            {hasFrames && (
              <div className="text-amber-400 text-xs flex items-center gap-2 pt-2 border-t border-slate-700">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t('delete.hasFramesWarning')}
              </div>
            )}
          </div>
          
          {/* Impact Warning */}
          <div className={cn(
            "rounded-lg p-3 text-sm",
            isLastBeat 
              ? "bg-red-500/10 border border-red-500/30 text-red-300"
              : "bg-amber-500/10 border border-amber-500/30 text-amber-300"
          )}>
            {isLastBeat ? (
              <p>{t('delete.lastBeatWarning')}</p>
            ) : (
              <p>{t('delete.shiftWarning')}</p>
            )}
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            {tc('actions.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {t('delete.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete.deleteBeat')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteSegmentDialog
