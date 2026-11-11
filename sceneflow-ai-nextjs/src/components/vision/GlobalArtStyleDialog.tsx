'use client'

import React, { useState } from 'react'
import { AlertTriangle, Palette, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { ArtStyleDirectorField } from '@/components/art-style/ArtStyleDirectorField'
import type { ArtStyleSpec, ArtStyleStoryContext } from '@/lib/artStyle/globalArtStyle'

interface GlobalArtStyleDialogProps {
  open: boolean
  onClose: () => void
  artStyle: string
  artStyleSpec?: ArtStyleSpec | null
  storyContext?: ArtStyleStoryContext
  lockedBySeries?: {
    seriesId: string
    seriesTitle?: string
  } | null
  existingReferenceCount?: number
  onSaveGlobalArtStyle: (artStyle: string, spec: ArtStyleSpec) => Promise<void>
  onSyncFromSeriesBible?: () => Promise<void>
}

export function GlobalArtStyleDialog({
  open,
  onClose,
  artStyle,
  artStyleSpec,
  storyContext,
  lockedBySeries,
  existingReferenceCount = 0,
  onSaveGlobalArtStyle,
  onSyncFromSeriesBible,
}: GlobalArtStyleDialogProps) {
  const [draftArtStyle, setDraftArtStyle] = useState(artStyle)
  const [draftSpec, setDraftSpec] = useState<ArtStyleSpec | null | undefined>(artStyleSpec)
  const [isSyncingBible, setIsSyncingBible] = useState(false)

  React.useEffect(() => {
    if (open) {
      setDraftArtStyle(artStyle)
      setDraftSpec(artStyleSpec)
    }
  }, [open, artStyle, artStyleSpec])

  const handleSyncBible = async () => {
    if (!onSyncFromSeriesBible || isSyncingBible) return
    setIsSyncingBible(true)
    try {
      await onSyncFromSeriesBible()
      onClose()
    } finally {
      setIsSyncingBible(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <Palette className="h-5 w-5 text-cyan-400" />
            Production Global Art Style
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {lockedBySeries
              ? 'This episode inherits the locked Global Art Style from its Series Continuity Library.'
              : 'Direct and lock the Global Art Style driving Continuity References (Cast, Locations, Props), Stills, and Video Clips.'}
          </DialogDescription>
        </DialogHeader>

        {!lockedBySeries && existingReferenceCount > 0 ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Continuity Reference Consistency Note:</span> This project already has{' '}
              <strong>{existingReferenceCount}</strong> generated reference image
              {existingReferenceCount === 1 ? '' : 's'}. Changing the Global Art Style automatically clears cached Lookbook styling and updates all future generations; regenerate existing Cast, Location, and Prop reference plates if switching mediums (e.g. Live-Action ↔ Animation) so pixel references match.
            </div>
          </div>
        ) : null}

        <ArtStyleDirectorField
          artStyle={draftArtStyle}
          artStyleSpec={draftSpec}
          onArtStyleChange={(nextStyle, nextSpec) => {
            setDraftArtStyle(nextStyle)
            setDraftSpec(nextSpec)
          }}
          onConfirmSave={async (confirmedStyle, confirmedSpec) => {
            await onSaveGlobalArtStyle(confirmedStyle, confirmedSpec)
            onClose()
          }}
          storyContext={storyContext}
          lockedBySeries={lockedBySeries}
          scopeLabel="production"
          surface="slate"
        />

        {lockedBySeries && onSyncFromSeriesBible ? (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleSyncBible}
              disabled={isSyncingBible}
              className="border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncingBible ? 'animate-spin' : ''}`} />
              {isSyncingBible ? 'Syncing Series Bible…' : 'Sync Latest from Series Bible'}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
