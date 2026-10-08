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
import { Loader, MapPin, Package, Users, Zap } from 'lucide-react'
import {
  estimateReferenceExpress,
  formatReferenceExpressEstimate,
} from '@/lib/vision/referenceExpress/estimate'
import {
  libraryAgentChecklist,
  type LibraryAgentBaseKind,
  type LibraryAgentChecklistRow,
  type LibraryAgentScopeMode,
} from '@/lib/vision/libraryAgentSelection'

const KIND_ORDER: LibraryAgentBaseKind[] = ['cast', 'location', 'prop']

const KIND_ICON = {
  cast: Users,
  location: MapPin,
  prop: Package,
} as const

type LibraryAgentConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  characters: Array<{
    id?: string
    name?: string
    type?: string
    referenceImage?: string
    sceneNumbers?: number[]
  }>
  locations: Array<{
    id?: string
    location?: string
    locationDisplay?: string
    imageUrl?: string
    sceneNumbers?: number[]
  }>
  objects: Array<{
    id?: string
    name?: string
    imageUrl?: string
    sceneNumbers?: number[]
  }>
  isRunning?: boolean
  onConfirm: (itemKeys: string[]) => void
}

function sceneLabel(numbers: number[]): string {
  if (numbers.length === 0) return ''
  return numbers.map((scene) => `Scene ${scene}`).join(', ')
}

export function LibraryAgentConfirmDialog({
  open,
  onOpenChange,
  characters,
  locations,
  objects,
  isRunning = false,
  onConfirm,
}: LibraryAgentConfirmDialogProps) {
  const t = useTranslations('production.libraryAgent')
  const tCommon = useTranslations('common')
  const [mode, setMode] = useState<LibraryAgentScopeMode>('missing')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  const rows = useMemo(
    () =>
      libraryAgentChecklist(
        { characters, locations, props: objects },
        mode
      ),
    [characters, locations, objects, mode]
  )
  const rowSignature = rows.map((row) => row.key).join('|')

  useEffect(() => {
    if (!open) return
    setMode('missing')
  }, [open])

  useEffect(() => {
    if (!open) return
    setSelectedKeys(mode === 'missing' ? rows.map((row) => row.key) : [])
  }, [open, mode, rowSignature, rows])

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const groups = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({
        kind,
        rows: rows.filter((row) => row.kind === kind),
      })).filter((group) => group.rows.length > 0),
    [rows]
  )

  const estimate = useMemo(
    () =>
      estimateReferenceExpress(
        rows
          .filter((row) => selectedSet.has(row.key))
          .map((row) => ({ kind: row.kind }))
      ),
    [rows, selectedSet]
  )

  const toggleRow = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key]
      return prev.filter((id) => id !== key)
    })
  }

  const toggleGroup = (groupRows: LibraryAgentChecklistRow[], checked: boolean) => {
    setSelectedKeys((prev) => {
      const keys = new Set(prev)
      for (const row of groupRows) {
        if (checked) keys.add(row.key)
        else keys.delete(row.key)
      }
      return [...keys]
    })
  }

  const kindLabel = (kind: LibraryAgentBaseKind) => {
    if (kind === 'cast') return t('cast')
    if (kind === 'location') return t('locations')
    return t('objects')
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
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t('scope')}
              </p>
              {selectedKeys.length > 0 ? (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => setSelectedKeys([])}
                  className="text-[11px] text-gray-400 hover:text-gray-200 disabled:opacity-50"
                >
                  {t('clearSelections')}
                </button>
              ) : null}
            </div>
            <div className="inline-flex rounded-md border border-amber-600/40 overflow-hidden">
              {(['missing', 'regenerate'] as LibraryAgentScopeMode[]).map((value) => (
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
                  {value === 'regenerate' ? t('scopeRegenerate') : t('scopeMissing')}
                </button>
              ))}
            </div>
            {mode === 'regenerate' ? (
              <p className="text-[11px] text-amber-200/70 mt-2">{t('scopeRegenerateHint')}</p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('stills')}
            </p>
            {characters.length + locations.length + objects.length === 0 ? (
              <p className="text-xs text-gray-500">{t('noReferences')}</p>
            ) : rows.length === 0 ? (
              <p className="text-xs text-gray-500">{t('filterEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const Icon = KIND_ICON[group.kind]
                  const allChecked = group.rows.every((row) => selectedSet.has(row.key))
                  return (
                    <div key={group.kind} className="rounded-md border border-gray-800">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-950/80">
                        <Checkbox
                          checked={allChecked}
                          disabled={isRunning}
                          onCheckedChange={(checked) => toggleGroup(group.rows, checked === true)}
                        />
                        <Icon className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                        <span className="text-sm text-gray-100">{kindLabel(group.kind)}</span>
                        <span className="text-[10px] text-gray-500 tabular-nums">
                          {group.rows.length}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-800">
                        {group.rows.map((row) => {
                          const scenes = sceneLabel(row.sceneNumbers)
                          return (
                            <div key={row.key} className="flex items-start gap-2 px-2 py-1.5 pl-8">
                              <Checkbox
                                checked={selectedSet.has(row.key)}
                                disabled={isRunning}
                                onCheckedChange={(checked) => toggleRow(row.key, checked === true)}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-sm text-gray-100">
                                  <span className="truncate">{row.name}</span>
                                  {scenes ? (
                                    <span className="text-[10px] text-zinc-400 shrink-0">{scenes}</span>
                                  ) : null}
                                </span>
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
            {selectedKeys.length > 0 ? (
              <p className="text-[11px] text-amber-300/70 mt-2">
                {formatReferenceExpressEstimate(estimate)}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
            className="h-7 text-xs font-medium"
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(selectedKeys)}
            disabled={isRunning || selectedKeys.length === 0}
            className="h-7 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-3.5 h-3.5 mr-1 animate-spin" />
                {t('running')}
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 mr-1" />
                {t('confirm', { count: selectedKeys.length })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
