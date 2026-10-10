'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  PublishingPromoTab,
  type PublishingPromoTabProps,
} from './PublishingPromoTab'

export interface PromoStudioDialogProps extends PublishingPromoTabProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Promo authoring, separate from Publish. The tab body is unchanged. */
export function PromoStudioDialog({
  open,
  onOpenChange,
  ...tabProps
}: PromoStudioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-gray-700/50">
          <DialogTitle className="text-lg font-semibold text-white">Promo</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6 flex flex-col gap-3">
          <PublishingPromoTab {...tabProps} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
