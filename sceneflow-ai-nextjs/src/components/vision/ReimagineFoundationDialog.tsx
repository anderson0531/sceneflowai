'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Palette, Monitor } from 'lucide-react'
import { getArtStylePresetName } from '@/lib/treatment/blueprintFoundation'

export type ReimagineFoundationField = 'artStyle' | 'aspectRatio'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: ReimagineFoundationField
  currentArtStyle?: string
  currentAspectRatio?: string
  onConfirm: () => void
}

export function ReimagineFoundationDialog({
  open,
  onOpenChange,
  field,
  currentArtStyle,
  currentAspectRatio,
  onConfirm,
}: Props) {
  const t = useTranslations('production.foundation.reimagine')
  const tc = useTranslations('common.actions')

  const title =
    field === 'artStyle' ? t('changeArtStyleTitle') : t('changeAspectRatioTitle')
  const description =
    field === 'artStyle'
      ? t('changeArtStyleDescription')
      : t('changeAspectRatioDescription')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-lg border border-amber-600/30 bg-amber-900/20 p-3 text-amber-100">
            <p className="font-medium mb-2">{t('loseEditsTitle')}</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90">
              <li>{t('loseScriptTweaks')}</li>
              <li>{t('loseStoryboard')}</li>
              <li>{t('loseBeatAdjustments')}</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-2">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Palette className="w-3 h-3" /> {t('artStyle')}
              </div>
              <div className="text-gray-200">
                {getArtStylePresetName(currentArtStyle || 'photorealistic')}
              </div>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-2">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Monitor className="w-3 h-3" /> {t('aspectRatio')}
              </div>
              <div className="text-gray-200">{currentAspectRatio || '16:9'}</div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {t('reimagineInBlueprint')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
