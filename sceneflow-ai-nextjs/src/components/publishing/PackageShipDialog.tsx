'use client'

import React from 'react'
import { Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  PublishingPackageShipTab,
  type PublishingPackageShipTabProps,
} from './PublishingPackageShipTab'
import type { PublishAspectRatio, PublishUnitKind } from '@/lib/publish/publishUnits'

export interface PackageShipTarget {
  kind: PublishUnitKind
  language?: string
  sceneId?: string
  beatIndex?: number
  aspectRatio?: PublishAspectRatio
}

export interface PackageShipDialogProps
  extends Omit<
    PublishingPackageShipTabProps,
    | 'initialKind'
    | 'initialLanguage'
    | 'initialSceneId'
    | 'initialBeatIndex'
    | 'initialAspectRatio'
  > {
  open: boolean
  onOpenChange: (open: boolean) => void
  target?: PackageShipTarget | null
}

/**
 * Focused Package & Ship dialog launched directly from any ready deliverable
 * (Pre-Vis, Scene, Chapter, Master, or Promo) inside Production Streams.
 */
export function PackageShipDialog({
  open,
  onOpenChange,
  target,
  ...shipProps
}: PackageShipDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden bg-zinc-950 border-zinc-800">
        <DialogHeader className="px-6 pt-5 pb-3.5 shrink-0 border-b border-zinc-800/80">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Package className="h-4 w-4 text-violet-400" />
            Package &amp; Ship
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Connect your YouTube, Facebook, or TikTok account, generate thumbnails &amp; localized
            metadata across languages, and publish or download your ready deliverable.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col">
          <PublishingPackageShipTab
            {...shipProps}
            initialKind={target?.kind}
            initialLanguage={target?.language}
            initialSceneId={target?.sceneId}
            initialBeatIndex={target?.beatIndex}
            initialAspectRatio={target?.aspectRatio}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
