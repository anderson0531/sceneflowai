'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader, MapPin, Zap } from 'lucide-react'
import type { LocationReference } from '@/types/visionReferences'
import {
  estimateReferenceExpress,
  formatReferenceExpressEstimate,
} from '@/lib/vision/referenceExpress/estimate'
import {
  locationAgentChecklist,
  locationAgentSceneNumbers,
  withRequiredBaseStill,
  type LocationAgentChecklistRow,
  type LocationAgentScopeMode,
} from '@/lib/vision/locationAgentSelection'

export interface LocationAgentConfirmSelection {
  itemKeys: string[]
  locationIds: string[]
}

interface LocationAgentConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: LocationReference[]
  isRunning?: boolean
  onConfirm: (selection: LocationAgentConfirmSelection) => void
}

function sceneLabel(numbers: number[], format: (scene: number) => string): string {
  const unique = [...new Set(numbers.filter((scene) => scene > 0))].sort((a, b) => a - b)
  if (unique.length === 0) return ''
  return unique.map(format).join(', ')
}

export function LocationAgentConfirmDialog({
  open,
  onOpenChange,
  locations,
  isRunning = false,
  onConfirm,
}: LocationAgentConfirmDialogProps) {
  const t = useTranslations('production.locationAgent')
  const tCommon = useTranslations('common')
  const [mode, setMode] = useState<LocationAgentScopeMode>('needs-action')
  const [sceneNumber, setSceneNumber] = useState<number | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  const sceneNumbers = useMemo(() => locationAgentSceneNumbers(locations), [locations])
  const rows = useMemo(
    () => locationAgentChecklist(locations, { sceneNumber, mode }),
    [locations, sceneNumber, mode]
  )
  const rowSignature = rows.map((row) => `${row.key}:${row.hasImage ? 1 : 0}:${row.needsImageRegen ? 1 : 0}`).join('|')

  useEffect(() => {
    if (!open) return
    setMode('needs-action')
    setSceneNumber(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    setSelectedKeys(rows.map((row) => row.key))
  }, [open, mode, sceneNumber, rowSignature, rows])

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const groups = useMemo(() => {
    const order: string[] = []
    const byLocation = new Map<string, LocationAgentChecklistRow[]>()
    for (const row of rows) {
      const list = byLocation.get(row.locationId)
      if (list) list.push(row)
      else {
        order.push(row.locationId)
        byLocation.set(row.locationId, [row])
      }
    }
    return order.map((locationId) => ({
      locationId,
      name: byLocation.get(locationId)?.[0]?.locationName || 'Location',
      rows: byLocation.get(locationId) || [],
    }))
  }, [rows])

  const estimate = useMemo(
    () =>
        estimateReferenceExpress(selectedKeys.map(() => ({ kind: 'location' as const }))),
    [selectedKeys]
  )

  const toggleRow = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => withRequiredBaseStill(prev, rows, key, checked))
  }

  const toggleLocation = (locationRows: LocationAgentChecklistRow[], checked: boolean) => {
    setSelectedKeys((prev) => {
      const keys = new Set(prev)
      for (const row of locationRows) {
        if (checked) keys.add(row.key)
        else keys.delete(row.key)
      }
      if (checked) {
        const base = locationRows.find((row) => !row.versionId) ?? locationRows[0]
        if (base?.baseMissing) keys.add(base.baseKey)
      }
      return [...keys]
    })
  }

  const confirm = () => {
    const selectedRows = rows.filter((row) => selectedSet.has(row.key))
    const locationIds = [...new Set(selectedRows.map((row) => row.locationId))]
    for (const row of rows) {
      if (row.baseMissing && selectedSet.has(row.key) && !locationIds.includes(row.locationId)) {
        locationIds.push(row.locationId)
      }
    }
    const extraBaseIds = rows
      .filter((row) => row.baseMissing && selectedSet.has(row.baseKey))
      .map((row) => row.locationId)
    onConfirm({
      itemKeys: selectedKeys,
      locationIds: [...new Set([...locationIds, ...extraBaseIds])],
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            <Zap className="w-5 h-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('scope')}
            </p>
            <div className="inline-flex rounded-md border border-amber-600/40 overflow-hidden">
              {(['needs-action', 'regenerate'] as LocationAgentScopeMode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setMode(value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    mode === value
                      ? 'bg-amber-600 text-white'
                      : 'bg-transparent text-amber-200/80 hover:bg-amber-900/30'
                  }`}
                >
                  {value === 'regenerate' ? t('scopeRegenerate') : t('scopeNeedsAction')}
                </button>
              ))}
            </div>
            {mode === 'regenerate' && (
              <p className="text-[11px] text-amber-200/70 mt-2">{t('scopeRegenerateHint')}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 block" htmlFor="location-agent-scene">
              {t('scene')}
            </label>
            <select
              id="location-agent-scene"
              disabled={isRunning}
              value={sceneNumber ?? ''}
              onChange={(event) => {
                const value = event.target.value
                setSceneNumber(value ? Number(value) : null)
              }}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-gray-100 disabled:opacity-50"
            >
              <option value="">{t('sceneAll')}</option>
              {sceneNumbers.map((number) => (
                <option key={number} value={number}>
                  {t('sceneNumber', { number })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('stills')}
            </p>
            {locations.length === 0 ? (
              <p className="text-xs text-gray-500">{t('noLocations')}</p>
            ) : rows.length === 0 ? (
              <p className="text-xs text-gray-500">{t('filterEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const allChecked = group.rows.every((row) => selectedSet.has(row.key))
                  return (
                    <div key={group.locationId} className="rounded-md border border-gray-800">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-950/80">
                        <Checkbox
                          checked={allChecked}
                          disabled={isRunning}
                          onCheckedChange={(checked) => toggleLocation(group.rows, checked)}
                        />
                        <MapPin className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                        <span className="text-sm text-gray-100 truncate">{group.name}</span>
                      </div>
                      <div className="divide-y divide-gray-800">
                        {group.rows.map((row) => {
                          const scenes = sceneLabel(row.sceneNumbers, (scene) =>
                            t('sceneNumber', { number: scene })
                          )
                          return (
                            <div
                              key={row.key}
                              className="flex items-start gap-2 px-2 py-1.5 pl-8"
                            >
                              <Checkbox
                                checked={selectedSet.has(row.key)}
                                disabled={isRunning}
                                onCheckedChange={(checked) => toggleRow(row.key, checked)}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-sm text-gray-100">
                                  <span className="truncate">
                                    {row.versionId ? row.name : t('base')}
                                  </span>
                                  {scenes ? (
                                    <span className="text-[10px] text-cyan-300/80 shrink-0">{scenes}</span>
                                  ) : null}
                                </span>
                                {row.versionId && row.baseMissing ? (
                                  <span className="block text-[10px] text-amber-200/80 mt-0.5">
                                    {t('drawnFromBase')}
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {selectedKeys.length > 0 && (
              <p className="text-[11px] text-amber-300/70 mt-2">
                {formatReferenceExpressEstimate(estimate)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={isRunning || selectedKeys.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t('running')}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {t('confirm', { count: selectedKeys.length })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
