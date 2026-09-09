'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import type {
  ProposedReferenceAsset,
  ReferenceReconcileManifest,
} from '@/types/referenceLibrary'

export interface ReferenceReconcileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  seriesId?: string
  proposed: ProposedReferenceAsset[]
  onConfirmed?: (result: { linkedAssetIds: string[]; createdAssetIds: string[] }) => void
}

export function ReferenceReconcileDialog({
  open,
  onOpenChange,
  projectId,
  seriesId,
  proposed,
  onConfirmed,
}: ReferenceReconcileDialogProps) {
  const t = useTranslations('production.foundation.referenceLibrary')
  const [manifest, setManifest] = useState<ReferenceReconcileManifest | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reuseChecked, setReuseChecked] = useState<Record<string, boolean>>({})
  const [createChecked, setCreateChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open || proposed.length === 0) return

    setLoading(true)
    fetch('/api/reference-library/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposed, projectId, seriesId, mode: 'preview' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.manifest) {
          setManifest(data.manifest)
          const reuse: Record<string, boolean> = {}
          for (const entry of data.manifest.reuse) {
            reuse[entry.proposed.tempId] = true
          }
          setReuseChecked(reuse)
          const create: Record<string, boolean> = {}
          for (const item of data.manifest.create) {
            create[item.tempId] = true
          }
          setCreateChecked(create)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, proposed, projectId, seriesId])

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const confirmedReuseIds = Object.entries(reuseChecked)
        .filter(([, v]) => v)
        .map(([k]) => k)
      const confirmedCreateTempIds = Object.entries(createChecked)
        .filter(([, v]) => v)
        .map(([k]) => k)

      const res = await fetch('/api/reference-library/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed,
          projectId,
          seriesId,
          confirmedReuseIds,
          confirmedCreateTempIds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onConfirmed?.(data.result)
        onOpenChange(false)
      }
    } catch (err) {
      console.error('[ReferenceReconcileDialog] confirm failed:', err)
    } finally {
      setConfirming(false)
    }
  }

  const reuseCount = manifest?.reuse.length ?? 0
  const createCount = manifest?.create.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('reconcileTitle')}</DialogTitle>
          <DialogDescription>{t('reconcileDescription')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('matchingLibrary')}
          </div>
        ) : manifest ? (
          <div className="space-y-4 max-h-64 overflow-y-auto text-sm">
            {reuseCount > 0 && (
              <div>
                <p className="font-medium mb-2">{t('reuseExisting', { count: reuseCount })}</p>
                <ul className="space-y-2">
                  {manifest.reuse.map((entry) => (
                    <li key={entry.proposed.tempId} className="flex items-start gap-2">
                      <Checkbox
                        id={`reuse-${entry.proposed.tempId}`}
                        checked={reuseChecked[entry.proposed.tempId] ?? true}
                        onCheckedChange={(v) =>
                          setReuseChecked((prev) => ({
                            ...prev,
                            [entry.proposed.tempId]: v === true,
                          }))
                        }
                      />
                      <label htmlFor={`reuse-${entry.proposed.tempId}`} className="text-xs leading-snug">
                        <span className="text-foreground">{entry.proposed.name}</span>
                        <span className="text-muted-foreground"> → {entry.libraryAssetName}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {createCount > 0 && (
              <div>
                <p className="font-medium mb-2">{t('createNew', { count: createCount })}</p>
                <ul className="space-y-2">
                  {manifest.create.map((item) => (
                    <li key={item.tempId} className="flex items-start gap-2">
                      <Checkbox
                        id={`create-${item.tempId}`}
                        checked={createChecked[item.tempId] ?? true}
                        onCheckedChange={(v) =>
                          setCreateChecked((prev) => ({
                            ...prev,
                            [item.tempId]: v === true,
                          }))
                        }
                      />
                      <label htmlFor={`create-${item.tempId}`} className="text-xs">
                        {item.name}
                        <span className="text-muted-foreground ml-1">({item.kind})</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reuseCount === 0 && createCount === 0 && (
              <p className="text-muted-foreground text-xs">{t('noAssetsToReconcile')}</p>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading || confirming || !manifest}>
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('applying')}
              </>
            ) : (
              t('confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
