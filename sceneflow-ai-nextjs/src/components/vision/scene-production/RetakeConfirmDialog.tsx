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
import { AlertTriangle } from 'lucide-react'

interface RetakeConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/**
 * Confirmation before opening the generator or uploading on a beat that already has a take.
 */
export function RetakeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: RetakeConfirmDialogProps) {
  const t = useTranslations('production.retake')
  const tCommon = useTranslations('common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-amber-900/40 bg-gray-950 text-gray-100">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-500/40">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="space-y-1 text-left">
              <DialogTitle className="text-lg text-white">{t('title')}</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                {t('description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-700 text-gray-200 hover:bg-gray-800"
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {t('continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
